export type Phase =
  | "idle"
  | "client"
  | "dispatch"
  | "handler"
  | "commit"
  | "reject"
  | "replay"
  | "compact"
  | "sync";

export type EventTag =
  | "Hatched"
  | "Named"
  | "Fed"
  | "Played"
  | "Slept"
  | "Released"
  | "Snapshot";

export type Species = "pip" | "nub" | "bean";
export type Stage = "egg" | "kid" | "big";
export type ReplicaId = "sun" | "moon";

export type Critter = {
  id: string;
  name: string;
  species: Species;
  belly: number;
  mood: number;
  energy: number;
  xp: number;
  stage: Stage;
  updatedAt: number;
};

export type Entry = {
  id: string;
  event: EventTag;
  primaryKey: string;
  payload: Record<string, unknown>;
  createdAt: number;
  replicaId: string;
  seq: number;
};

export type Replica = {
  id: ReplicaId;
  label: string;
  journal: Entry[];
  projection: Record<string, Critter>;
  remoteCursor: Record<string, number>;
  seq: number;
};

export type WriteResult =
  | { ok: true; entry: Entry }
  | { ok: false; error: string };

const LABELS: Record<ReplicaId, string> = { sun: "Sun", moon: "Moon" };
export const MAX_BELLY = 3;
export const MAX_MOOD = 3;
export const MAX_ENERGY = 3;
export const MAX_HERD = 2;

export const SPECIES: Species[] = ["pip", "nub", "bean"];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newCritterId() {
  return `c_${Math.random().toString(36).slice(2, 7)}`;
}

export function stageFor(xp: number): Stage {
  if (xp >= 7) return "big";
  if (xp >= 3) return "kid";
  return "egg";
}

export function defaultName(species: Species) {
  if (species === "pip") return "Pip";
  if (species === "nub") return "Nub";
  return "Bean";
}

function clamp(n: number, max: number) {
  return Math.max(0, Math.min(max, n));
}

function finish(c: Critter): Critter {
  return { ...c, stage: stageFor(c.xp), belly: clamp(c.belly, MAX_BELLY), mood: clamp(c.mood, MAX_MOOD), energy: clamp(c.energy, MAX_ENERGY) };
}

export function applyEvent(
  projection: Record<string, Critter>,
  event: EventTag,
  payload: Record<string, unknown>,
  at: number,
): Record<string, Critter> {
  const next = { ...projection };
  const id = String(payload.id ?? "");
  if (!id && event !== "Hatched") return next;

  switch (event) {
    case "Hatched": {
      const species = (payload.species as Species) || "pip";
      next[id] = finish({
        id,
        name: String(payload.name ?? defaultName(species)),
        species,
        belly: 2,
        mood: 2,
        energy: 2,
        xp: 0,
        stage: "egg",
        updatedAt: at,
      });
      break;
    }
    case "Named":
      if (next[id]) next[id] = { ...next[id], name: String(payload.name ?? next[id].name), updatedAt: at };
      break;
    case "Fed":
      if (next[id]) {
        next[id] = finish({
          ...next[id],
          belly: next[id].belly + 1,
          xp: next[id].xp + 1,
          updatedAt: at,
        });
      }
      break;
    case "Played":
      if (next[id]) {
        next[id] = finish({
          ...next[id],
          mood: next[id].mood + 1,
          energy: next[id].energy - 1,
          xp: next[id].xp + 1,
          updatedAt: at,
        });
      }
      break;
    case "Slept":
      if (next[id]) {
        next[id] = finish({
          ...next[id],
          energy: MAX_ENERGY,
          belly: next[id].belly - 1,
          mood: next[id].mood + 1,
          updatedAt: at,
        });
      }
      break;
    case "Released":
      delete next[id];
      break;
    case "Snapshot":
      next[id] = finish({
        id,
        name: String(payload.name ?? "Pip"),
        species: (payload.species as Species) || "pip",
        belly: Number(payload.belly ?? 0),
        mood: Number(payload.mood ?? 0),
        energy: Number(payload.energy ?? 0),
        xp: Number(payload.xp ?? 0),
        stage: "egg",
        updatedAt: at,
      });
      break;
  }
  return next;
}

export function replay(entries: readonly Entry[]): Record<string, Critter> {
  return entries.reduce<Record<string, Critter>>(
    (acc, e) => applyEvent(acc, e.event, e.payload, e.createdAt),
    {},
  );
}

