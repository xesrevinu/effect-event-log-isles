/**
 * Memory journal adapter for the UI.
 *
 * EventJournal.changes only publishes local `write`. Remote ingest and destroy
 * do not. This wrapper ticks a mutation bus on write, writeFromRemote, and
 * destroy so Atom can subscribe without Reactivity keys. EventLog.runRemote
 * still uses the inner `changes` pubsub to push uncommitted entries.
 */
import { Context, Effect, Layer, PubSub, Stream } from "effect";
import * as EventJournal from "effect/unstable/eventlog/EventJournal";
import type { ReplicaId } from "@/lib/critter-sim";
import { toViewEntries, type ViewEntry } from "@/lib/isles/decode";

export class JournalMutations extends Context.Service<JournalMutations, PubSub.PubSub<true>>()(
  "isles/internal/JournalMutations",
) {}

const layerMutations = Layer.effect(JournalMutations, PubSub.unbounded<true>());

const layerJournal = Layer.effect(
  EventJournal.EventJournal,
  Effect.gen(function* () {
    const inner = yield* EventJournal.makeMemory;
    const mutations = yield* JournalMutations;
    const tick = PubSub.publish(mutations, true);
    return EventJournal.EventJournal.of({
      entries: inner.entries,
      write: (options) => inner.write(options).pipe(Effect.tap(() => tick)),
      writeFromRemote: (options) => inner.writeFromRemote(options).pipe(Effect.tap(() => tick)),
      withRemoteUncommited: inner.withRemoteUncommited.bind(inner),
      nextRemoteSequence: inner.nextRemoteSequence.bind(inner),
      changes: inner.changes,
      destroy: inner.destroy.pipe(Effect.tap(() => tick)),
      withLock: inner.withLock.bind(inner),
    });
  }),
);

export const layerNotifyingJournal = layerJournal.pipe(Layer.provideMerge(layerMutations));

export const watchJournal = (isle: ReplicaId) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const journal = yield* EventJournal.EventJournal;
      const mutations = yield* JournalMutations;
      const sub = yield* PubSub.subscribe(mutations);
      const snapshot = (): Effect.Effect<ViewEntry[]> =>
        journal.entries.pipe(
          Effect.flatMap((rows) => toViewEntries(rows, isle)),
          Effect.orDie,
        );
      const first = yield* snapshot();
      return Stream.concat(
        Stream.make(first),
        Stream.fromSubscription(sub).pipe(Stream.mapEffect(() => snapshot())),
      );
    }),
  );
