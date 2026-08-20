/**
 * Pet clips rebuilt from the 6s / 24fps source videos (all 145 in-betweens).
 *
 *   public/pets/{pip|nub|bean}/{idle|eat|play|sleep}.png
 *   public/pets/manifest.json
 *
 * The 16-frame preview strips are not used: they sample the same 6s
 * performance, so 10–12fps playback is ~4.5× fast-forward.
 * Idle loops a little slower than source; eat/play/sleep play once.
 */
import type { EventTag, Species } from "@/lib/critter-sim";

export const PET_CLIPS = ["idle", "eat", "play", "sleep"] as const;
export type PetClipId = (typeof PET_CLIPS)[number];

export type ClipSpec = {
  count: number;
  fps: number;
  loop: boolean;
  pad?: number;
  sheet?: string;
  cols?: number;
  rows?: number;
  video?: string;
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
  return spec?.sheet ?? `/pets/${species}/${clip}.png`;
}

export function allPetSheetUrls(manifest?: PetsManifest | null) {
  return PET_SPECIES.flatMap((species) =>
    PET_CLIPS.map((clip) =>
      clipSheet(species, clip, clipSpec(manifest, species, clip) ?? undefined),
    ),
  );
}

const decodedSheets = new Map<string, HTMLImageElement>();
const decodingSheets = new Map<string, Promise<HTMLImageElement>>();

export function resetPetSheetCache() {
  decodedSheets.clear();
  decodingSheets.clear();
}

export function peekPetSheet(src: string) {
  return decodedSheets.get(src);
}

export function decodePetSheet(src: string): Promise<HTMLImageElement> {
  const ready = decodedSheets.get(src);
  if (ready) return Promise.resolve(ready);
  const pending = decodingSheets.get(src);
  if (pending) return pending;
  if (typeof Image === "undefined") {
    return Promise.reject(new Error("no Image"));
  }
  const next = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      decodedSheets.set(src, img);
      decodingSheets.delete(src);
      resolve(img);
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
  const urls = allPetSheetUrls(manifest);
  const idle = urls.filter((src) => src.endsWith("/idle.png"));
  const rest = urls.filter((src) => !src.endsWith("/idle.png"));
  await Promise.all(idle.map((src) => decodePetSheet(src).catch(() => undefined)));
  await Promise.all(rest.map((src) => decodePetSheet(src).catch(() => undefined)));
  return manifest;
}

export function sheetCell(index: number, cols: number) {
  const col = ((index % cols) + cols) % cols;
  return { col, row: Math.floor(index / cols) };
}

/** Sheets already leave jump headroom; only a light inset at draw time. */
export const SPRITE_DRAW_SCALE = 0.92;
/** View-only bump so the recut reads a bit larger without recropping. */
export const SPRITE_VIEW_SCALE = 1.5;

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
  return {
    count: Math.floor(count),
    fps,
    loop: rec.loop === undefined ? clip === "idle" : Boolean(rec.loop),
    ...(pad && Number.isFinite(pad) && pad > 0 ? { pad: Math.floor(pad) } : {}),
    ...(sheet ? { sheet } : {}),
    ...(video !== undefined ? { video } : {}),
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
