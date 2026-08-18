import { herd, type Replica } from "@/lib/critter-sim";

export type MissionId = 1 | 2 | 3 | 4 | 5 | 6;

export type Flags = {
  rejected: boolean;
  wiped: boolean;
  rebuilt: boolean;
  conflicted: boolean;
  compacted: boolean;
  played: boolean;
  slept: boolean;
};

export function emptyFlags(): Flags {
  return {
    rejected: false,
    wiped: false,
    rebuilt: false,
    conflicted: false,
    compacted: false,
    played: false,
    slept: false,
  };
}

export function sharedIds(a: Replica, b: Replica): string[] {
  const left = new Set(Object.keys(a.projection));
  return Object.keys(b.projection).filter((k) => left.has(k));
}

export function checkMission(
  id: MissionId,
  sun: Replica,
  moon: Replica,
  flags: Flags,
): boolean {
  switch (id) {
    case 1:
      return herd(sun).length + herd(moon).length > 0;
    case 2:
      return flags.rejected;
    case 3:
      return flags.wiped && flags.rebuilt && herd(sun).length + herd(moon).length > 0;
    case 4:
      return sharedIds(sun, moon).length > 0;
    case 5:
      return flags.conflicted;
    case 6:
      return flags.compacted;
  }
}

export type Spotlight =
  | "hatch"
  | "feed"
  | "storm"
  | "replay"
  | "ferry"
  | "name"
  | "fold"
  | "play"
  | null;

export function spotlightFor(id: MissionId, flags: Flags): Spotlight {
  switch (id) {
    case 1:
      return "hatch";
    case 2:
      return "feed";
    case 3:
      return flags.wiped ? "replay" : "storm";
    case 4:
      return "ferry";
    case 5:
      return "name";
    case 6:
      return flags.played ? "fold" : "play";
  }
}
