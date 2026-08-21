/**
 * Two EventLog clients (sun / moon) plus one in-process unencrypted server.
 *
 * Each isle is a real EventLog layer: writes go through `EventLog.makeClient`.
 * Journal snapshots reach the UI through `watch` (a Stream over journal
 * mutations). Online intent is a SubscriptionRef. Live remotes still use
 * EventLog.runRemote; ferry is a one-shot push/pull while a device is away.
 */
import {
  Context,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Queue,
  Ref,
  Stream,
  SubscriptionRef,
} from "effect";
import * as EventJournal from "effect/unstable/eventlog/EventJournal";
import * as EventLog from "effect/unstable/eventlog/EventLog";
import * as EventLogEncryption from "effect/unstable/eventlog/EventLogEncryption";
import * as EventLogRemote from "effect/unstable/eventlog/EventLogRemote";
import * as Reactivity from "effect/unstable/reactivity/Reactivity";
import type { EventTag, ReplicaId, WriteResult } from "@/lib/critter-sim";
import { compactCritters, foldRemoteEntries } from "@/lib/isles/compact";
import { toViewEntries, toViewEntry, type ViewEntry } from "@/lib/isles/decode";
import { formatWriteCause } from "@/lib/isles/errors";
import { critterLogSchema } from "@/lib/isles/events";
import { layerHandlers } from "@/lib/isles/handlers";
import { layerNotifyingJournal, watchJournal } from "@/lib/isles/internal/journal";
import { IsleServer, layerIsleServer } from "@/lib/isles/internal/server";
import { layerTracing } from "@/lib/isles/trace";

export type JournalMode = "idb" | "memory";
export type OnlineState = {
  readonly server: boolean;
  readonly sun: boolean;
  readonly moon: boolean;
};

const emptyOnline = (): OnlineState => ({ server: true, sun: false, moon: false });

export function readOnline(value: unknown): OnlineState {
  if (value && typeof value === "object" && "_tag" in value) {
    const tagged = value as { _tag: string; value?: unknown };
    if (tagged._tag === "Success") return readOnline(tagged.value);
    return emptyOnline();
  }
  if (
    value &&
    typeof value === "object" &&
    "server" in value &&
    "sun" in value &&
    "moon" in value &&
    typeof (value as OnlineState).server === "boolean"
  ) {
    return value as OnlineState;
  }
  return emptyOnline();
}

export type FerryResult = {
  imported: number;
  conflicts: number;
  compacted: boolean;
  destEntries: ViewEntry[];
};

const identityLayer = Layer.effect(EventLog.Identity, EventLog.makeIdentity).pipe(
  Layer.provide(EventLogEncryption.layerSubtle),
);

const makeIsleLayer = (_id: ReplicaId, _mode: JournalMode = "memory") => {
  const handlers = Layer.mergeAll(layerHandlers, compactCritters);
  return Layer.fresh(
    EventLog.layer(critterLogSchema, handlers).pipe(
      Layer.provideMerge(Reactivity.layer),
      Layer.provideMerge(Layer.fresh(layerNotifyingJournal)),
      Layer.provideMerge(identityLayer),
    ),
  );
};

const drainChanges = (
  queue: Queue.Dequeue<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>,
): Effect.Effect<ReadonlyArray<EventJournal.RemoteEntry>, EventLogRemote.EventLogRemoteError> =>
  Queue.takeAll(queue).pipe(
    Effect.timeoutOption(500),
    Effect.map((taken) => (taken._tag === "None" ? [] : taken.value)),
  );

const writeOnIsle = Effect.fn("isles.write")(function* (
  isle: ReplicaId,
  event: EventTag,
  payload: Record<string, unknown>,
) {
  yield* Effect.annotateCurrentSpan({ isle, event });
  const client = yield* EventLog.makeClient(critterLogSchema);
  const journal = yield* EventJournal.EventJournal;
  const exit = yield* Effect.exit(
    client(event as "Hatched", payload as { id: string; species: "pip"; name: string }),
  );
  if (Exit.isFailure(exit)) {
    const { code, detail } = formatWriteCause(exit.cause);
    yield* Effect.annotateCurrentSpan({ ok: false, error: code });
    return { ok: false, error: code, detail } satisfies WriteResult;
  }
  const rowsExit = yield* Effect.exit(journal.entries);
  if (Exit.isFailure(rowsExit)) {
    const { code, detail } = formatWriteCause(rowsExit.cause);
    yield* Effect.annotateCurrentSpan({ ok: false, error: code });
    return { ok: false, error: code, detail } satisfies WriteResult;
  }
  const rows = rowsExit.value;
  const last = rows.at(-1);
  if (!last) {
    yield* Effect.annotateCurrentSpan({ ok: false, error: "jam" });
    return {
      ok: false,
      error: "jam",
      detail: "EventLog.write succeeded but the journal is still empty",
    } satisfies WriteResult;
  }
  const entry = yield* toViewEntry(last, isle, rows.length);
  yield* Effect.annotateCurrentSpan({ ok: true });
  return { ok: true, entry } satisfies WriteResult;
});

