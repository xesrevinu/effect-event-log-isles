import { Schema } from "effect";
import { herd, MAX_HERD, type Replica } from "@/lib/critter-sim";
import type { OnlineState } from "@/lib/isles/runtime";

export const MISSION_IDS = [1, 2, 3] as const;
export type MissionId = (typeof MISSION_IDS)[number];
export const LAST_MISSION: MissionId = 3;

export class Flags extends Schema.Class<Flags>("isles/Flags")({
  rejected: Schema.Boolean,
  wiped: Schema.Boolean,
  rebuilt: Schema.Boolean,
  conflicted: Schema.Boolean,
  compacted: Schema.Boolean,
  played: Schema.Boolean,
  slept: Schema.Boolean,
  serverDropped: Schema.Boolean,
  serverRestored: Schema.Boolean,
  wroteWhileDown: Schema.Boolean,
}) {}

export const emptyFlags = () =>
  Flags.make({
    rejected: false,
    wiped: false,
    rebuilt: false,
    conflicted: false,
    compacted: false,
    played: false,
    slept: false,
    serverDropped: false,
    serverRestored: false,
    wroteWhileDown: false,
  });

export type World = {
  readonly sun: Replica;
  readonly moon: Replica;
  readonly flags: Flags;
  readonly network: OnlineState;
};

export type Spotlight =
  | "hatch"
  | "feed"
  | "storm"
  | "replay"
  | "name"
  | "play"
  | "online"
  | "server"
  | null;

export type GuideStep = {
  readonly spotlight: Exclude<Spotlight, null>;
  readonly until?: (world: World) => boolean;
};

export type MissionSpec = {
  readonly id: MissionId;
  readonly moonOpen: boolean;
  readonly nextLabel: "next" | "free";
  readonly win: (world: World) => boolean;
  readonly guide: readonly GuideStep[];
};

export function petCount(world: World): number {
  return herd(world.sun).length + herd(world.moon).length;
}

export function journalLength(world: World): number {
  return world.sun.journal.length + world.moon.journal.length;
}

function sharedIds(a: Replica, b: Replica): string[] {
  const left = new Set(Object.keys(a.projection));
  return Object.keys(b.projection).filter((k) => left.has(k));
}

function bothLive(network: OnlineState): boolean {
  return network.server && network.sun && network.moon;
}

function hatchedSpecies(replica: Replica): string[] {
  const species = new Set<string>();
  for (const entry of replica.journal) {
    if (entry.event === "Hatched") species.add(String(entry.payload.species ?? ""));
  }
  return [...species];
}

function hasNamed(world: World): boolean {
  return [...world.sun.journal, ...world.moon.journal].some((entry) => entry.event === "Named");
}

function defineMission(spec: MissionSpec): MissionSpec {
  return spec;
}

export function guideSpotlight(spec: MissionSpec, world: World): Exclude<Spotlight, null> {
  for (const step of spec.guide) {
    if (!step.until?.(world)) return step.spotlight;
  }
  return spec.guide.at(-1)?.spotlight ?? "hatch";
}

export function spotlightPossible(spot: Spotlight, world: World): boolean {
  switch (spot) {
    case "hatch":
      return herd(world.sun).length < MAX_HERD || herd(world.moon).length < MAX_HERD;
    case "feed":
    case "play":
    case "name":
      return petCount(world) > 0;
    case "storm":
    case "replay":
      return journalLength(world) > 0;
    case "online":
      return !bothLive(world.network);
    case "server":
      return true;
    default:
      return false;
  }
}

const missions = {
  1: defineMission({
    id: 1,
    moonOpen: false,
    nextLabel: "next",
    win: (world) =>
      world.flags.rejected &&
      world.flags.wiped &&
      world.flags.rebuilt &&
      hatchedSpecies(world.sun).length >= 2 &&
      petCount(world) > 0,
    guide: [
      { spotlight: "hatch", until: (world) => journalLength(world) > 0 },
      { spotlight: "feed", until: (world) => world.flags.rejected },
      { spotlight: "hatch", until: (world) => hatchedSpecies(world.sun).length >= 2 },
      { spotlight: "storm", until: (world) => world.flags.wiped },
      { spotlight: "replay" },
    ],
  }),
  2: defineMission({
    id: 2,
    moonOpen: true,
    nextLabel: "next",
    win: (world) =>
      bothLive(world.network) && sharedIds(world.sun, world.moon).length > 0 && hasNamed(world),
    guide: [
      {
        spotlight: "online",
        until: (world) => bothLive(world.network),
      },
      { spotlight: "name" },
    ],
  }),
  3: defineMission({
    id: 3,
    moonOpen: true,
    nextLabel: "free",
    win: (world) =>
      world.flags.serverDropped && world.flags.serverRestored && world.flags.wroteWhileDown,
    guide: [
      { spotlight: "server", until: (world) => world.flags.serverDropped },
      { spotlight: "play", until: (world) => world.flags.wroteWhileDown },
      { spotlight: "server" },
    ],
  }),
} as const satisfies Record<MissionId, MissionSpec>;

export function missionOf(id: MissionId | 0): MissionSpec | null {
  return id === 0 ? null : missions[id];
}
