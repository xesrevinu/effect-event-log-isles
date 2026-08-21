/**
 * Pet clips rebuilt from the 6s / 24fps 960×960 videos.
 *
 *   public/pets/{pip|nub|bean}/{idle|eat|play|sleep}.png
 *   public/pets/manifest.json
 *
 * Cells must be ≥ iPhone 3x dest (~298px) so the runtime only downscales.
 * Idle loops a little slower than source; eat/play/sleep play once.
 */
import type { EventTag, Species } from "@/lib/critter-sim";

export const PET_CLIPS = ["idle", "eat", "play", "sleep"] as const;
export type PetClipId = (typeof PET_CLIPS)[number];

export type ClipWindow = { sx: number; sy: number; sw: number; sh: number };

export type ClipSpec = {
  count: number;
  fps: number;
  loop: boolean;
  pad?: number;
  sheet?: string;
  cols?: number;
  rows?: number;
  video?: string;
  window?: ClipWindow;
};

export type PetsManifest = Partial<Record<Species, Partial<Record<PetClipId, ClipSpec>>>>;

const CLIPS = new Set<PetClipId>(PET_CLIPS);
export const PET_SPECIES = ["pip", "nub", "bean"] as const satisfies readonly Species[];
const SPECIES = new Set<Species>(PET_SPECIES);

export function frameIndex(elapsedMs: number, fps: number, count: number, loop: boolean) {
  if (count <= 1) return 0;
  const raw = Math.floor((Math.max(0, elapsedMs) / 1000) * fps);
  return loop ? raw % count : Math.min(raw, count - 1);
}

export function clipEnded(elapsedMs: number, fps: number, count: number, loop: boolean) {
  if (loop || count <= 1 || fps <= 0) return false;
  return elapsedMs >= (count / fps) * 1000;
}

export function frameSrc(dir: string, index: number, pad = 2) {
  return `${dir}/${String(index).padStart(pad, "0")}.png`;
}

export function clipDir(species: Species, clip: PetClipId) {
  return `/pets/${species}/${clip}`;
}

export function clipFrames(species: Species, clip: PetClipId, spec: ClipSpec) {
  const pad = spec.pad ?? 2;
  const dir = clipDir(species, clip);
  return Array.from({ length: spec.count }, (_, i) => frameSrc(dir, i, pad));
}

export function clipSheet(species: Species, clip: PetClipId, spec?: ClipSpec) {
  return spec?.sheet ?? `/pets/${species}/${clip}.webp`;
}

export function allPetSheetUrls(manifest?: PetsManifest | null) {
  return PET_SPECIES.flatMap((species) =>
    PET_CLIPS.map((clip) =>
      clipSheet(species, clip, clipSpec(manifest, species, clip) ?? undefined),
    ),
  );
}

export function allPetIdleSheetUrls(manifest?: PetsManifest | null) {
  return PET_SPECIES.map((species) =>
    clipSheet(species, "idle", clipSpec(manifest, species, "idle") ?? undefined),
  );
}

/** A decoded sheet, possibly downscaled to this device's pixel budget. */
export type PetSheet = { source: CanvasImageSource; width: number; height: number };

const decodedSheets = new Map<string, PetSheet>();
const decodingSheets = new Map<string, Promise<PetSheet>>();

export function resetPetSheetCache() {
  decodedSheets.clear();
  decodingSheets.clear();
}

export function peekPetSheet(src: string) {
  return decodedSheets.get(src);
}

/**
 * Drop a decoded sheet (e.g. a finished one-shot). In-flight animations keep
 * their own reference; this only frees the cache so memory can be reclaimed.
 */
export function releasePetSheet(src: string) {
  decodedSheets.delete(src);
}

/**
 * Raw sheets carry 300px cells (iPhone 3x budget). On lower-DPR screens the
 * whole sheet is downscaled ONCE here, so per-frame draws stay ~1:1 and a 2x
 * desktop keeps less than half the bitmap memory in the cache.
 */
export function sheetMemoryScale(dpr: number, cell = SPRITE_SHEET_CELL) {
  const dest = spriteDestSize(SPRITE_HATCH_CSS, dpr);
  const ratio = dest / cell;
  return ratio >= 0.95 ? 1 : Math.max(0.2, ratio);
}

function shrinkSheet(img: HTMLImageElement, scale: number): PetSheet {
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return { source: canvas, width, height };
}

export function decodePetSheet(src: string): Promise<PetSheet> {
  const ready = decodedSheets.get(src);
  if (ready) return Promise.resolve(ready);
  const pending = decodingSheets.get(src);
  if (pending) return pending;
  if (typeof Image === "undefined") {
    return Promise.reject(new Error("no Image"));
  }
  const next = new Promise<PetSheet>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const scale = sheetMemoryScale(window.devicePixelRatio || 1);
      const sheet =
        scale < 1
          ? shrinkSheet(img, scale)
          : { source: img, width: img.naturalWidth, height: img.naturalHeight };
      decodedSheets.set(src, sheet);
      decodingSheets.delete(src);
      resolve(sheet);
    };
    img.onerror = () => {
      decodingSheets.delete(src);
      reject(new Error(`sheet ${src}`));
    };
    img.src = src;
  });
  decodingSheets.set(src, next);
  return next;
}

