import { Effect, Schema } from "effect";
import * as EventJournal from "effect/unstable/eventlog/EventJournal";
import * as EventLog from "effect/unstable/eventlog/EventLog";
import { applyEvent, type Critter, type EventTag } from "@/lib/critter-sim";
import { CritterEvents } from "@/lib/isles/events";

/**
 * Real EventLog compaction runs on remote ingest / server backlog, not by
 * rewriting already-committed local entries. This compactor folds a critter's
 * incoming batch into one Snapshot. Isles uses it on ferry (see runtime.ts).
 */
export const compactCritters = EventLog.groupCompaction(CritterEvents, ({ events, write }) =>
  Effect.gen(function* () {
    if (events.length <= 1) return;
    let projection: Record<string, Critter> = {};
    for (const tagged of events) {
      projection = applyEvent(
        projection,
        tagged._tag as EventTag,
        tagged.payload as Record<string, unknown>,
        0,
      );
    }
    const pet = Object.values(projection)[0];
    if (!pet) return;
    yield* write("Snapshot", {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      belly: pet.belly,
      mood: pet.mood,
      energy: pet.energy,
      xp: pet.xp,
    });
  }),
);

export const encodeSnapshotEntry = (pet: Critter, msecs: number) =>
  Schema.encodeUnknownEffect(CritterEvents.events.Snapshot.payloadMsgPack)({
    id: pet.id,
    name: pet.name,
    species: pet.species,
    belly: pet.belly,
    mood: pet.mood,
    energy: pet.energy,
    xp: pet.xp,
  }).pipe(
    Effect.orDie,
    Effect.map(
      (payload) =>
        new EventJournal.Entry(
          {
            id: EventJournal.makeEntryIdUnsafe({ msecs }),
            event: "Snapshot",
            primaryKey: pet.id,
            payload,
          },
          { disableChecks: true },
        ),
    ),
  );
