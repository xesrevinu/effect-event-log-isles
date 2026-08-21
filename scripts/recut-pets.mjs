/**
 * Rebuild 145-frame / 13×12 pet sheets from the 6s 24fps 960 videos.
 * Extract at native size (do not scale to 480 first). Pack into 300px
 * cells so iPhone 3x only downscales. Keys the studio backdrop and
 * keeps every in-between in the same padded window.
 * Sheets ship as lossy WebP with alpha (~4-5x smaller than PNG on the wire;
 * decoded memory is handled at runtime by sheetMemoryScale + release).
 *
 *   node scripts/recut-pets.mjs [sourceDir]
 */
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { keyStudioBlack, keyStudioWhite } from "./pet-matte.mjs";

const exec = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const localSources = [join(root, "grok-final-pets-resources"), "/Users/kee/Downloads/final_pets"];
const sourceDir =
  process.argv[2] || localSources.find((dir) => existsSync(join(dir, "videos"))) || localSources[0];
const outDir = join(root, "public/pets");
const workDir = join(tmpdir(), "eventlog-pet-recut");

const SPECIES = [
  { id: "pip", color: "orange" },
  { id: "nub", color: "blue" },
  { id: "bean", color: "green" },
];
const CLIPS = [
  { id: "idle", file: "idle", fps: 16 },
  { id: "eat", file: "eat", fps: 20 },
  { id: "play", file: "happy", fps: 20 },
  { id: "sleep", file: "sleep", fps: 20 },
];

const COLS = 13;
const ROWS = 12;
const COUNT = 145;
const CELL = 300;
const EXTRACT = 960;

const MIME = { ".png": "image/png", ".json": "application/json" };

function startStatic(dir) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
      if (url === "/" || url === "") {
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end("<!doctype html><title>recut</title>");
        return;
      }
      const file = join(dir, url);
      if (!file.startsWith(dir) || !existsSync(file)) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("content-type", MIME[extname(file)] ?? "application/octet-stream");
      createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

async function extract(video, dest) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  await exec("ffmpeg", ["-y", "-i", video, join(dest, "%04d.png")]);
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.addInitScript({
  content: `globalThis.keyStudioWhite = ${keyStudioWhite.toString()}; globalThis.keyStudioBlack = ${keyStudioBlack.toString()};`,
});
const { server, origin } = await startStatic(workDir);
await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
const manifest = {};

mkdirSync(workDir, { recursive: true });

