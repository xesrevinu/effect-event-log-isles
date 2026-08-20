import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  allPetSheetUrls,
  canvasBackingSize,
  clipDir,
  clipEnded,
  defringeRgba,
  clipForEvent,
  clipFrames,
  clipSheet,
  clipSpec,
  clipVideo,
  frameIndex,
  frameSrc,
  isSheet,
  isVideo,
  nextRoamClip,
  parsePetsManifest,
  roamIdleMs,
  sheetCell,
  sheetDrawRect,
  sheetSourceRect,
} from "../src/lib/png-sequence.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("frameIndex loops and clamps one-shots", () => {
  assert.equal(frameIndex(0, 10, 8, true), 0);
  assert.equal(frameIndex(100, 10, 8, true), 1);
  assert.equal(frameIndex(800, 10, 8, true), 0);
  assert.equal(frameIndex(2000, 10, 8, false), 7);
  assert.equal(frameIndex(0, 10, 1, true), 0);
});

test("clipEnded only fires for finished one-shots", () => {
  assert.equal(clipEnded(799, 10, 8, false), false);
  assert.equal(clipEnded(800, 10, 8, false), true);
  assert.equal(clipEnded(8000, 10, 8, true), false);
});

test("drop-in URL convention is species/clip/00.png", () => {
  assert.equal(frameSrc("/pets/pip/idle", 0), "/pets/pip/idle/00.png");
  assert.equal(frameSrc("/pets/bean/eat", 11, 2), "/pets/bean/eat/11.png");
  assert.equal(clipDir("nub", "play"), "/pets/nub/play");
  assert.deepEqual(clipFrames("pip", "sleep", { count: 3, fps: 8, loop: false }), [
    "/pets/pip/sleep/00.png",
    "/pets/pip/sleep/01.png",
    "/pets/pip/sleep/02.png",
  ]);
});

test("roam picks a one-shot and staggers idle waits by species", () => {
  assert.equal(nextRoamClip(0), "eat");
  assert.equal(nextRoamClip(0.4), "play");
  assert.equal(nextRoamClip(0.8), "sleep");
  assert.ok(roamIdleMs(0, "pip") < roamIdleMs(0, "nub"));
  assert.ok(roamIdleMs(0, "nub") < roamIdleMs(0, "bean"));
  assert.ok(roamIdleMs(0.9, "pip") > roamIdleMs(0, "pip"));
});

test("actions map onto eat/play/sleep, everything else stays idle", () => {
  assert.equal(clipForEvent("Fed"), "eat");
  assert.equal(clipForEvent("Played"), "play");
  assert.equal(clipForEvent("Slept"), "sleep");
  assert.equal(clipForEvent("Hatched"), "idle");
  assert.equal(clipForEvent(), "idle");
});

test("parsePetsManifest keeps only real clips with a count", () => {
  const parsed = parsePetsManifest({
    pip: { idle: { count: 8, fps: 10 }, eat: { count: 6, fps: 12 }, dance: { count: 4, fps: 12 } },
    ghost: { idle: { count: 2, fps: 8 } },
  });
  assert.deepEqual(parsed, {
    pip: {
      idle: { count: 8, fps: 10, loop: true },
      eat: { count: 6, fps: 12, loop: false },
    },
  });
  assert.equal(clipSpec(parsed, "pip", "idle")?.count, 8);
  assert.equal(clipSpec(parsed, "pip", "eat")?.loop, false);
  assert.equal(clipSpec(parsed, "pip", "play"), null);
});

test("8x2 sheet cells walk left-to-right, top-to-bottom", () => {
  assert.deepEqual(sheetCell(0, 8), { col: 0, row: 0 });
  assert.deepEqual(sheetCell(7, 8), { col: 7, row: 0 });
  assert.deepEqual(sheetCell(8, 8), { col: 0, row: 1 });
  assert.deepEqual(sheetCell(15, 8), { col: 7, row: 1 });
});

