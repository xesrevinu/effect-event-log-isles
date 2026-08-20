import { useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/fx";
import { clipEnded, decodePetSheet, frameIndex, peekPetSheet, sheetDrawRect, sheetSourceRect } from "@/lib/png-sequence";

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

    let source: HTMLImageElement | undefined;
    let raf = 0;
    let start = 0;
    let last = -1;
    let alive = true;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const css = canvas.clientWidth || 56;
      const size = Math.max(1, Math.round(css * dpr));
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
    };

    const paint = (index: number) => {
      if (!source?.naturalWidth) return;
      fit();
      const cell = sheetSourceRect(index, cols, rows, source.naturalWidth, source.naturalHeight);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (cell.sw > 0 && cell.sh > 0) {
        const dest = sheetDrawRect(canvas.width, canvas.height);
        ctx.drawImage(source, cell.sx, cell.sy, cell.sw, cell.sh, dest.dx, dest.dy, dest.dw, dest.dh);
      }
    };

    const tick = (now: number) => {
      if (!alive) return;
      if (!start) start = now;
      const elapsed = now - start;
      const hold = prefersReducedMotion() || !playing;
      const index = hold ? 0 : frameIndex(elapsed, fps, count, loop);
      if (index !== last) {
        last = index;
        paint(index);
      }
      if (!hold && clipEnded(elapsed, fps, count, loop)) {
        ended.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const boot = (img: HTMLImageElement) => {
      if (!alive) return;
      source = img;
      paint(0);
      if (prefersReducedMotion() && !loop) {
        ended.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const cached = peekPetSheet(sheet);
    if (cached) boot(cached);
    else void decodePetSheet(sheet).then(boot, () => undefined);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
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
