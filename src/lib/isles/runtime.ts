import { Cause, Context, Effect, Exit, Layer } from "effect";
import * as EventJournal from "effect/unstable/eventlog/EventJournal";
import * as EventLog from "effect/unstable/eventlog/EventLog";
import * as EventLogEncryption from "effect/unstable/eventlog/EventLogEncryption";
import { StoreId } from "effect/unstable/eventlog/EventLogMessage";
import * as Reactivity from "effect/unstable/reactivity/Reactivity";
import {
  replay,
  type EventTag,
  type ReplicaId,
  type WriteResult,
} from "@/lib/critter-sim";
import { compactCritters, encodeSnapshotEntry } from "@/lib/isles/compact";
import { toViewEntries, toViewEntry, type ViewEntry } from "@/lib/isles/decode";
import { handlerErrorCode } from "@/lib/isles/errors";
import { CritterEvents, critterLogSchema } from "@/lib/isles/events";
import { layerHandlers } from "@/lib/isles/handlers";

export type JournalMode = "idb" | "memory";

export type FerryResult = {
  imported: number;
  conflicts: number;
  compacted: boolean;
  destEntries: ViewEntry[];
};

type IsleHandle = {
  log: EventLog.EventLog["Service"];
  journal: EventJournal.EventJournal["Service"];
  registry: EventLog.Registry["Service"];
  identity: EventLog.Identity["Service"];
  reactivity: Reactivity.Reactivity["Service"];
};

const identityStorageKey = (id: ReplicaId) => `isles-identity-${id}`;
const remoteStorageKey = (id: ReplicaId) => `isles-remote-${id}`;

const identityLayer = (id: ReplicaId) =>
  Layer.effect(
    EventLog.Identity,
    Effect.gen(function* () {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem(identityStorageKey(id));
        if (saved) {
          const decoded = yield* Effect.try({
            try: () => EventLog.decodeIdentityString(saved),
            catch: () => new Error("bad identity"),
          }).pipe(Effect.option);
          if (decoded._tag === "Some") return decoded.value;
        }
      }
      const identity = yield* EventLog.makeIdentity;
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(identityStorageKey(id), EventLog.encodeIdentityString(identity));
        } catch {
          // private mode
        }
      }
      return identity;
    }),
  ).pipe(Layer.provide(EventLogEncryption.layerSubtle));

const journalLayer = (id: ReplicaId, mode: JournalMode) => {
  if (mode === "idb" && typeof indexedDB !== "undefined") {
    return EventJournal.layerIndexedDb({ database: `isles-${id}` });
  }
  return Layer.fresh(EventJournal.layerMemory);
};

export const makeIsleLayer = (id: ReplicaId, mode: JournalMode) => {
  const handlers = Layer.mergeAll(
    layerHandlers,
    EventLog.groupReactivity(CritterEvents, ["isle"]),
    compactCritters,
  );
  return Layer.fresh(
    EventLog.layer(critterLogSchema, handlers).pipe(
      Layer.provideMerge(Reactivity.layer),
      Layer.provideMerge(journalLayer(id, mode)),
      Layer.provideMerge(identityLayer(id)),
    ),
  );
};

const bytesFromB64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const b64FromBytes = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const persistentRemoteId = (id: ReplicaId): EventJournal.RemoteId => {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(remoteStorageKey(id));
    if (saved) {
      try {
        return bytesFromB64(saved) as EventJournal.RemoteId;
      } catch {
        // fall through
      }
    }
  }
  const remoteId = EventJournal.makeRemoteIdUnsafe();
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(remoteStorageKey(id), b64FromBytes(remoteId));
    } catch {
      // private mode
    }
  }
  return remoteId;
};

const compactRemotes = (
  remotes: ReadonlyArray<EventJournal.RemoteEntry>,
  source: ReadonlyArray<ViewEntry>,
): Effect.Effect<{
  remotes: ReadonlyArray<EventJournal.RemoteEntry>;
  compacted: boolean;
}> =>
  Effect.gen(function* () {
    const groups = new Map<string, EventJournal.RemoteEntry[]>();
    for (const remote of remotes) {
      const list = groups.get(remote.entry.primaryKey) ?? [];
      list.push(remote);
      groups.set(remote.entry.primaryKey, list);
    }
    const next: EventJournal.RemoteEntry[] = [];
    let folded = 0;
    for (const [key, group] of groups) {
      if (group.length <= 1) {
        next.push(...group);
        continue;
      }
      const pet = replay(source.filter((entry) => entry.primaryKey === key))[key];
      if (!pet) {
        next.push(...group);
        continue;
      }
      const last = group[group.length - 1]!;
      const snap = yield* encodeSnapshotEntry(pet, last.entry.createdAtMillis);
      next.push(
        new EventJournal.RemoteEntry(
          {
            remoteSequence: last.remoteSequence,
            entry: snap,
          },
          { disableChecks: true },
        ),
      );
      folded += 1;
    }
    return { remotes: next, compacted: folded > 0 };
  });