for (const species of SPECIES) {
  manifest[species.id] = {};
  mkdirSync(join(outDir, species.id), { recursive: true });
  for (const clip of CLIPS) {
    const video = join(sourceDir, "videos", `${species.color}_${clip.file}.mp4`);
    const framesDir = join(workDir, `${species.id}-${clip.id}`);
    process.stdout.write(`${species.id} ${clip.id} extract… `);
    await extract(video, framesDir);
    const packed = await page.evaluate(
      async ({ origin, folder, COUNT, COLS, ROWS, CELL, EXTRACT }) => {
        const load = async (i) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = `${origin}/${folder}/${String(i).padStart(4, "0")}.png`;
          await img.decode();
          return img;
        };

        const first = await load(1);
        const probe = document.createElement("canvas");
        probe.width = EXTRACT;
        probe.height = EXTRACT;
        const pctx = probe.getContext("2d", { willReadFrequently: true });

        const keyFrame = (img) => {
          pctx.clearRect(0, 0, EXTRACT, EXTRACT);
          pctx.drawImage(img, 0, 0);
          const pix = pctx.getImageData(0, 0, EXTRACT, EXTRACT);
          const d = pix.data;
          const nearEmpty = (x, y, radius) => {
            if (x < radius || y < radius || x >= EXTRACT - radius || y >= EXTRACT - radius)
              return true;
            for (let dy = -radius; dy <= radius; dy++) {
              for (let dx = -radius; dx <= radius; dx++) {
                if (d[((y + dy) * EXTRACT + (x + dx)) * 4 + 3] < 20) return true;
              }
            }
            return false;
          };
          globalThis.keyStudioWhite(d, EXTRACT, EXTRACT);
          globalThis.keyStudioBlack(d, EXTRACT, EXTRACT);
          for (let y = 0; y < EXTRACT; y++) {
            for (let x = 0; x < EXTRACT; x++) {
              const o = (y * EXTRACT + x) * 4;
              if (d[o + 3] < 16) continue;
              if (!nearEmpty(x, y, 2)) continue;
              const minC = Math.min(d[o], d[o + 1], d[o + 2]);
              if (minC <= 48) continue;
              d[o] = 0;
              d[o + 1] = 0;
              d[o + 2] = 0;
              d[o + 3] = 0;
            }
          }
          return pix;
        };

        const bboxOf = (pix) => {
          const d = pix.data;
          let x0 = EXTRACT;
          let y0 = EXTRACT;
          let x1 = 0;
          let y1 = 0;
          for (let y = 0; y < EXTRACT; y++) {
            for (let x = 0; x < EXTRACT; x++) {
              const a = d[(y * EXTRACT + x) * 4 + 3];
              const r = d[(y * EXTRACT + x) * 4];
              const g = d[(y * EXTRACT + x) * 4 + 1];
              const b = d[(y * EXTRACT + x) * 4 + 2];
              if (a < 28) continue;
              if (r + g + b < 36 && a > 200) continue;
              if (x < x0) x0 = x;
              if (y < y0) y0 = y;
              if (x > x1) x1 = x;
              if (y > y1) y1 = y;
            }
          }
          if (x1 < x0) return null;
          return { x0, y0, x1, y1 };
        };

        let union = null;
        const keyed = [];
        for (let i = 1; i <= COUNT; i++) {
          const img = i === 1 ? first : await load(i);
          const pix = keyFrame(img);
          keyed.push(pix);
          const box = bboxOf(pix);
          if (!box) continue;
          if (!union) union = { ...box };
          else {
            union.x0 = Math.min(union.x0, box.x0);
            union.y0 = Math.min(union.y0, box.y0);
            union.x1 = Math.max(union.x1, box.x1);
            union.y1 = Math.max(union.y1, box.y1);
          }
        }
        if (!union) throw new Error("no opaque pixels");

        const padX = Math.round((union.x1 - union.x0 + 1) * 0.14);
        const padTop = Math.round((union.y1 - union.y0 + 1) * 0.22);
        const padBot = Math.round((union.y1 - union.y0 + 1) * 0.1);
        const sx = Math.max(0, union.x0 - padX);
        const sy = Math.max(0, union.y0 - padTop);
        const sw = Math.min(EXTRACT, union.x1 + padX + 1) - sx;
        const sh = Math.min(EXTRACT, union.y1 + padBot + 1) - sy;

        const sheet = document.createElement("canvas");
        sheet.width = COLS * CELL;
        sheet.height = ROWS * CELL;
        const sctx = sheet.getContext("2d");
        sctx.clearRect(0, 0, sheet.width, sheet.height);

        const scratch = document.createElement("canvas");
        scratch.width = EXTRACT;
        scratch.height = EXTRACT;
        const xctx = scratch.getContext("2d");

        for (let i = 0; i < keyed.length; i++) {
          xctx.putImageData(keyed[i], 0, 0);
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const dest = Math.round(CELL * 0.7);
          const dx = col * CELL + Math.round((CELL - dest) / 2);
          const dy = row * CELL + (CELL - dest);
          sctx.drawImage(scratch, sx, sy, sw, sh, dx, dy, dest, dest);
        }

        return {
          union,
          window: { sx, sy, sw, sh },
          dataUrl: sheet.toDataURL("image/webp", 0.92),
        };
      },
      { origin, folder: `${species.id}-${clip.id}`, COUNT, COLS, ROWS, CELL, EXTRACT },
    );

    if (!packed.dataUrl.startsWith("data:image/webp;base64,")) {
      throw new Error("browser did not encode webp");
    }
    const dest = join(outDir, species.id, `${clip.id}.webp`);
    writeFileSync(
      dest,
      Buffer.from(packed.dataUrl.slice("data:image/webp;base64,".length), "base64"),
    );
    rmSync(join(outDir, species.id, `${clip.id}.png`), { force: true });
    manifest[species.id][clip.id] = { count: COUNT, fps: clip.fps, cols: COLS, rows: ROWS };
    console.log(`ok  window ${packed.window.sw}×${packed.window.sh}`);
    rmSync(framesDir, { recursive: true, force: true });
  }
}

writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
server.close();
await browser.close();
rmSync(workDir, { recursive: true, force: true });
console.log("wrote", join(outDir, "manifest.json"));