const entriesOnIsle = (
  isle: ReplicaId,
): Effect.Effect<ViewEntry[], EventJournal.EventJournalError, EventLog.EventLog> =>
  EventLog.EventLog.use((log) =>
    log.entries.pipe(Effect.flatMap((rows) => toViewEntries(rows, isle))),
  );

const destroyOnIsle = EventLog.EventLog.use((log) => log.destroy);

const openRemote = (rpc: EventLogRemote.EventLogRemoteClient["Service"]) =>
  EventLogRemote.makeUnencrypted.pipe(
    Effect.provideService(EventLogRemote.EventLogRemoteClient, rpc),
  );

const keepRemote = (server: IsleServer["Service"]) =>
  Effect.gen(function* () {
    const rpc = yield* server.connectClient;
    yield* openRemote(rpc);
  });

const pushUncommitted = (remote: EventLogRemote.EventLogRemote["Service"]) =>
  Effect.gen(function* () {
    const journal = yield* EventJournal.EventJournal;
    const identity = yield* EventLog.Identity;
    const storeId = yield* EventLog.CurrentStoreId;
    yield* journal.withRemoteUncommited(remote.id, (entries) =>
      remote.write({ identity, storeId, entries }),
    );
  });

const pullRemote = (
  isle: ReplicaId,
  remote: EventLogRemote.EventLogRemote["Service"],
  compact: boolean,
) =>
  Effect.gen(function* () {
    const journal = yield* EventJournal.EventJournal;
    const identity = yield* EventLog.Identity;
    const storeId = yield* EventLog.CurrentStoreId;
    const registry = yield* EventLog.Registry;
    const reactivity = yield* Reactivity.Reactivity;
    const destBefore = yield* journal.entries;
    const startSequence = yield* journal.nextRemoteSequence(remote.id);
    const incoming = yield* remote
      .changes({ identity, storeId, startSequence })
      .pipe(Effect.flatMap(drainChanges));
    const prepared = compact
      ? yield* foldRemoteEntries(incoming, registry.compactors)
      : { remotes: incoming, compacted: false };
    let conflicts = 0;
    for (const remoteEntry of prepared.remotes) {
      conflicts += destBefore.filter(
        (entry) =>
          entry.event === remoteEntry.entry.event &&
          entry.primaryKey === remoteEntry.entry.primaryKey &&
          entry.idString !== remoteEntry.entry.idString,
      ).length;
    }
    const replay = EventLog.makeReplayFromRemote({
      handlers: registry.handlers,
      storeId,
      identity,
      reactivity,
      reactivityKeys: registry.reactivityKeys,
      logAnnotations: { service: "Isles", effect: "ferry" },
    });
    const result = yield* journal.writeFromRemote({
      remoteId: remote.id,
      entries: prepared.remotes,
      effect: replay,
    });
    const imported = prepared.remotes.length - result.duplicateEntries.length;
    const destEntries = yield* toViewEntries(yield* journal.entries, isle);
    return {
      imported: Math.max(0, imported),
      destEntries,
      conflicts,
      compacted: prepared.compacted,
    } satisfies FerryResult;
  });

export class Isles extends Context.Service<
  Isles,
  {
    readonly write: (
      isle: ReplicaId,
      event: EventTag,
      payload: Record<string, unknown>,
    ) => Effect.Effect<WriteResult>;
    readonly entries: (
      isle: ReplicaId,
    ) => Effect.Effect<ViewEntry[], EventJournal.EventJournalError>;
    readonly watch: (isle: ReplicaId) => Stream.Stream<ViewEntry[]>;
    readonly journal: (isle: ReplicaId) => SubscriptionRef.SubscriptionRef<ViewEntry[]>;
    readonly ferry: (
      from: ReplicaId,
      to: ReplicaId,
      compact: boolean,
    ) => Effect.Effect<FerryResult, EventJournal.EventJournalError>;
    readonly destroy: (isle: ReplicaId) => Effect.Effect<void, EventJournal.EventJournalError>;
    readonly online: SubscriptionRef.SubscriptionRef<OnlineState>;
    readonly setOnline: (isle: ReplicaId, online: boolean) => Effect.Effect<void>;
    readonly setServer: (up: boolean) => Effect.Effect<void>;
  }
>()("isles/Isles") {}