export async function preloadPetAssets() {
  const manifest = await loadPetsManifest();
  await Promise.all(
    allPetIdleSheetUrls(manifest).map((src) => decodePetSheet(src).catch(() => undefined)),
  );
  return manifest;
}

export function sheetCell(index: number, cols: number) {
  const col = ((index % cols) + cols) % cols;
  return { col, row: Math.floor(index / cols) };
}

/** Sheets already leave jump headroom; only a light inset at draw time. */
export const SPRITE_DRAW_SCALE = 0.92;
/** CSS box multiplier. Must size the canvas to this box — do not CSS-scale the bitmap. */
export const SPRITE_VIEW_SCALE = 1.5;
/** Hatch dock layout box (4.5rem). Peak display size on iPhone. */
export const SPRITE_HATCH_CSS = 72;
/** Packed cell edge. Must cover iPhone 3x dest (~298). */
export const SPRITE_SHEET_CELL = 300;

/** Backing store for a square sprite canvas. Uses the visible CSS box, not a later transform. */
export function canvasBackingSize(cssPx: number, dpr: number) {
  const css = Number.isFinite(cssPx) && cssPx > 0 ? cssPx : 56;
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.max(1, Math.round(css * ratio));
}

/** Device-pixel dest for one cell after view + draw scale. */
export function spriteDestSize(
  layoutCss: number,
  dpr: number,
  drawScale = SPRITE_DRAW_SCALE,
  viewScale = SPRITE_VIEW_SCALE,
) {
  const backing = canvasBackingSize(layoutCss * viewScale, dpr);
  const s = Math.min(1, Math.max(0.05, drawScale));
  return backing * s;
}

export function asClipWindow(raw: unknown): ClipWindow | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const rec = raw as Record<string, unknown>;
  const sx = Number(rec.sx);
  const sy = Number(rec.sy);
  const sw = Number(rec.sw);
  const sh = Number(rec.sh);
  if (![sx, sy, sw, sh].every((n) => Number.isFinite(n))) return undefined;
  if (sx < 0 || sy < 0 || sw <= 0 || sh <= 0) return undefined;
  return { sx, sy, sw, sh };
}

function clamp8(n: number) {
  return n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
}

function isPale(r: number, g: number, b: number) {
  const lum = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return lum > 168 && sat < 64;
}

/**
 * Sheets were keyed off white, so silhouettes keep a light halo.
 * Un-mattes partial pixels and knocks down pale edge leftovers.
 */
export function defringeRgba(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  cellW = 0,
  cellH = 0,
) {
  const n = width * height;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const a = data[o + 3];
    if (a === 0) {
      data[o] = 0;
      data[o + 1] = 0;
      data[o + 2] = 0;
      continue;
    }
    if (a === 255) continue;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const af = a / 255;
    data[o] = clamp8((r - 255 * (1 - af)) / af);
    data[o + 1] = clamp8((g - 255 * (1 - af)) / af);
    data[o + 2] = clamp8((b - 255 * (1 - af)) / af);
    if (isPale(r, g, b)) {
      const t = Math.min(1, ((r + g + b) / 3 - 186) / 50);
      data[o + 3] = Math.round(a * (1 - t * 0.88));
    }
  }

  const markPaleEdge = (clearAt: number) => {
    const paleEdge: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * 4;
        if (data[o + 3] < 200) continue;
        if (!isPale(data[o], data[o + 1], data[o + 2])) continue;
        const onCellRim =
          cellW > 0 &&
          cellH > 0 &&
          (x % cellW < 1.5 ||
            x % cellW >= cellW - 1.5 ||
            y % cellH < 1.5 ||
            y % cellH >= cellH - 1.5);
        let nearClear = onCellRim;
        for (let dy = -2; dy <= 2 && !nearClear; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              nearClear = true;
              break;
            }
            if (data[(ny * width + nx) * 4 + 3] < clearAt) {
              nearClear = true;
              break;
            }
          }
        }
        if (nearClear) paleEdge.push(o);
      }
    }
    for (const o of paleEdge) {
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const af = 0.4;
      data[o] = clamp8((r - 255 * (1 - af)) / af);
      data[o + 1] = clamp8((g - 255 * (1 - af)) / af);
      data[o + 2] = clamp8((b - 255 * (1 - af)) / af);
      data[o + 3] = 0;
    }
  };
  markPaleEdge(28);
  markPaleEdge(80);
}

export function sheetDrawRect(canvasW: number, canvasH: number, scale = SPRITE_DRAW_SCALE) {
  const s = Math.min(1, Math.max(0.05, scale));
  const dw = canvasW * s;
  const dh = canvasH * s;
  return {
    dx: (canvasW - dw) / 2,
    dy: canvasH - dh,
    dw,
    dh,
  };
}