test("defringeRgba un-mattes white halo and drops pale edge pixels", () => {
  const data = new Uint8ClampedArray([
    0, 0, 0, 0,
    226, 226, 226, 128,
    80, 140, 220, 255,
    210, 218, 214, 255,
  ]);
  defringeRgba(data, 2, 2, 2, 2);
  assert.equal(data[3], 0);
  assert.ok(data[7] < 80, `partial white halo should fade, got ${data[7]}`);
  assert.deepEqual([data[8], data[9], data[10], data[11]], [80, 140, 220, 255]);
  assert.ok(data[15] < 255, `opaque pale rim should lose coverage, got ${data[15]}`);
});

test("canvasBackingSize follows the visible CSS box and device pixels", () => {
  assert.equal(canvasBackingSize(96, 3), 288);
  assert.equal(canvasBackingSize(64, 2), 128);
  assert.equal(canvasBackingSize(0, 3), 168);
});

test("sheetDrawRect sits a smaller cell on the canvas floor", () => {
  assert.deepEqual(sheetDrawRect(100, 100, 0.7), { dx: 15, dy: 30, dw: 70, dh: 70 });
  assert.deepEqual(sheetDrawRect(200, 80, 0.5), { dx: 50, dy: 40, dw: 100, dh: 40 });
});

test("sheetSourceRect crops one cell and can inset past a grid", () => {
  assert.deepEqual(sheetSourceRect(0, 8, 2, 1024, 256), { sx: 0, sy: 0, sw: 128, sh: 128 });
  assert.deepEqual(sheetSourceRect(8, 8, 2, 1024, 256), { sx: 0, sy: 128, sw: 128, sh: 128 });
  assert.deepEqual(sheetSourceRect(15, 8, 2, 1024, 256, 2), { sx: 898, sy: 130, sw: 124, sh: 124 });
});

test("allPetSheetUrls lists every species clip, using authored sheet paths", () => {
  assert.deepEqual(allPetSheetUrls(), [
    "/pets/pip/idle.png",
    "/pets/pip/eat.png",
    "/pets/pip/play.png",
    "/pets/pip/sleep.png",
    "/pets/nub/idle.png",
    "/pets/nub/eat.png",
    "/pets/nub/play.png",
    "/pets/nub/sleep.png",
    "/pets/bean/idle.png",
    "/pets/bean/eat.png",
    "/pets/bean/play.png",
    "/pets/bean/sleep.png",
  ]);
  assert.equal(allPetSheetUrls({ pip: { idle: { count: 8, fps: 10, loop: true, sheet: "/custom/pip-idle.png" } } })[0], "/custom/pip-idle.png");
});

test("public/pets/manifest.json maps full video rebuilds, not 16-frame strips", () => {
  const raw = JSON.parse(readFileSync(join(root, "public/pets/manifest.json"), "utf8"));
  const parsed = parsePetsManifest(raw);
  const pipIdle = clipSpec(parsed, "pip", "idle");
  const pipEat = clipSpec(parsed, "pip", "eat");
  assert.equal(pipIdle?.loop, true);
  assert.equal(pipIdle?.count, 145);
  assert.equal(pipIdle?.fps, 16);
  assert.equal(pipIdle?.cols, 15);
  assert.equal(pipIdle?.rows, 10);
  assert.equal(pipEat?.loop, false);
  assert.equal(pipEat?.fps, 20);
  assert.equal(isSheet(pipIdle ?? { count: 145, fps: 16, loop: true, cols: 15 }), true);
  assert.equal(isVideo(pipIdle ?? { count: 145, fps: 16, loop: true }), false);
  assert.equal(clipSheet("pip", "idle", pipIdle ?? { count: 145, fps: 16, loop: true, cols: 15 }), "/pets/pip/idle.png");
  assert.equal(clipEnded(9062, 16, 145, true), false);
  assert.equal(clipEnded(7249, 20, 145, false), false);
  assert.equal(clipEnded(7250, 20, 145, false), true);
  assert.equal(clipSpec(parsed, "bean", "play")?.loop, false);
  assert.equal(clipVideo("pip", "idle", { count: 1, fps: 24, loop: true, video: "" }), "/pets/pip/idle.mp4");
});
