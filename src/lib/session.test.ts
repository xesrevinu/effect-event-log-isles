import { describe, expect, it } from "vitest";
import {
  advanceMission,
  initialPlayhead,
  initialProgress,
  noteFerry,
  noteReplay,
  noteServer,
  noteStorm,
  noteWrite,
  setActive,
  setIslePlayhead,
} from "@/lib/session";

describe("session updates", () => {
  it("records a handler reject without clobbering other flags", () => {
    const played = noteWrite(initialProgress(), "Played", true);
    const rejected = noteWrite(played, "Fed", false);
    expect(rejected.flags.played).toBe(true);
    expect(rejected.flags.rejected).toBe(true);
    expect(rejected.flags.slept).toBe(false);
    expect(rejected.flags.wroteWhileDown).toBe(false);
  });

  it("latches a successful write while the server is down", () => {
    const wrote = noteWrite(initialProgress(), "Played", true, true);
    expect(wrote.flags.wroteWhileDown).toBe(true);
    expect(wrote.flags.played).toBe(true);
  });

  it("advances missions and wraps free play after the last mission", () => {
    let progress = initialProgress();
    progress = advanceMission(progress);
    expect(progress.mission).toBe(2);
    progress = advanceMission(progress);
    expect(progress.mission).toBe(3);
    expect(advanceMission(progress).mission).toBe(0);
  });

  it("storm then replay only evolves the matching flags", () => {
    const afterStorm = noteStorm(initialProgress());
    expect(afterStorm.flags.wiped).toBe(true);
    expect(afterStorm.flags.rebuilt).toBe(false);
    const afterReplay = noteReplay(afterStorm, true);
    expect(afterReplay.flags.wiped).toBe(true);
    expect(afterReplay.flags.rebuilt).toBe(true);
  });

  it("ferry notes conflict/compact and focuses the destination", () => {
    const next = noteFerry(initialProgress(), { conflicts: 1, compacted: true }, "moon");
    expect(next.active).toBe("moon");
    expect(next.flags.conflicted).toBe(true);
    expect(next.flags.compacted).toBe(true);
  });

  it("server down then up latches both flags", () => {
    const down = noteServer(initialProgress(), false);
    expect(down.flags.serverDropped).toBe(true);
    expect(down.flags.serverRestored).toBe(false);
    const up = noteServer(down, true);
    expect(up.flags.serverDropped).toBe(true);
    expect(up.flags.serverRestored).toBe(true);
  });

  it("playhead updates one isle without touching the other", () => {
    const playhead = setIslePlayhead(initialPlayhead(), "sun", 0);
    expect(playhead).toEqual({ sun: 0, moon: null });
    expect(setIslePlayhead(playhead, "sun", null)).toEqual({ sun: null, moon: null });
    expect(setActive(initialProgress(), "moon").active).toBe("moon");
  });
});
