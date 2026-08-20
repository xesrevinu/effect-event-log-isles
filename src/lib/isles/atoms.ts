import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";
import { Isles, layerIsles } from "@/lib/isles/runtime";
import type { EventTag, ReplicaId } from "@/lib/critter-sim";

const journalMode = () =>
  typeof indexedDB === "undefined" ? ("memory" as const) : ("idb" as const);

export const islesRuntime = Atom.runtime(layerIsles(journalMode()));

export const sunEntriesAtom = islesRuntime
  .atom(
    Effect.gen(function* () {
      const isles = yield* Isles;
      return yield* isles.entries("sun");
    }),
    { initialValue: [] },
  )
  .pipe(Atom.withReactivity(["isle"]));

export const moonEntriesAtom = islesRuntime
  .atom(
    Effect.gen(function* () {
      const isles = yield* Isles;
      return yield* isles.entries("moon");
    }),
    { initialValue: [] },
  )
  .pipe(Atom.withReactivity(["isle"]));

export type WriteArg = {
  isle: ReplicaId;
  event: EventTag;
  payload: Record<string, unknown>;
};

export const writeAtom = islesRuntime.fn((arg: WriteArg) =>
  Effect.gen(function* () {
    const isles = yield* Isles;
    return yield* isles.write(arg.isle, arg.event, arg.payload);
  }),
);

export type FerryArg = {
  from: ReplicaId;
  to: ReplicaId;
  compact: boolean;
};

export const ferryAtom = islesRuntime.fn((arg: FerryArg) =>
  Effect.gen(function* () {
    const isles = yield* Isles;
    return yield* isles.ferry(arg.from, arg.to, arg.compact);
  }),
);

export const destroyAtom = islesRuntime.fn((isle: ReplicaId) =>
  Effect.gen(function* () {
    const isles = yield* Isles;
    return yield* isles.destroy(isle);
  }),
);
