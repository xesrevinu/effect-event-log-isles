import { Schema, Struct } from "effect";
import type { EventTag, ReplicaId } from "@/lib/critter-sim";
import { emptyFlags, Flags, LAST_MISSION, type MissionId } from "@/lib/missions";

export class Playhead extends Schema.Class<Playhead>("isles/Playhead")({
  sun: Schema.NullOr(Schema.Number),
  moon: Schema.NullOr(Schema.Number),
}) {}

export class Progress extends Schema.Class<Progress>("isles/Progress")({
  mission: Schema.Literals([0, 1, 2, 3]),
  flags: Flags,
  active: Schema.Literals(["sun", "moon"]),
}) {}

export const initialPlayhead = () => Playhead.make({ sun: null, moon: null });

export const initialProgress = () =>
  Progress.make({
    mission: 1,
    flags: emptyFlags(),
    active: "sun",
  });

export function setIslePlayhead(
  playhead: Playhead,
  isle: ReplicaId,
  value: number | null,
): Playhead {
  return Playhead.make(
    isle === "sun"
      ? Struct.evolve(playhead, { sun: () => value })
      : Struct.evolve(playhead, { moon: () => value }),
  );
}

export function noteWrite(
  progress: Progress,
  event: EventTag,
  ok: boolean,
  whileDown = false,
): Progress {
  return Progress.make(
    Struct.evolve(progress, {
      flags: (flags) =>
        Flags.make(
          Struct.evolve(flags, {
            rejected: (rejected) => rejected || !ok,
            played: (played) => played || (ok && event === "Played"),
            slept: (slept) => slept || (ok && event === "Slept"),
            wroteWhileDown: (wrote) => wrote || (ok && whileDown),
          }),
        ),
    }),
  );
}

export function noteFerry(
  progress: Progress,
  result: { conflicts: number; compacted: boolean },
  dest: ReplicaId,
): Progress {
  return Progress.make(
    Struct.evolve(progress, {
      active: () => dest,
      flags: (flags) =>
        Flags.make(
          Struct.evolve(flags, {
            conflicted: (conflicted) => conflicted || result.conflicts > 0,
            compacted: (compacted) => compacted || result.compacted,
          }),
        ),
    }),
  );
}

export function noteStorm(progress: Progress): Progress {
  return Progress.make(
    Struct.evolve(progress, {
      flags: (flags) =>
        Flags.make(
          Struct.evolve(flags, {
            wiped: () => true,
            rebuilt: () => false,
          }),
        ),
    }),
  );
}

export function noteReplay(progress: Progress, rebuilt: boolean): Progress {
  return Progress.make(
    Struct.evolve(progress, {
      flags: (flags) =>
        Flags.make(
          Struct.evolve(flags, {
            rebuilt: () => rebuilt,
          }),
        ),
    }),
  );
}

export function setActive(progress: Progress, active: ReplicaId): Progress {
  return Progress.make(Struct.evolve(progress, { active: () => active }));
}

export function noteServer(progress: Progress, up: boolean): Progress {
  return Progress.make(
    Struct.evolve(progress, {
      flags: (flags) =>
        Flags.make(
          Struct.evolve(flags, {
            serverDropped: (dropped) => dropped || !up,
            serverRestored: (restored) => restored || (up && flags.serverDropped),
          }),
        ),
    }),
  );
}

export function advanceMission(progress: Progress): Progress {
  if (progress.mission === 0 || progress.mission === LAST_MISSION) {
    return Progress.make(Struct.evolve(progress, { mission: () => 0 as const }));
  }
  return Progress.make(
    Struct.evolve(progress, {
      mission: (mission) => (mission + 1) as MissionId,
    }),
  );
}
