import { expect } from "vitest";
import {
  applyEvent,
  defaultName,
  type EventTag,
  type Replica,
  type ReplicaId,
  type Species,
} from "@/lib/critter-sim";
import type { OnlineState } from "@/lib/isles/runtime";
import { emptyFlags, Flags, type MissionId, type Spotlight } from "@/lib/missions";
import { lessonOf, type Lesson, type LessonInput } from "@/lib/tutorial";

export type WorldEvent = {
  event: EventTag;
  payload: Record<string, unknown>;
};

const offline: OnlineState = { server: true, sun: false, moon: false };

export function replica(id: ReplicaId, events: readonly WorldEvent[]): Replica {
  let projection = {};
  const journal = events.map((item, index) => {
    projection = applyEvent(projection, item.event, item.payload, index + 1);
    return {
      id: `e${index}`,
      event: item.event,
      primaryKey: String(item.payload.id ?? ""),
      payload: item.payload,
      createdAt: index + 1,
      replicaId: id,
      seq: index + 1,
    };
  });
  return {
    id,
    label: id,
    journal,
    projection,
    remoteCursor: {},
    seq: journal.length,
  };
}

export function hatched(id = "c1", species: Species = "pip"): WorldEvent {
  return { event: "Hatched", payload: { id, species, name: defaultName(species) } };
}

export function named(id: string, name: string): WorldEvent {
  return { event: "Named", payload: { id, name } };
}

export function fed(id = "c1"): WorldEvent {
  return { event: "Fed", payload: { id } };
}

export function played(id = "c1"): WorldEvent {
  return { event: "Played", payload: { id } };
}

export function world(
  input: {
    sun?: readonly WorldEvent[];
    moon?: readonly WorldEvent[];
    flags?: Partial<Flags>;
    network?: Partial<OnlineState>;
  } = {},
): Omit<LessonInput, "mission" | "busy"> {
  return {
    sun: replica("sun", input.sun ?? []),
    moon: replica("moon", input.moon ?? []),
    flags: Flags.make({ ...emptyFlags(), ...input.flags }),
    network: { ...offline, ...input.network },
  };
}

export function lessonAt(id: MissionId | 0, input: ReturnType<typeof world> = world()): Lesson {
  return lessonOf({ mission: id, ...input });
}

export function expectOpen(lesson: Lesson, spotlight?: Spotlight) {
  expect(lesson.complete, "open lesson should not be complete").toBe(false);
  expect(lesson.stuck, "open lesson should not be stuck").toBe(false);
  expect(lesson.controls.next.visible, "next stays hidden until the mission is won").toBe(false);
  if (spotlight !== undefined) expect(lesson.spotlight).toBe(spotlight);
}

export function expectWon(lesson: Lesson) {
  expect(lesson.complete, "winning world should complete").toBe(true);
  expect(lesson.stuck, "a complete lesson is never stuck").toBe(false);
  expect(lesson.controls.next.visible, "next is the same rule as complete").toBe(true);
  expect(lesson.spotlight).toBe(null);
}

export function expectStuck(lesson: Lesson) {
  expect(lesson.complete, "a stuck lesson is not complete").toBe(false);
  expect(lesson.stuck, "dead-end world should be stuck").toBe(true);
  expect(lesson.controls.next.visible, "stuck lessons never show next").toBe(false);
}
