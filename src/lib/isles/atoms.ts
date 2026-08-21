import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { herd, type EventTag, type ReplicaId } from "@/lib/critter-sim";
import type { ViewEntry } from "@/lib/isles/decode";
import { Isles, layerIsles, readOnline } from "@/lib/isles/runtime";
import { IsleTrace } from "@/lib/isles/trace";
import { viewReplica } from "@/lib/isles/view";
import {
  advanceMission,
  initialPlayhead,
  initialProgress,
  noteFerry,
  noteReplay,
  noteServer,
  noteStorm,
  noteWrite,
  setActive,
  setIslePlayhead,
} from "@/lib/session";
import { lessonOf } from "@/lib/tutorial";

const rowsOf = (value: unknown): ViewEntry[] => {
  if (Array.isArray(value)) return value as ViewEntry[];
  return AsyncResult.getOrElse(
    value as AsyncResult.AsyncResult<ViewEntry[], unknown>,
    (): ViewEntry[] => [],
  );
};

/** Flush atom registry work before the next React paint. */
export function scheduleAtomTask(f: () => void) {
  let cancelled = false;
  queueMicrotask(() => {
    if (!cancelled) f();
  });
  return () => {
    cancelled = true;
  };
}

function makeIslesAtoms() {
  const islesRuntime = Atom.runtime(layerIsles("memory"));
  const progressAtom = Atom.make(initialProgress());
  const playheadAtom = Atom.make(initialPlayhead());
  const busyAtom = Atom.make(false);

  const journalAtom = (isle: ReplicaId) =>
    islesRuntime.subscriptionRef(
      Effect.gen(function* () {
        const isles = yield* Isles;
        return isles.journal(isle);
      }),
    );

  const sunEntriesAtom = journalAtom("sun");
  const moonEntriesAtom = journalAtom("moon");

  const sunReplicaAtom = Atom.readable((get) => {
    const playhead = get(playheadAtom);
    return viewReplica("sun", rowsOf(get(sunEntriesAtom)), playhead.sun);
  });

  const moonReplicaAtom = Atom.readable((get) => {
    const playhead = get(playheadAtom);
    return viewReplica("moon", rowsOf(get(moonEntriesAtom)), playhead.moon);
  });

  const onlineAtom = islesRuntime.subscriptionRef(
    Effect.gen(function* () {
      const isles = yield* Isles;
      return isles.online;
    }),
  );

  const tracesAtom = islesRuntime.subscriptionRef(
    Effect.gen(function* () {
      const trace = yield* IsleTrace;
      return trace.spans;
    }),
  );

  const lessonAtom = Atom.readable((get) =>
    lessonOf({
      mission: get(progressAtom).mission,
      sun: get(sunReplicaAtom),
      moon: get(moonReplicaAtom),
      flags: get(progressAtom).flags,
      network: readOnline(get(onlineAtom)),
      busy: get(busyAtom),
    }),
  );

  const writeAtom = islesRuntime.fn((arg: WriteArg, get) =>
    Effect.gen(function* () {
      const isles = yield* Isles;
      const result = yield* isles.write(arg.isle, arg.event, arg.payload);
      const down = !readOnline(get(onlineAtom)).server;
      let progress = noteWrite(get(progressAtom), arg.event, result.ok, result.ok && down);
      if (result.ok) {
        progress = setActive(progress, arg.isle);
        get.set(playheadAtom, setIslePlayhead(get(playheadAtom), arg.isle, null));
      }
      get.set(progressAtom, progress);
      return result;
    }),
  );

  const ferryAtom = islesRuntime.fn((arg: FerryArg, get) =>
    Effect.gen(function* () {
      const isles = yield* Isles;
      const result = yield* isles.ferry(arg.from, arg.to, arg.compact);
      get.set(progressAtom, noteFerry(get(progressAtom), result, arg.to));
      get.set(playheadAtom, setIslePlayhead(get(playheadAtom), arg.to, null));
      return result;
    }),
  );

  const destroyAtom = islesRuntime.fn((isle: ReplicaId) =>
    Effect.gen(function* () {
      const isles = yield* Isles;
      return yield* isles.destroy(isle);
    }),
  );

  const setOnlineAtom = islesRuntime.fn((arg: SetOnlineArg) =>
    Effect.gen(function* () {
      const isles = yield* Isles;
      return yield* isles.setOnline(arg.isle, arg.online);
    }),
  );

  const setServerAtom = islesRuntime.fn((up: boolean, get) =>
    Effect.gen(function* () {
      const isles = yield* Isles;
      yield* isles.setServer(up);
      get.set(progressAtom, noteServer(get(progressAtom), up));
    }),
  );

  const stormAtom = islesRuntime.fn((isle: ReplicaId, get) =>
    Effect.sync(() => {
      get.set(playheadAtom, setIslePlayhead(get(playheadAtom), isle, 0));
      get.set(progressAtom, noteStorm(get(progressAtom)));
    }).pipe(Effect.withSpan("isles.storm", { attributes: { isle } })),
  );

  const replayAtom = islesRuntime.fn((isle: ReplicaId, get) =>
    Effect.sync(() => {
      const replica = isle === "sun" ? get(sunReplicaAtom) : get(moonReplicaAtom);
      const rebuilt = herd(viewReplica(isle, replica.journal, null)).length > 0;
      get.set(playheadAtom, setIslePlayhead(get(playheadAtom), isle, null));
      get.set(progressAtom, noteReplay(get(progressAtom), rebuilt));
    }).pipe(Effect.withSpan("isles.replay", { attributes: { isle } })),
  );

  const advanceAtom = islesRuntime.fn((_void: void, get) =>
    Effect.sync(() => {
      get.set(progressAtom, advanceMission(get(progressAtom)));
    }),
  );

  const pickIsleAtom = islesRuntime.fn((isle: ReplicaId, get) =>
    Effect.sync(() => {
      get.set(progressAtom, setActive(get(progressAtom), isle));
    }),
  );

  const resetAtom = islesRuntime.fn((_void: void, get) =>
    Effect.gen(function* () {
      const isles = yield* Isles;
      yield* isles.setServer(true);
      yield* isles.setOnline("sun", false);
      yield* isles.setOnline("moon", false);
      yield* isles.destroy("sun");
      yield* isles.destroy("moon");
      const trace = yield* IsleTrace;
      yield* trace.clear;
      get.set(progressAtom, initialProgress());
      get.set(playheadAtom, initialPlayhead());
      get.set(busyAtom, false);
    }),
  );

  return {
    islesRuntime,
    sunEntriesAtom,
    moonEntriesAtom,
    playheadAtom,
    sunReplicaAtom,
    moonReplicaAtom,
    onlineAtom,
    progressAtom,
    busyAtom,
    lessonAtom,
    tracesAtom,
    writeAtom,
    ferryAtom,
    destroyAtom,
    setOnlineAtom,
    setServerAtom,
    stormAtom,
    replayAtom,
    advanceAtom,
    pickIsleAtom,
    resetAtom,
  };
}

