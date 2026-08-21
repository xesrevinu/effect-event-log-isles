import { describe, expect, it } from "vitest";
import {
  expectOpen,
  expectStuck,
  expectWon,
  fed,
  hatched,
  lessonAt,
  named,
  played,
  world,
} from "@/lib/mission-harness";
import { LAST_MISSION, MISSION_IDS, type MissionId, type Spotlight } from "@/lib/missions";

type Case = {
  spotlight: Spotlight;
  moonOpen: boolean;
  start: ReturnType<typeof world>;
  won: ReturnType<typeof world>;
  stuck?: ReturnType<typeof world>;
  after?: Array<{ world: ReturnType<typeof world>; spotlight: Spotlight }>;
};

const pip = hatched("c1");
const nub = hatched("c2", "nub");
const pipMoon = hatched("c1");
const nubMoon = hatched("c2", "nub");

const cases: Record<MissionId, Case> = {
  1: {
    spotlight: "hatch",
    moonOpen: false,
    start: world(),
    won: world({
      sun: [pip, fed("c1"), nub],
      flags: { rejected: true, wiped: true, rebuilt: true },
    }),
    after: [
      { world: world({ sun: [pip] }), spotlight: "feed" },
      { world: world({ sun: [pip], flags: { rejected: true } }), spotlight: "hatch" },
      {
        world: world({ sun: [pip, hatched("c2")], flags: { rejected: true } }),
        spotlight: "hatch",
      },
      {
        world: world({ sun: [pip, nub], flags: { rejected: true } }),
        spotlight: "storm",
      },
      {
        world: world({ sun: [pip, nub], flags: { rejected: true, wiped: true } }),
        spotlight: "replay",
      },
    ],
  },
  2: {
    spotlight: "online",
    moonOpen: true,
    start: world({ sun: [pip, nub] }),
    won: world({
      sun: [pip, nub, named("c1", "Sol")],
      moon: [pipMoon, nubMoon, named("c1", "Sol")],
      network: { server: true, sun: true, moon: true },
    }),
    after: [
      {
        world: world({
          sun: [pip, nub],
          moon: [pipMoon, nubMoon],
          network: { server: true, sun: true, moon: true },
        }),
        spotlight: "name",
      },
    ],
  },
  3: {
    spotlight: "server",
    moonOpen: true,
    start: world({
      sun: [pip, nub],
      moon: [pipMoon, nubMoon],
      network: { server: true, sun: true, moon: true },
    }),
    won: world({
      sun: [pip, nub, played("c2")],
      moon: [pipMoon, nubMoon, played("c2")],
      network: { server: true, sun: true, moon: true },
      flags: { serverDropped: true, serverRestored: true, wroteWhileDown: true },
    }),
    after: [
      {
        world: world({
          sun: [pip, nub],
          moon: [pipMoon, nubMoon],
          flags: { serverDropped: true },
        }),
        spotlight: "play",
      },
      {
        world: world({
          sun: [pip, nub, played("c2")],
          moon: [pipMoon, nubMoon],
          flags: { serverDropped: true, wroteWhileDown: true },
        }),
        spotlight: "server",
      },
    ],
  },
};

describe("mission specs", () => {
  it.each(MISSION_IDS)("mission %s starts open, can be won, and next follows complete", (id) => {
    const spec = cases[id];
    const start = lessonAt(id, spec.start);
    expectOpen(start, spec.spotlight);
    expect(start.moonOpen).toBe(spec.moonOpen);
    expect(start.controls.next.visible).toBe(start.complete);

    const won = lessonAt(id, spec.won);
    expectWon(won);
    expect(won.nextLabel).toBe(id === LAST_MISSION ? "free" : "next");
    expect(won.controls.next.visible).toBe(won.complete);
  });

  it.each(MISSION_IDS.filter((id) => cases[id].stuck))(
    "mission %s dead-end is stuck and hides next",
    (id) => {
      const stuckWorld = cases[id].stuck;
      if (!stuckWorld) return;
      expectStuck(lessonAt(id, stuckWorld));
    },
  );

  it.each(MISSION_IDS.flatMap((id) => (cases[id].after ?? []).map((step) => ({ id, ...step }))))(
    "mission $id guide moves to $spotlight",
    ({ id, world: next, spotlight }) => {
      const lesson = lessonAt(id, next);
      expectOpen(lesson, spotlight);
    },
  );

  it("hatch stays enabled on moon when sun is full", () => {
    const lesson = lessonAt(2, world({ sun: [pip, nub] }));
    expect(lesson.controls.hatch.enabled).toBe(true);
    expect(lesson.stuck).toBe(false);
  });

  it("free play never completes", () => {
    const free = lessonAt(0, world({ sun: [pip] }));
    expect(free.complete).toBe(false);
    expect(free.stuck).toBe(false);
    expect(free.moonOpen).toBe(true);
    expect(free.controls.next.visible).toBe(false);
    expect(free.controls.ferry.visible).toBe(false);
  });
});