const makeIsles = (_mode: JournalMode) =>
  Effect.gen(function* () {
    const server = yield* IsleServer;
    const sunCtx = yield* Layer.build(makeIsleLayer("sun"));
    const moonCtx = yield* Layer.build(makeIsleLayer("moon"));
    const runIsle = <A, E, R>(id: ReplicaId, effect: Effect.Effect<A, E, R>) =>
      Effect.provideContext(effect, id === "sun" ? sunCtx : moonCtx);

    const online = yield* SubscriptionRef.make<OnlineState>(emptyOnline());
    const sunJournal = yield* SubscriptionRef.make<ViewEntry[]>([]);
    const moonJournal = yield* SubscriptionRef.make<ViewEntry[]>([]);
    const liveFibers = yield* Ref.make<Partial<Record<ReplicaId, Fiber.Fiber<unknown, unknown>>>>(
      {},
    );
    const watch = (isle: ReplicaId) =>
      watchJournal(isle).pipe(
        Stream.provideContext(isle === "sun" ? sunCtx : moonCtx),
      ) as Stream.Stream<ViewEntry[]>;
    yield* watch("sun").pipe(
      Stream.runForEach((rows) => SubscriptionRef.set(sunJournal, rows)),
      Effect.forkScoped,
    );
    yield* watch("moon").pipe(
      Stream.runForEach((rows) => SubscriptionRef.set(moonJournal, rows)),
      Effect.forkScoped,
    );

    const stopIsle = (id: ReplicaId) =>
      Effect.gen(function* () {
        const fiber = yield* Ref.modify(liveFibers, (current) => {
          const next = { ...current };
          const fiber = current[id];
          delete next[id];
          return [fiber, next];
        });
        if (fiber) yield* Fiber.interrupt(fiber);
      });

    const startIsle = (id: ReplicaId) =>
      Effect.gen(function* () {
        yield* stopIsle(id);
        if (!(yield* server.up)) return;
        const connected = yield* Deferred.make<void>();
        const fiber = yield* Effect.forkDetach(
          Effect.scoped(
            Effect.gen(function* () {
              yield* runIsle(id, keepRemote(server));
              // EventLog.runRemote forks consume + journal.changes; wait until
              // those subscriptions are up so live writes are not missed.
              yield* Effect.sleep(150);
              yield* Deferred.succeed(connected, undefined);
              yield* Effect.never;
            }),
          ),
        );
        yield* Ref.update(liveFibers, (current) => ({ ...current, [id]: fiber }));
        yield* Deferred.await(connected);
      });

    const setOnline = Effect.fn("isles.setOnline")(
      function* (id: ReplicaId, next: boolean) {
        yield* Effect.annotateCurrentSpan({ isle: id, online: next });
        const current = yield* SubscriptionRef.get(online);
        if (current[id] === next) return;
        yield* SubscriptionRef.update(online, (state) => ({ ...state, [id]: next }));
        if (next) yield* startIsle(id);
        else yield* stopIsle(id);
      },
      (effect) => effect.pipe(Effect.orDie),
    );

    const setServer = Effect.fn("isles.setServer")(
      function* (up: boolean) {
        yield* Effect.annotateCurrentSpan({ up });
        const current = yield* SubscriptionRef.get(online);
        if (current.server === up) return;
        if (!up) {
          yield* stopIsle("sun");
          yield* stopIsle("moon");
          yield* server.setUp(false);
        } else {
          yield* server.setUp(true);
          const intent = yield* SubscriptionRef.get(online);
          if (intent.sun) yield* startIsle("sun");
          if (intent.moon) yield* startIsle("moon");
        }
        yield* SubscriptionRef.update(online, (state) => ({ ...state, server: up }));
      },
      (effect) => effect.pipe(Effect.orDie),
    );

    const ferry = Effect.fn("isles.ferry")(
      function* (from: ReplicaId, to: ReplicaId, compact: boolean) {
        yield* Effect.annotateCurrentSpan({ from, to, compact });
        yield* Effect.scoped(
          Effect.gen(function* () {
            const rpc = yield* server.connectClient;
            const sourceRemote = yield* openRemote(rpc).pipe(
              Effect.provide(EventLog.layerRegistry),
            );
            yield* runIsle(from, pushUncommitted(sourceRemote));
          }),
        );
        return yield* Effect.scoped(
          Effect.gen(function* () {
            const rpc = yield* server.connectClient;
            const destRemote = yield* openRemote(rpc).pipe(Effect.provide(EventLog.layerRegistry));
            return yield* runIsle(to, pullRemote(to, destRemote, compact));
          }),
        );
      },
      (effect) => effect.pipe(Effect.orDie),
    );

    const destroy = Effect.fn("isles.destroy")(function* (isle: ReplicaId) {
      yield* Effect.annotateCurrentSpan({ isle });
      return yield* runIsle(isle, destroyOnIsle);
    });

    return Isles.of({
      write: (isle, event, payload) => runIsle(isle, writeOnIsle(isle, event, payload)),
      entries: (isle) => runIsle(isle, entriesOnIsle(isle)),
      watch,
      journal: (isle) => (isle === "sun" ? sunJournal : moonJournal),
      ferry,
      destroy,
      online,
      setOnline,
      setServer,
    });
  });

export const layerIsles = (mode: JournalMode = "memory") =>
  Layer.effect(Isles, makeIsles(mode)).pipe(
    Layer.provide(layerIsleServer),
    Layer.provideMerge(layerTracing),
  );
