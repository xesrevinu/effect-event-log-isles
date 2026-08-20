import assert from "node:assert/strict";
import test from "node:test";
import { keyStudioBlack, keyStudioWhite } from "./pet-matte.mjs";

function pixel(data, width, x, y) {
  const o = (y * width + x) * 4;
  return [data[o], data[o + 1], data[o + 2], data[o + 3]];
}

function fill(data, width, x0, y0, x1, y1, r, g, b, a = 255) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const o = (y * width + x) * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = a;
    }
  }
}

test("keyStudioWhite drops the studio backdrop but keeps enclosed eye whites", () => {
  const width = 8;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  fill(data, width, 0, 0, 7, 7, 250, 250, 250);
  fill(data, width, 2, 2, 5, 5, 255, 160, 0);
  fill(data, width, 3, 3, 4, 4, 252, 252, 252);

  keyStudioWhite(data, width, height);

  assert.deepEqual(pixel(data, width, 0, 0), [0, 0, 0, 0]);
  assert.deepEqual(pixel(data, width, 7, 3), [0, 0, 0, 0]);
  assert.deepEqual(pixel(data, width, 2, 2), [255, 160, 0, 255]);
  assert.deepEqual(pixel(data, width, 3, 3), [252, 252, 252, 255]);
  assert.deepEqual(pixel(data, width, 4, 4), [252, 252, 252, 255]);
});

test("keyStudioBlack drops edge letterbox but keeps pupils and eye highlights", () => {
  const width = 8;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  fill(data, width, 0, 0, 7, 7, 250, 250, 250);
  fill(data, width, 0, 0, 7, 0, 4, 4, 4);
  fill(data, width, 2, 2, 5, 5, 255, 160, 0);
  fill(data, width, 3, 3, 4, 4, 8, 8, 8);
  fill(data, width, 3, 3, 3, 3, 252, 252, 252);

  keyStudioWhite(data, width, height);
  keyStudioBlack(data, width, height);

  assert.deepEqual(pixel(data, width, 1, 0), [0, 0, 0, 0]);
  assert.deepEqual(pixel(data, width, 2, 2), [255, 160, 0, 255]);
  assert.deepEqual(pixel(data, width, 4, 4), [8, 8, 8, 255]);
  assert.deepEqual(pixel(data, width, 3, 3), [252, 252, 252, 255]);
});