export function sheetSourceRect(
  index: number,
  cols: number,
  rows: number,
  width: number,
  height: number,
  inset = 0,
) {
  const { col, row } = sheetCell(index, cols);
  const cellW = width / Math.max(1, cols);
  const cellH = height / Math.max(1, rows);
  const pad = Math.max(0, inset);
  return {
    sx: col * cellW + pad,
    sy: row * cellH + pad,
    sw: Math.max(0, cellW - pad * 2),
    sh: Math.max(0, cellH - pad * 2),
  };
}

export function clipForEvent(event?: EventTag): PetClipId {
  if (event === "Fed") return "eat";
  if (event === "Played") return "play";
  if (event === "Slept") return "sleep";
  return "idle";
}

export const ROAM_CLIPS = ["eat", "play", "sleep"] as const;

export function unitRoll(roll: number) {
  const n = Number.isFinite(roll) ? roll : 0;
  return ((n % 1) + 1) % 1;
}

export function nextRoamClip(roll: number): PetClipId {
  return ROAM_CLIPS[Math.floor(unitRoll(roll) * ROAM_CLIPS.length)] ?? "eat";
}

export function roamIdleMs(roll: number, species?: Species) {
  const stagger = species === "nub" ? 1600 : species === "bean" ? 3200 : 0;
  return 3200 + stagger + Math.floor(unitRoll(roll) * 5000);
}

export function clipSpec(
  manifest: PetsManifest | null | undefined,
  species: Species,
  clip: PetClipId,
) {
  const spec = manifest?.[species]?.[clip];
  if (!spec) return null;
  if (spec.video !== undefined) return spec;
  if (spec.count <= 0 || spec.fps <= 0) return null;
  return spec;
}

function asClipSpec(raw: unknown, clip: PetClipId): ClipSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const hasVideo = rec.video === true || (typeof rec.video === "string" && rec.video.length > 0);
  const count = Number(rec.count ?? (hasVideo ? 1 : 0));
  const fps = Number(rec.fps ?? (hasVideo ? 24 : 10));
  if (!Number.isFinite(count) || count <= 0) return null;
  if (!Number.isFinite(fps) || fps <= 0) return null;
  const pad = rec.pad === undefined ? undefined : Number(rec.pad);
  const cols = rec.cols === undefined ? undefined : Number(rec.cols);
  const rows = rec.rows === undefined ? undefined : Number(rec.rows);
  const sheet = typeof rec.sheet === "string" && rec.sheet ? rec.sheet : undefined;
  const video = typeof rec.video === "string" && rec.video ? rec.video : hasVideo ? "" : undefined;
  const crop = asClipWindow(rec.window);
  return {
    count: Math.floor(count),
    fps,
    loop: rec.loop === undefined ? clip === "idle" : Boolean(rec.loop),
    ...(pad && Number.isFinite(pad) && pad > 0 ? { pad: Math.floor(pad) } : {}),
    ...(sheet ? { sheet } : {}),
    ...(video !== undefined ? { video } : {}),
    ...(crop ? { window: crop } : {}),
    ...(cols && Number.isFinite(cols) && cols > 0 ? { cols: Math.floor(cols) } : {}),
    ...(rows && Number.isFinite(rows) && rows > 0 ? { rows: Math.floor(rows) } : {}),
  };
}

export function isSheet(spec: ClipSpec) {
  return spec.video === undefined && Boolean(spec.sheet || spec.cols || spec.rows);
}

export function isVideo(spec: ClipSpec) {
  return spec.video !== undefined;
}

export function clipVideo(species: Species, clip: PetClipId, spec: ClipSpec) {
  return spec.video || `/pets/${species}/${clip}.mp4`;
}

export function clipPoster(species: Species, clip: PetClipId) {
  return `/pets/${species}/${clip}.jpg`;
}

export function parsePetsManifest(raw: unknown): PetsManifest | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: PetsManifest = {};
  for (const [species, clips] of Object.entries(raw as Record<string, unknown>)) {
    if (!SPECIES.has(species as Species) || !clips || typeof clips !== "object") continue;
    const row: Partial<Record<PetClipId, ClipSpec>> = {};
    for (const [clip, spec] of Object.entries(clips as Record<string, unknown>)) {
      if (!CLIPS.has(clip as PetClipId)) continue;
      const parsed = asClipSpec(spec, clip as PetClipId);
      if (parsed) row[clip as PetClipId] = parsed;
    }
    if (Object.keys(row).length > 0) out[species as Species] = row;
  }
  return Object.keys(out).length > 0 ? out : {};
}

let cached: Promise<PetsManifest | null> | undefined;

export function resetPetsManifestCache() {
  cached = undefined;
}

export function loadPetsManifest(): Promise<PetsManifest | null> {
  if (typeof fetch !== "function") return Promise.resolve(null);
  cached ??= fetch("/pets/manifest.json")
    .then(async (res) => {
      if (!res.ok) return null;
      return parsePetsManifest(await res.json());
    })
    .catch(() => null);
  return cached;
}