export type WriteArg = {
  isle: ReplicaId;
  event: EventTag;
  payload: Record<string, unknown>;
};

export type FerryArg = {
  from: ReplicaId;
  to: ReplicaId;
  compact: boolean;
};

export type SetOnlineArg = {
  isle: ReplicaId;
  online: boolean;
};

const app = makeIslesAtoms();

export const islesRuntime = app.islesRuntime;
export const sunEntriesAtom = app.sunEntriesAtom;
export const moonEntriesAtom = app.moonEntriesAtom;
export const playheadAtom = app.playheadAtom;
export const destroyAtom = app.destroyAtom;
export const sunReplicaAtom = app.sunReplicaAtom;
export const moonReplicaAtom = app.moonReplicaAtom;
export const onlineAtom = app.onlineAtom;
export const progressAtom = app.progressAtom;
export const busyAtom = app.busyAtom;
export const lessonAtom = app.lessonAtom;
export const tracesAtom = app.tracesAtom;
export const writeAtom = app.writeAtom;
export const ferryAtom = app.ferryAtom;
export const setOnlineAtom = app.setOnlineAtom;
export const setServerAtom = app.setServerAtom;
export const stormAtom = app.stormAtom;
export const replayAtom = app.replayAtom;
export const advanceAtom = app.advanceAtom;
export const pickIsleAtom = app.pickIsleAtom;
export const resetAtom = app.resetAtom;
