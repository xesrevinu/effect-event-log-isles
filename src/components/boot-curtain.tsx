import { useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n-context";
import type { MessageKey } from "@/lib/i18n";

export type BootCurtainPhase = "rise" | "hold" | "exit";

const STEPS = [
  { key: "boot.chip.pip" as const, id: "pip", tone: "sun" },
  { key: "boot.chip.nub" as const, id: "nub", tone: "sky" },
  { key: "boot.chip.bean" as const, id: "bean", tone: "bean" },
  { key: "boot.chip.ashore" as const, id: "ashore", tone: "grape" },
] satisfies { key: MessageKey; id: string; tone: "sun" | "sky" | "bean" | "grape" }[];

const WAVE = "M16 86 C 74 22, 118 18, 156 58 S 228 112, 262 64 S 332 8, 384 48";
const BOX = { w: 400, h: 120 };
const SCALLOPS = 12;
const SCALLOP_R = 48;

function BootTrail() {
  return (
    <svg className="boot-curtain-trail" viewBox={`0 0 ${BOX.w} ${BOX.h}`} aria-hidden>
      <path className="boot-curtain-wave-back" d={WAVE} />
      <path className="boot-curtain-wave" pathLength={100} d={WAVE} />
      <g className="boot-curtain-ferry">
        <circle r="9" />
        <circle className="boot-curtain-ferry-eye" cx="-2.2" cy="-1.4" r="1.45" />
        <circle className="boot-curtain-ferry-eye" cx="2.6" cy="-1.4" r="1.45" />
      </g>
    </svg>
  );
}

function scallopPath(count: number, radius: number) {
  const width = count * radius * 2;
  const mid = radius;
  const bottom = radius * 2;
  let d = `M0 ${bottom} L0 ${mid}`;
  for (let i = 0; i < count; i++) {
    d += ` A${radius} ${radius} 0 0 1 ${(i + 1) * radius * 2} ${mid}`;
  }
  d += ` L${width} ${bottom} Z`;
  return { d, width, height: bottom };
}

export function BootCurtain({
  phase,
  step,
  onRiseEnd,
  onExitEnd,
}: {
  phase: BootCurtainPhase;
  step: number;
  onRiseEnd: () => void;
  onExitEnd: () => void;
}) {
  const { t } = useI18n();
  const uid = useId().replace(/:/g, "");
  const plus = `boot-plus-${uid}`;
  const lip = scallopPath(SCALLOPS, SCALLOP_R);
  const filled = Math.max(0, Math.min(STEPS.length, step));
  const ready = filled >= STEPS.length;

  const node = (
    <div className="boot-curtain" role="status" aria-live="polite" aria-busy={phase !== "exit"}>
      <div
        className={cn(
          "boot-curtain-panel",
          phase === "rise" && "boot-curtain-rise",
          phase === "hold" && "boot-curtain-hold",
          phase === "exit" && "boot-curtain-exit",
        )}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.animationName === "boot-curtain-rise") onRiseEnd();
          if (event.animationName === "boot-curtain-exit") onExitEnd();
        }}
      >
        <svg
          className="boot-curtain-lip"
          viewBox={`0 0 ${lip.width} ${lip.height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={lip.d} className="boot-curtain-lip-shadow" />
          <path d={lip.d} />
        </svg>
        <div className="boot-curtain-body">
          <svg className="boot-curtain-tex" aria-hidden>
            <defs>
              <pattern id={plus} width="148" height="148" patternUnits="userSpaceOnUse">
                <path
                  d="M76 68v-10h-4v10h-10v4h10v10h4v-10h10v-4h-10z"
                  fill="currentColor"
                />
              </pattern>
            </defs>
            <rect className="boot-curtain-tex-plus" width="200%" height="200%" fill={`url(#${plus})`} />
          </svg>
          <div className="boot-curtain-wash" />
          <div className="boot-curtain-sheen" />
          <div className={cn("boot-curtain-hud", phase !== "rise" && "boot-curtain-hud-on")}>
            <p className="boot-curtain-kicker">EventLog</p>
            <p className="boot-curtain-title">
              <span className={cn(!ready && "is-current")}>{t("boot.lift")}</span>
              <span className={cn(ready && "is-current")}>{t("boot.ready")}</span>
            </p>
            <BootTrail />
            <div className="boot-curtain-steps">
              {STEPS.map((item, index) => (
                <span
                  key={item.id}
                  style={{ ["--i" as string]: index }}
                  className={cn("boot-curtain-step", `tone-${item.tone}`, index < filled && "on")}
                >
                  <i />
                  {t(item.key)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