export function makeReplica(id: ReplicaId): Replica {
  return {
    id,
    label: LABELS[id],
    journal: [],
    projection: {},
    remoteCursor: {},
    seq: 0,
  };
}

export function handlerError(
  replica: Replica,
  event: EventTag,
  payload: Record<string, unknown>,
): string | null {
  const id = String(payload.id ?? "");
  const pet = replica.projection[id];
  const herd = Object.keys(replica.projection).length;

  switch (event) {
    case "Hatched":
      if (herd >= MAX_HERD) return "full";
      return null;
    case "Named":
      if (!pet) return "missing";
      if (!String(payload.name ?? "").trim()) return "noname";
      return null;
    case "Fed":
      if (!pet) return "missing";
      if (pet.belly >= MAX_BELLY) return "stuffed";
      return null;
    case "Played":
      if (!pet) return "missing";
      if (pet.belly <= 0) return "hungry";
      if (pet.energy <= 0) return "sleepy";
      return null;
    case "Slept":
      if (!pet) return "missing";
      return null;
    case "Released":
      if (!pet) return "missing";
      return null;
    default:
      return null;
  }
}

export function writeLocal(
  replica: Replica,
  event: EventTag,
  payload: Record<string, unknown>,
  jam = false,
): { replica: Replica; result: WriteResult } {
  const at = Date.now();
  const fail = jam ? "jam" : handlerError(replica, event, payload);
  if (fail) return { replica, result: { ok: false, error: fail } };

  const id = String(payload.id ?? newCritterId());
  const nextPayload = { ...payload, id };
  const seq = replica.seq + 1;
  const entry: Entry = {
    id: uid("e"),
    event,
    primaryKey: id,
    payload: nextPayload,
    createdAt: at,
    replicaId: replica.id,
    seq,
  };
  return {
    replica: {
      ...replica,
      seq,
      journal: [...replica.journal, entry],
      projection: applyEvent(replica.projection, event, nextPayload, at),
    },
    result: { ok: true, entry },
  };
}

export function syncFrom(source: Replica, target: Replica) {
  const cursor = target.remoteCursor[source.id] ?? 0;
  const incoming = source.journal.filter((e) => e.seq > cursor);
  const imported: Entry[] = [];
  let conflicts = 0;
  let journal = [...target.journal];
  let projection = target.projection;
  let maxSeq = cursor;

  for (const remote of incoming) {
    if (journal.some((e) => e.id === remote.id)) continue;
    const localHits = journal.filter((e) => e.primaryKey === remote.primaryKey && e.id !== remote.id);
    if (localHits.length) conflicts += localHits.length;
    projection = applyEvent(projection, remote.event, remote.payload, remote.createdAt);
    journal = [...journal, remote];
    imported.push(remote);
    maxSeq = Math.max(maxSeq, remote.seq);
  }

  return {
    target: {
      ...target,
      journal,
      projection,
      remoteCursor: { ...target.remoteCursor, [source.id]: maxSeq },
    },
    imported,
    conflicts,
  };
}

export function compactReplica(replica: Replica) {
  const keys = [...new Set(replica.journal.map((e) => e.primaryKey))];
  let journal = [...replica.journal];
  let seq = replica.seq;
  let projection = replica.projection;
  let folded = 0;

  for (const key of keys) {
    const related = journal.filter((e) => e.primaryKey === key);
    if (related.length <= 1) continue;
    const pet = projection[key];
    journal = journal.filter((e) => e.primaryKey !== key);
    folded += related.length;
    if (!pet) continue;
    seq += 1;
    const snap: Entry = {
      id: uid("e"),
      event: "Snapshot",
      primaryKey: key,
      payload: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        belly: pet.belly,
        mood: pet.mood,
        energy: pet.energy,
        xp: pet.xp,
      },
      createdAt: Date.now(),
      replicaId: replica.id,
      seq,
    };
    journal.push(snap);
    projection = applyEvent(projection, "Snapshot", snap.payload, snap.createdAt);
  }

  return {
    replica: { ...replica, journal, projection, seq },
    folded,
    shorter: journal.length < replica.journal.length,
  };
}

export function wipeProjection(replica: Replica): Replica {
  return { ...replica, projection: {} };
}

export function rebuildProjection(replica: Replica): Replica {
  return { ...replica, projection: replay(replica.journal) };
}

export function otherIsle(id: ReplicaId): ReplicaId {
  return id === "sun" ? "moon" : "sun";
}

export function herd(replica: Replica) {
  return Object.values(replica.projection).sort((a, b) => b.updatedAt - a.updatedAt);
}
