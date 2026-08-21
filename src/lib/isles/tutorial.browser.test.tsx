import { expect, test } from "vitest";
import { herd } from "@/lib/critter-sim";
import { expectOpen, expectWon } from "@/lib/mission-harness";
import { mountPlay, playAt, writeOk } from "@/lib/isles/play-harness";

test("mission 1 hatch, stuff, hatch again, storm, replay completes", async () => {
  const { result } = await mountPlay();
  expectOpen(result.current.lesson, "hatch");
  expect(result.current.lesson.controls.moonIsle.visible).toBe(false);
  const first = await result.current.hatch();
  expect(first.ok).toBe(true);
  await expect.poll(() => herd(result.current.sun).length).toBe(1);
  await expect.poll(() => result.current.lesson.spotlight).toBe("feed");
  expect(writeOk(await result.current.write("Fed", { id: first.id }))).toBe(true);
  expect(writeOk(await result.current.write("Fed", { id: first.id }))).toBe(false);
  await expect.poll(() => result.current.lesson.spotlight).toBe("hatch");
  const second = await result.current.hatch("nub");
  expect(second.ok).toBe(true);
  await expect.poll(() => herd(result.current.sun).length).toBe(2);
  await expect.poll(() => result.current.lesson.spotlight).toBe("storm");
  await result.current.storm();
  await expect.poll(() => result.current.lesson.spotlight).toBe("replay");
  await result.current.replay();
  await expect.poll(() => result.current.lesson.complete).toBe(true);
  expectWon(result.current.lesson);
  expect(
    herd(result.current.sun)
      .map((pet) => pet.species)
      .sort(),
  ).toEqual(["nub", "pip"]);
});

test("mission 2 online then rename completes", async () => {
  const hook = await mountPlay();
  const { id } = await hook.result.current.hatch();
  await hook.result.current.hatch("nub");
  await playAt(hook, 2);
  expect(hook.result.current.lesson.moonOpen).toBe(true);
  expectOpen(hook.result.current.lesson, "online");
  await hook.result.current.setOnline("sun", true);
  await hook.result.current.setOnline("moon", true);
  await expect.poll(() => herd(hook.result.current.moon).length).toBe(2);
  await expect.poll(() => hook.result.current.lesson.spotlight).toBe("name");
  expect(writeOk(await hook.result.current.write("Named", { id, name: "Sol" }, "sun"))).toBe(true);
  await expect.poll(() => hook.result.current.lesson.complete).toBe(true);
  expectWon(hook.result.current.lesson);
  expect(herd(hook.result.current.moon).some((pet) => pet.name === "Sol")).toBe(true);
});

test("mission 3 server drop, write, restore completes", async () => {
  const hook = await mountPlay();
  const { id } = await hook.result.current.hatch();
  await hook.result.current.hatch("nub");
  await hook.result.current.setOnline("sun", true);
  await hook.result.current.setOnline("moon", true);
  await expect.poll(() => herd(hook.result.current.moon).length).toBe(2);
  await playAt(hook, 3);
  expectOpen(hook.result.current.lesson, "server");
  await hook.result.current.setServer(false);
  await expect.poll(() => hook.result.current.progress.flags.serverDropped).toBe(true);
  await expect.poll(() => hook.result.current.lesson.spotlight).toBe("play");
  expect(writeOk(await hook.result.current.write("Played", { id }))).toBe(true);
  await expect.poll(() => hook.result.current.progress.flags.wroteWhileDown).toBe(true);
  await expect.poll(() => hook.result.current.lesson.spotlight).toBe("server");
  await hook.result.current.setServer(true);
  await expect.poll(() => hook.result.current.lesson.complete).toBe(true);
  expectWon(hook.result.current.lesson);
});
