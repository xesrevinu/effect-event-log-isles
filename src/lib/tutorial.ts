import { herd, MAX_HERD, type Replica } from "@/lib/critter-sim";
import type { OnlineState } from "@/lib/isles/runtime";
import {
  guideSpotlight,
  journalLength,
  missionOf,
  petCount,
  spotlightPossible,
  type Flags,
  type MissionId,
  type Spotlight,
  type World,
} from "@/lib/missions";

export type ControlId =
  | "hatch"
  | "feed"
  | "play"
  | "sleep"
  | "release"
  | "name"
  | "storm"
  | "replay"
  | "fold"
  | "ferry"
  | "ferryBack"
  | "moonIsle"
  | "online"
  | "server"
  | "next";

export type Control = {
  readonly visible: boolean;
  readonly enabled: boolean;
};

export type Lesson = {
  readonly mission: MissionId | 0;
  readonly complete: boolean;
  readonly spotlight: Spotlight;
  readonly moonOpen: boolean;
  readonly nextLabel: "next" | "free" | null;
  readonly controls: Record<ControlId, Control>;
  readonly stuck: boolean;
};

export type LessonInput = {
  readonly mission: MissionId | 0;
  readonly sun: Replica;
  readonly moon: Replica;
  readonly flags: Flags;
  readonly network: OnlineState;
  readonly busy?: boolean;
};

const off: Control = { visible: false, enabled: false };
const on = (enabled: boolean): Control => ({ visible: true, enabled });

export function lessonOf(input: LessonInput): Lesson {
  const world: World = {
    sun: input.sun,
    moon: input.moon,
    flags: input.flags,
    network: input.network,
  };
  const spec = missionOf(input.mission);
  const busy = Boolean(input.busy);
  const moonOpen = spec?.moonOpen ?? true;
  const complete = spec ? spec.win(world) : false;
  const spotlight = !spec || complete ? null : guideSpotlight(spec, world);
  const hasPets = petCount(world) > 0;
  const hasJournal = journalLength(world) > 0;
  const sunHerd = herd(world.sun).length;
  const moonHerd = herd(world.moon).length;

  const controls: Record<ControlId, Control> = {
    hatch: on(!busy && (sunHerd < MAX_HERD || (moonOpen && moonHerd < MAX_HERD))),
    feed: on(!busy && hasPets),
    play: on(!busy && hasPets),
    sleep: on(!busy && hasPets),
    release: on(!busy && hasPets),
    name: on(!busy && hasPets),
    storm: on(!busy && hasJournal),
    replay: on(!busy && hasJournal),
    fold: off,
    ferry: off,
    ferryBack: off,
    moonIsle: moonOpen ? on(true) : off,
    online: on(!busy),
    server: moonOpen ? on(!busy) : off,
    next: complete ? on(true) : off,
  };

  return {
    mission: input.mission,
    complete,
    spotlight,
    moonOpen,
    nextLabel: complete ? (spec?.nextLabel ?? null) : null,
    controls,
    stuck: spec !== null && !complete && !spotlightPossible(spotlight, world),
  };
}
