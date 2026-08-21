import { Effect } from "effect";
import * as EventJournal from "effect/unstable/eventlog/EventJournal";
import * as EventLog from "effect/unstable/eventlog/EventLog";
import { applyEvent, type Critter, type EventTag } from "@/lib/critter-sim";
import { CritterEvents } from "@/lib/isles/events";

/**
 * Compaction runs on remote ingest, never by rewriting a committed local
 * journal. Incoming events for one pet fold into a single Snapshot.
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

/**
 * Teaching fold: replace the stored remote batch with Snapshot entries.
 * EventLog.runRemote compaction only changes which handlers replay; it still
 * appends the original remotes. Mission 6 needs the dest journal to *receive*
 * a snapshot, so ferry compact:true runs this before writeFromRemote.
 */
export const foldRemoteEntries = (
  remotes: ReadonlyArray<EventJournal.RemoteEntry>,
  compactors: EventLog.Registry["Service"]["compactors"],
): Effect.Effect<{
  remotes: ReadonlyArray<EventJournal.RemoteEntry>;
  compacted: boolean;
}> =>
  Effect.gen(function* () {
    if (remotes.length === 0 || compactors.size === 0) {
      return { remotes, compacted: false };
    }
    const produced: EventJournal.Entry[] = [];
    const ran = new Set<unknown>();
    const entries = remotes.map((remote) => remote.entry);
    for (const remote of remotes) {
      const compactor = compactors.get(remote.entry.event);
      if (!compactor || ran.has(compactor.effect)) continue;
      ran.add(compactor.effect);
      yield* compactor.effect({
        entries,
        write: (entry) =>
          Effect.sync(() => {
            produced.push(entry);
          }),
      });
    }
    if (produced.length === 0) {
      return { remotes, compacted: false };
    }
    const producedKeys = new Set(produced.map((entry) => entry.primaryKey));
    const emitted = new Set<string>();
    const next: EventJournal.RemoteEntry[] = [];
    for (const remote of remotes) {
      if (!producedKeys.has(remote.entry.primaryKey)) {
        next.push(remote);
        continue;
      }
      if (emitted.has(remote.entry.primaryKey)) continue;
      emitted.add(remote.entry.primaryKey);
      const group = remotes.filter((row) => row.entry.primaryKey === remote.entry.primaryKey);
      const last = group.at(-1);
      if (!last) continue;
      for (const entry of produced.filter((row) => row.primaryKey === remote.entry.primaryKey)) {
        next.push(
          new EventJournal.RemoteEntry(
            { remoteSequence: last.remoteSequence, entry },
            { disableChecks: true },
          ),
        );
      }
    }
    return { remotes: next, compacted: true };
  });