export class Isles extends Context.Service<
  Isles,
  {
    readonly write: (
      isle: ReplicaId,
      event: EventTag,
      payload: Record<string, unknown>,
    ) => Effect.Effect<WriteResult>;
    readonly entries: (isle: ReplicaId) => Effect.Effect<ViewEntry[], EventJournal.EventJournalError>;
    readonly ferry: (
      from: ReplicaId,
      to: ReplicaId,
      compact: boolean,
    ) => Effect.Effect<FerryResult, EventJournal.EventJournalError>;
    readonly destroy: (isle: ReplicaId) => Effect.Effect<void, EventJournal.EventJournalError>;
  }
>()("isles/Isles") {}

const makeIsles = (mode: JournalMode) =>
  Effect.gen(function* () {
    const sunCtx = yield* Layer.build(makeIsleLayer("sun", mode));
    const moonCtx = yield* Layer.build(makeIsleLayer("moon", mode));
    const handle = (
      ctx: Context.Context<
        | EventLog.EventLog
        | EventJournal.EventJournal
        | EventLog.Registry
        | EventLog.Identity
        | Reactivity.Reactivity
      >,
    ): IsleHandle => ({
      log: Context.get(ctx, EventLog.EventLog),
      journal: Context.get(ctx, EventJournal.EventJournal),
      registry: Context.get(ctx, EventLog.Registry),
      identity: Context.get(ctx, EventLog.Identity),
      reactivity: Context.get(ctx, Reactivity.Reactivity),
    });
    const sun = handle(sunCtx);
    const moon = handle(moonCtx);
    const of = (id: ReplicaId) => (id === "sun" ? sun : moon);
    const remoteIds: Record<ReplicaId, EventJournal.RemoteId> = {
      sun: persistentRemoteId("sun"),
      moon: persistentRemoteId("moon"),
    };
    const storeId = StoreId.make("default");

    return Isles.of({
      write: (isle, event, payload) =>
        Effect.gen(function* () {
          const handle = of(isle);
          const exit = yield* Effect.exit(
            handle.log.write({
              schema: critterLogSchema,
              event: event as "Hatched",
              payload: payload as { id: string; species: "pip"; name: string },
            }),
          );
          if (Exit.isFailure(exit)) {
            return {
              ok: false,
              error: handlerErrorCode(Cause.squash(exit.cause)),
            } satisfies WriteResult;
          }
          const rows = yield* handle.journal.entries.pipe(Effect.orDie);
          const last = rows[rows.length - 1];
          if (!last) {
            return {
              ok: true,
              entry: {
                id: "",
                event,
                primaryKey: String(payload.id ?? ""),
                payload,
                createdAt: Date.now(),
                replicaId: isle,
                seq: 0,
              },
            } satisfies WriteResult;
          }
          const entry = yield* toViewEntry(last, isle, rows.length);
          return { ok: true, entry } satisfies WriteResult;
        }),
      entries: (isle) =>
        of(isle).journal.entries.pipe(Effect.flatMap((rows) => toViewEntries(rows, isle))),
      ferry: (from, to, compact) =>
        Effect.gen(function* () {
          const source = of(from);
          const dest = of(to);
          const sourceRows = yield* source.journal.entries;
          const sourceView = yield* toViewEntries(sourceRows, from);
          const start = yield* dest.journal.nextRemoteSequence(remoteIds[from]);
          const incoming = sourceRows.map(
            (entry, index) =>
              new EventJournal.RemoteEntry(
                { remoteSequence: start + index, entry },
                { disableChecks: true },
              ),
          );
          const prepared = compact ? yield* compactRemotes(incoming, sourceView) : { remotes: incoming, compacted: false };
          let conflicts = 0;
          const destBefore = yield* dest.journal.entries;
          for (const remote of prepared.remotes) {
            const hits = destBefore.filter(
              (entry) =>
                entry.event === remote.entry.event &&
                entry.primaryKey === remote.entry.primaryKey &&
                entry.idString !== remote.entry.idString,
            );
            conflicts += hits.length;
          }
          const replay = EventLog.makeReplayFromRemote({
            handlers: dest.registry.handlers,
            storeId,
            identity: dest.identity,
            reactivity: dest.reactivity,
            reactivityKeys: dest.registry.reactivityKeys,
            logAnnotations: { service: "Isles", effect: "ferry" },
          });
          const result = yield* dest.journal.writeFromRemote({
            remoteId: remoteIds[from],
            entries: prepared.remotes,
            effect: replay,
          });
          dest.reactivity.invalidateUnsafe(["isle"]);
          const imported = prepared.remotes.length - result.duplicateEntries.length;
          const destEntries = yield* toViewEntries(yield* dest.journal.entries, to);
          return {
            imported: Math.max(0, imported),
            destEntries,
            conflicts,
            compacted: prepared.compacted,
          };
        }),
      destroy: (isle) =>
        of(isle).log.destroy.pipe(
          Effect.tap(() => Effect.sync(() => of(isle).reactivity.invalidateUnsafe(["isle"]))),
        ),
    });
  });

export const layerIsles = (mode: JournalMode = "idb") => Layer.effect(Isles, makeIsles(mode));
