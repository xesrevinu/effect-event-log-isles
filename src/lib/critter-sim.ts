export type EventTag = "Hatched" | "Named" | "Fed" | "Played" | "Slept" | "Released" | "Snapshot";

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
  | { ok: false; error: string; detail?: string };

export const MAX_BELLY = 3;
export const MAX_MOOD = 3;
export const MAX_ENERGY = 3;
export const MAX_HERD = 2;

export const SPECIES: Species[] = ["pip", "nub", "bean"];

export function newCritterId() {
  return `c_${Math.random().toString(36).slice(2, 7)}`;
}

function stageFor(xp: number): Stage {
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
  return {
    ...c,
    stage: stageFor(c.xp),
    belly: clamp(c.belly, MAX_BELLY),
    mood: clamp(c.mood, MAX_MOOD),
    energy: clamp(c.energy, MAX_ENERGY),
  };
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
      if (next[id])
        next[id] = { ...next[id], name: String(payload.name ?? next[id].name), updatedAt: at };
      break;
    case "Fed":
      if (next[id]) {
        next[id] = finish({
          ...next[id],
          belly: next[id].belly + 1,
          mood: next[id].mood - 1,
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

export function herd(replica: Replica) {
  const rank = new Map<string, number>();
  for (const entry of replica.journal) {
    if (entry.event === "Hatched" && !rank.has(entry.primaryKey)) {
      rank.set(entry.primaryKey, rank.size);
    }
  }
  return Object.values(replica.projection).sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
