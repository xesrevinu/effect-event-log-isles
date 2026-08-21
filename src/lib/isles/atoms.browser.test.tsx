import { expect, test } from "vitest";
import { herd } from "@/lib/critter-sim";
import { mountPlay, writeOk } from "@/lib/isles/play-harness";

function eventsOf(replica: { journal: ReadonlyArray<{ event: string }> }) {
  return replica.journal.map((entry) => entry.event);
}

test("mounted atoms write through EventLog and the replica hook sees the pet", async () => {
  const { result } = await mountPlay();
  const { id, ok } = await result.current.hatch();
  expect(ok).toBe(true);
  await expect.poll(() => eventsOf(result.current.sun)).toEqual(["Hatched"]);
  expect(herd(result.current.sun)[0]?.belly).toBe(2);

  expect(writeOk(await result.current.write("Fed", { id }))).toBe(true);
  await expect.poll(() => herd(result.current.sun)[0]?.belly).toBe(3);

  expect(writeOk(await result.current.write("Fed", { id }))).toBe(false);
  expect(eventsOf(result.current.sun)).toEqual(["Hatched", "Fed"]);
  expect(herd(result.current.sun)[0]?.belly).toBe(3);
  expect(result.current.moon.journal).toEqual([]);
});

test("offline clients stay isolated until a ferry, then the dest hook updates", async () => {
  const { result } = await mountPlay();
  const { id } = await result.current.hatch();
  await expect.poll(() => result.current.sun.journal.length).toBe(1);
  expect(result.current.moon.journal).toEqual([]);

  const ferry = await result.current.ferry();
  expect(ferry.imported).toBeGreaterThan(0);
  await expect.poll(() => eventsOf(result.current.moon)).toEqual(["Hatched"]);
  expect(herd(result.current.moon)[0]?.id).toBe(id);
});

test("online clients merge through the server and the other hook catches up", async () => {
  const { result } = await mountPlay();
  const { id } = await result.current.hatch();
  await result.current.setOnline("sun", true);
  await result.current.setOnline("moon", true);
  await expect.poll(() => result.current.online.sun && result.current.online.moon).toBe(true);

  expect(writeOk(await result.current.write("Played", { id }))).toBe(true);
  await expect
    .poll(() => eventsOf(result.current.moon).includes("Played"), { timeout: 5000 })
    .toBe(true);
  expect(herd(result.current.moon)[0]?.belly).toBe(2);
});

test("a downed server stops live sync until it comes back", async () => {
  const { result } = await mountPlay();
  const { id } = await result.current.hatch();
  await result.current.setOnline("sun", true);
  await result.current.setOnline("moon", true);
  expect(writeOk(await result.current.write("Played", { id }))).toBe(true);
  await expect
    .poll(() => eventsOf(result.current.moon).includes("Played"), { timeout: 5000 })
    .toBe(true);

  await result.current.setServer(false);
  await expect.poll(() => result.current.online.server).toBe(false);

  expect(writeOk(await result.current.write("Slept", { id }))).toBe(true);
  await expect.poll(() => eventsOf(result.current.sun).includes("Slept")).toBe(true);
  expect(eventsOf(result.current.moon).includes("Slept")).toBe(false);

  await result.current.setServer(true);
  await expect
    .poll(() => eventsOf(result.current.moon).includes("Slept"), { timeout: 5000 })
    .toBe(true);
});
