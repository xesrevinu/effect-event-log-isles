import { Context, Effect, Layer } from "effect";
import * as EventJournal from "effect/unstable/eventlog/EventJournal";
import * as EventLog from "effect/unstable/eventlog/EventLog";
import { MAX_BELLY, MAX_HERD, type Critter } from "@/lib/critter-sim";
import { replayJournal } from "@/lib/isles/decode";
import { EmptyName, Hungry, IsleFull, MissingPet, Sleepy, Stuffed } from "@/lib/isles/errors";
import { CritterEvents } from "@/lib/isles/events";

export class IsleProjection extends Context.Service<
  IsleProjection,
  {
    readonly get: Effect.Effect<Record<string, Critter>>;
  }
>()("isles/IsleProjection") {}

export const layerProjection = Layer.effect(
  IsleProjection,
  EventJournal.EventJournal.use((journal) =>
    Effect.succeed({
      get: journal.entries.pipe(Effect.flatMap(replayJournal), Effect.orDie),
    }),
  ),
);

export const layerHandlers = EventLog.group(CritterEvents, (handlers) =>
  handlers
    .handle("Hatched", ({ payload }) =>
      Effect.gen(function* () {
        const projection = yield* IsleProjection.use((p) => p.get);
        if (Object.keys(projection).length >= MAX_HERD) {
          return yield* new IsleFull();
        }
        void payload;
      }),
    )
    .handle("Named", ({ payload }) =>
      Effect.gen(function* () {
        const projection = yield* IsleProjection.use((p) => p.get);
        if (!projection[payload.id]) return yield* new MissingPet();
        if (!payload.name.trim()) return yield* new EmptyName();
      }),
    )
    .handle("Fed", ({ payload }) =>
      Effect.gen(function* () {
        const projection = yield* IsleProjection.use((p) => p.get);
        const pet = projection[payload.id];
        if (!pet) return yield* new MissingPet();
        if (pet.belly >= MAX_BELLY) return yield* new Stuffed();
      }),
    )
    .handle("Played", ({ payload }) =>
      Effect.gen(function* () {
        const projection = yield* IsleProjection.use((p) => p.get);
        const pet = projection[payload.id];
        if (!pet) return yield* new MissingPet();
        if (pet.belly <= 0) return yield* new Hungry();
        if (pet.energy <= 0) return yield* new Sleepy();
      }),
    )
    .handle("Slept", ({ payload }) =>
      Effect.gen(function* () {
        const projection = yield* IsleProjection.use((p) => p.get);
        if (!projection[payload.id]) return yield* new MissingPet();
      }),
    )
    .handle("Released", ({ payload }) =>
      Effect.gen(function* () {
        const projection = yield* IsleProjection.use((p) => p.get);
        if (!projection[payload.id]) return yield* new MissingPet();
      }),
    )
    .handle("Snapshot", () => Effect.void),
).pipe(Layer.provide(layerProjection));
