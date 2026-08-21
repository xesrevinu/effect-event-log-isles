import { Effect, Schema } from "effect";
import type * as EventJournal from "effect/unstable/eventlog/EventJournal";
import {
  applyEvent,
  replay,
  type Critter,
  type Entry,
  type EventTag,
  type ReplicaId,
} from "@/lib/critter-sim";
import { CritterEvents } from "@/lib/isles/events";

export type ViewEntry = Entry;

export const decodePayload = (entry: EventJournal.Entry): Effect.Effect<Record<string, unknown>> =>
  Effect.gen(function* () {
    const def = CritterEvents.events[entry.event];
    if (!def) return { id: entry.primaryKey };
    const payload = yield* Schema.decodeUnknownEffect(def.payloadMsgPack)(entry.payload).pipe(
      Effect.orDie,
    );
    return payload as Record<string, unknown>;
  });

export const toViewEntry = (
  entry: EventJournal.Entry,
  isle: ReplicaId,
  seq: number,
): Effect.Effect<ViewEntry> =>
  Effect.gen(function* () {
    const payload = yield* decodePayload(entry);
    return {
      id: entry.idString,
      event: entry.event as EventTag,
      primaryKey: entry.primaryKey,
      payload,
      createdAt: entry.createdAtMillis,
      replicaId: isle,
      seq,
    };
  });

export const toViewEntries = (
  entries: ReadonlyArray<EventJournal.Entry>,
  isle: ReplicaId,
): Effect.Effect<ViewEntry[]> =>
  Effect.forEach(entries, (entry, i) => toViewEntry(entry, isle, i + 1));

export const replayJournal = (
  entries: ReadonlyArray<EventJournal.Entry>,
): Effect.Effect<Record<string, Critter>> =>
  Effect.gen(function* () {
    let projection: Record<string, Critter> = {};
    for (const entry of entries) {
      const payload = yield* decodePayload(entry);
      projection = applyEvent(projection, entry.event as EventTag, payload, entry.createdAtMillis);
    }
    return projection;
  });

export const replayView = (entries: readonly ViewEntry[]): Record<string, Critter> =>
  replay(entries);
