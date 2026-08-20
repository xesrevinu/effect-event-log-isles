import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/fx";

const HERO_W = 1792;
const HERO_H = 1008;
const HERO_IMG = "/hero.jpg";
const HERO_VID = "/hero.mp4";

const FRAME =
  "aspect-16/9 block h-auto w-full max-h-[min(58vh,58vw)] object-cover object-[center_18%]";

/**
 * Boot hero: the still is the LCP paint. Video is armed only after that
 * image is on screen, then fades in over the same 16:9 box. If the file
 * never plays (slow net, autoplay block, reduced motion), the photo stays.
 */
export function HeroMedia() {
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [posterReady, setPosterReady] = useState(false);
  const [armed, setArmed] = useState(false);
  const [live, setLive] = useState(false);

  const markPoster = useCallback(() => {
    setPosterReady(true);
  }, []);

  useEffect(() => {
    if (imgRef.current?.complete) setPosterReady(true);
  }, []);

  useEffect(() => {
    if (!posterReady || prefersReducedMotion()) return;

    const arm = () => setArmed(true);
    if (typeof window.requestIdleCallback === "function") {
      const idle = window.requestIdleCallback(arm, { timeout: 400 });
      return () => window.cancelIdleCallback(idle);
    }
    const t = window.setTimeout(arm, 0);
    return () => window.clearTimeout(t);
  }, [posterReady]);

  useEffect(() => {
    if (!armed) return;
    const video = videoRef.current;
    if (!video) return;

    const show = () => setLive(true);
    const hide = () => setLive(false);
    const tryPlay = () => {
      void video.play().catch(() => {
        setLive(false);
      });
    };

    video.addEventListener("playing", show);
    video.addEventListener("error", hide);
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) tryPlay();
    else video.addEventListener("canplay", tryPlay, { once: true });

    return () => {
      video.removeEventListener("playing", show);
      video.removeEventListener("error", hide);
      video.removeEventListener("canplay", tryPlay);
    };
  }, [armed]);

  return (
    <div className="relative [mask-image:linear-gradient(to_bottom,#000_74%,transparent)]">
      <img
        ref={imgRef}
        src={HERO_IMG}
        alt="EventLog Isles"
        width={HERO_W}
        height={HERO_H}
        fetchPriority="high"
        decoding="async"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        onLoad={markPoster}
        className={FRAME}
      />
      {armed ? (
        <video
          ref={videoRef}
          src={HERO_VID}
          width={HERO_W}
          height={HERO_H}
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback"
          aria-hidden
          tabIndex={-1}
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
          className={cn(
            "pointer-events-none absolute inset-0 size-full object-cover object-[center_18%] transition-opacity duration-500",
            live ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </div>
  );
}
