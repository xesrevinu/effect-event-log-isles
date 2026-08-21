import { expect, it } from "vitest";
import { herd, replay, type Entry, type Replica } from "@/lib/critter-sim";

function sunFrom(events: Array<Pick<Entry, "event" | "payload">>): Replica {
  const journal = events.map((item, index) => ({
    id: `e${index}`,
    event: item.event,
    primaryKey: String(item.payload.id ?? ""),
    payload: item.payload,
    createdAt: index + 1,
    replicaId: "sun" as const,
    seq: index + 1,
  }));
  return {
    id: "sun",
    label: "sun",
    journal,
    projection: replay(journal),
    remoteCursor: {},
    seq: journal.length,
  };
}

it("keeps hatch order after acting on the later pet", () => {
  const sun = sunFrom([
    { event: "Hatched", payload: { id: "c1", species: "pip", name: "Pip" } },
    { event: "Hatched", payload: { id: "c2", species: "nub", name: "Nub" } },
    { event: "Fed", payload: { id: "c2" } },
  ]);
  expect(herd(sun).map((pet) => pet.id)).toEqual(["c1", "c2"]);
  expect(herd(sun)[0]?.belly).toBe(2);
  expect(herd(sun)[1]?.belly).toBe(3);
});
