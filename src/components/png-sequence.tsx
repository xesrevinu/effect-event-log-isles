import { useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/fx";
import {
  canvasBackingSize,
  clipEnded,
  decodePetSheet,
  frameIndex,
  peekPetSheet,
  sheetDrawRect,
  sheetSourceRect,
  type PetSheet,
} from "@/lib/png-sequence";

/**
 * One shared rAF drives every sprite canvas. Up to 7 sprites are live during
 * play; per-instance loops each wake the main thread every vsync for clips
 * that only change 10-24 times a second.
 */
type Tick = (now: number) => void;
const ticks = new Set<Tick>();
let sharedRaf = 0;

function pump(now: number) {
  for (const tick of ticks) tick(now);
  sharedRaf = ticks.size > 0 ? requestAnimationFrame(pump) : 0;
}

function addTick(tick: Tick) {
  ticks.add(tick);
  if (!sharedRaf) sharedRaf = requestAnimationFrame(pump);
  return () => {
    ticks.delete(tick);
    if (ticks.size === 0 && sharedRaf) {
      cancelAnimationFrame(sharedRaf);
      sharedRaf = 0;
    }
  };
}

export function PngSequence({
  sheet,
  cols,
  rows,
  count,
  fps,
  loop,
  playing = true,
  alt,
  onEnded,
}: {
  sheet: string;
  cols: number;
  rows: number;
  count: number;
  fps: number;
  loop: boolean;
  playing?: boolean;
  alt: string;
  onEnded?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ended = useRef(onEnded);
  ended.current = onEnded;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let sheetData: PetSheet | undefined;
    let stop: (() => void) | undefined;
    let start = 0;
    let last = -1;
    let alive = true;
    // CSS size is cached from the ResizeObserver so paint() never reads
    // clientWidth in the hot path (a forced-layout read per frame otherwise).
    let cssSize = canvas.clientWidth;

    const fit = () => {
      const size = canvasBackingSize(cssSize, window.devicePixelRatio || 1);
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
    };

    const paint = (index: number) => {
      if (!sheetData || sheetData.width <= 0) return;
      last = index;
      fit();
      const cell = sheetSourceRect(index, cols, rows, sheetData.width, sheetData.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (cell.sw > 0 && cell.sh > 0) {
        const dest = sheetDrawRect(canvas.width, canvas.height);
        const scale = dest.dw / cell.sw;
        ctx.imageSmoothingEnabled = scale < 0.98;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(sheetData.source, cell.sx, cell.sy, cell.sw, cell.sh, dest.dx, dest.dy, dest.dw, dest.dh);
      }
    };

    const tick = (now: number) => {
      if (!alive) return;
      if (!start) start = now;
      const elapsed = now - start;
      const hold = prefersReducedMotion() || !playing;
      const index = hold ? 0 : frameIndex(elapsed, fps, count, loop);
      if (index !== last) paint(index);
      if (!hold && clipEnded(elapsed, fps, count, loop)) {
        stop?.();
        stop = undefined;
        ended.current?.();
      }
    };

    const boot = (loaded: PetSheet) => {
      if (!alive) return;
      sheetData = loaded;
      paint(0);
      if (prefersReducedMotion() && !loop) {
        ended.current?.();
        return;
      }
      stop = addTick(tick);
    };

    const cached = peekPetSheet(sheet);
    if (cached) boot(cached);
    else void decodePetSheet(sheet).then(boot, () => undefined);

    const refit = () => {
      cssSize = canvas.clientWidth;
      if (last >= 0) paint(last);
      else fit();
    };
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      cssSize = box ? box.width : canvas.clientWidth;
      if (last >= 0) paint(last);
      else fit();
    });
    ro.observe(canvas);
    window.addEventListener("resize", refit);

    return () => {
      alive = false;
      stop?.();
      ro.disconnect();
      window.removeEventListener("resize", refit);
    };
  }, [sheet, cols, rows, count, fps, loop, playing]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className="pointer-events-none block size-full"
    />
  );
}
