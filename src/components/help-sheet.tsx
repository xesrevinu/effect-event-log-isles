import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-context";
import type { MessageKey } from "@/lib/i18n";
import { Button, Segmented } from "@/components/ui";
import { HelpText, TsCode } from "@/components/ts-code";
import { cn } from "@/lib/cn";

type Tab = "effect" | "log";
type PathStep = 0 | 1 | 2 | 3;

const FX_CARDS: { k: MessageKey; v: MessageKey }[] = [
  { k: "help.fx.1.k", v: "help.fx.1.v" },
  { k: "help.fx.2.k", v: "help.fx.2.v" },
  { k: "help.fx.3.k", v: "help.fx.3.v" },
];

const PATH_COPY = {
  ok: ["help.path.0.v", "help.path.1.v", "help.path.2.ok", "help.path.3.ok"],
  no: ["help.path.0.v", "help.path.1.v", "help.path.2.no", "help.path.3.no"],
} as const;

const PATH_CODE: Record<PathStep, string | null> = {
  0: `client("Hatched", { species: "pip" })`,
  1: `tag: "Hatched"
primaryKey: (p) => p.id`,
  2: null,
  3: null,
};

const BEATS: { k: MessageKey; v: MessageKey; code?: string }[] = [
  { k: "help.1.k", v: "help.1.v", code: `client("Hatched", { species: "pip" })` },
  { k: "help.2.k", v: "help.2.v" },
  { k: "help.3.k", v: "help.3.v" },
  { k: "help.4.k", v: "help.4.v" },
  { k: "help.5.k", v: "help.5.v", code: `primaryKey: (p) => p.id` },
  { k: "help.6.k", v: "help.6.v" },
];

function EffectMark() {
  const { t } = useI18n();
  const slots = [
    {
      name: "Success",
      gloss: t("help.fx.slot.success"),
      skin: "help-slot-ok",
      tone: "text-accent-deep",
    },
    { name: "Error", gloss: t("help.fx.slot.error"), skin: "help-slot-no", tone: "text-danger" },
    {
      name: "Requirements",
      gloss: t("help.fx.slot.needs"),
      skin: "help-slot-need",
      tone: "text-sky-deep",
    },
  ] as const;
  return (
    <div className="help-paper px-4 py-3.5">
      <p className="help-effect-name">Effect</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((slot) => (
          <div key={slot.name} className={cn("help-slot", slot.skin)}>
            <p
              className={cn(
                "font-display text-[1.05rem] leading-tight font-semibold tracking-tight",
                slot.tone,
              )}
            >
              {slot.name}
            </p>
            <p className="mt-0.5 text-[11px] font-black tracking-wide text-subtle">{slot.gloss}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FxNotes() {
  const { t } = useI18n();
  return (
    <>
      {FX_CARDS.map((card, i) => (
        <section
          key={card.k}
          className={cn(
            "help-paper px-4 py-3.5",
            i === 1 && "rotate-[0.4deg]",
            i === 2 && "-rotate-[0.35deg]",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="help-sticker mt-0.5 shrink-0">{i + 1}</span>
            <div className="min-w-0">
              <p className="font-display text-[1.2rem] leading-snug font-semibold tracking-tight text-fg">
                {t(card.k)}
              </p>
              <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-muted">
                <HelpText text={t(card.v)} />
              </p>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

function RayScene() {
  return (
    <svg className="ray-scene" viewBox="0 0 280 92" aria-hidden>
      <ellipse className="ray-ground" cx="140" cy="82" rx="118" ry="8" />
      <g className="ray-blob ray-blob-a">
        <circle cx="58" cy="54" r="22" fill="#ffc800" />
        <circle cx="51" cy="50" r="2.2" fill="#3b2a14" />
        <circle cx="65" cy="50" r="2.2" fill="#3b2a14" />
        <path
          d="M52 60c3 3 9 3 12 0"
          fill="none"
          stroke="#3b2a14"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="46" cy="58" rx="3.2" ry="2" fill="#ff8aa0" />
        <ellipse cx="70" cy="58" rx="3.2" ry="2" fill="#ff8aa0" />
      </g>
      <g className="ray-blob ray-blob-b">
        <circle cx="222" cy="54" r="22" fill="#ce82ff" />
        <circle cx="215" cy="50" r="2.2" fill="#3b2a14" />
        <circle cx="229" cy="50" r="2.2" fill="#3b2a14" />
        <path
          d="M216 60c3 3 9 3 12 0"
          fill="none"
          stroke="#3b2a14"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="210" cy="58" rx="3.2" ry="2" fill="#ff8aa0" />
        <ellipse cx="234" cy="58" rx="3.2" ry="2" fill="#ff8aa0" />
      </g>
      <g className="ray-heart">
        <path
          d="M140 44c-1.4-8-10-10-14-5-4 5 1.4 12 14 20 12.6-8 18-15 14-20-4-5-12.6-3-14 5z"
          fill="#ff4b4b"
        />
      </g>
      <g className="ray-spark ray-spark-1" fill="#ffe27a">
        <path d="M96 22l1.6 4.4L102 28l-4.4 1.6L96 34l-1.6-4.4L90 28l4.4-1.6z" />
      </g>
      <g className="ray-spark ray-spark-2" fill="#fffdf6">
        <path d="M184 18l1.2 3.2L188.4 22.4 185.2 24 184 27.2 182.8 24 179.6 22.4 183 21.2z" />
      </g>
      <g className="ray-letter">
        <rect
          x="126"
          y="8"
          width="28"
          height="18"
          rx="3"
          fill="#fffdf6"
          stroke="#3b2a14"
          strokeWidth="1.6"
        />
        <path d="M126 10l14 9 14-9" fill="none" stroke="#3b2a14" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

function RayPostcard() {
  const { t } = useI18n();
  return (
    <section className="ray-card">
      <RayScene />
      <p className="text-xl font-black leading-snug text-fg">{t("help.ray.k")}</p>
      <p className="mt-2 text-base font-semibold leading-relaxed text-muted">
        <HelpText text={t("help.ray.v")} />
      </p>
      <a href="https://x.com/xesrevinu" target="_blank" rel="noreferrer" className="ray-nudge">
        <img src="/icons/nudge-ray.webp" alt="" className="ray-nudge-phone" />
        <span className="ray-nudge-label chunk chunk-sm tex-grain">{t("help.ray.cta")}</span>
      </a>
    </section>
  );
}

function WritePath() {
  const { t } = useI18n();
  const [step, setStep] = useState<PathStep>(3);
  const [ok, setOk] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timers = [0, 1, 2, 3].map((n) =>
      window.setTimeout(() => {
        setStep(n as PathStep);
        if (n === 3) setPlaying(false);
      }, n * 560),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [playing]);

  const snippet = PATH_CODE[step];
  const journalDead = !ok && step >= 2;

  return (
    <section className="help-paper flex flex-col gap-3 p-4">
      <div>
        <p className="font-display text-lg font-semibold tracking-tight text-fg">
          {t("help.path.title")}
        </p>
        <p className="mt-1 text-sm font-semibold text-muted">
          <HelpText text={t("help.path.hint")} />
        </p>
      </div>
      <div className="grid grid-cols-2 items-stretch gap-2.5">
        <div
          className={cn(
            "help-tile flex min-h-[5.5rem] items-center gap-2.5 px-3 py-3",
            ok && "help-tile-sun",
          )}
        >
          <img
            src="/isles/sun.webp"
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-black leading-none text-muted">{t("help.path.isle")}</p>
            <p className="mt-1.5 text-sm font-black leading-snug">
              {t(ok ? "help.path.isle.ok" : "help.path.isle.no")}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "help-tile flex min-h-[5.5rem] items-center px-3 py-3",
            !ok && "help-tile-no",
          )}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-black leading-none text-muted">{t("help.path.book")}</p>
            <p className={cn("mt-1.5 text-sm font-black leading-snug", !ok && "text-danger")}>
              {t(ok ? "help.path.book.ok" : "help.path.book.no")}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          aria-pressed={ok}
          onClick={() => {
            setOk(true);
            setStep(3);
            setPlaying(false);
          }}
          className={cn("help-choice", ok && "help-choice-on")}
        >
          {t("help.path.ok")}
        </button>
        <button
          type="button"
          aria-pressed={!ok}
          onClick={() => {
            setOk(false);
            setStep(2);
            setPlaying(false);
          }}
          className={cn("help-choice", !ok && "help-choice-warn")}
        >
          {t("help.path.no")}
        </button>
      </div>
      <ol className="flex items-center">
        {([0, 1, 2, 3] as const).map((i) => {
          const here = step === i;
          const done = step > i;
          const dead = journalDead && i === 3;
          return (
            <li key={i} className="flex min-w-0 flex-1 items-center">
              {i > 0 ? (
                <span
                  className={cn(
                    "mx-0.5 h-[3px] w-2 shrink-0 rounded-full",
                    dead ? "bg-danger" : done || here ? "bg-accent" : "bg-faint",
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setStep(i);
                }}
                className={cn(
                  "help-step sm:text-[11px]",
                  dead && "help-step-dead",
                  here && !dead && "help-step-on",
                  done && !here && !dead && "help-step-done",
                )}
              >
                {t(`help.path.${i}.k` as MessageKey)}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-sm font-semibold leading-snug text-fg">
        <HelpText text={t(PATH_COPY[ok ? "ok" : "no"][step])} />
      </p>
      {snippet ? <TsCode src={snippet} /> : null}
      <Button
        size="sm"
        className="h-9 w-full text-sm"
        onClick={() => {
          setStep(0);
          setPlaying(true);
        }}
      >
        {t("help.path.play")}
      </Button>
    </section>
  );
}

export function HelpSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("effect");
  const bodyRef = useRef<HTMLDivElement>(null);

  function switchTab(next: Tab) {
    setTab(next);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }

  return (
    <div className="help-sheet absolute inset-0 z-40 flex flex-col overflow-hidden px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4">
      <img src="/isles/sun.webp" alt="" className="help-deco help-deco-sun" />
      <img src="/isles/moon.webp" alt="" className="help-deco help-deco-moon" />
      <div className="relative z-10 shrink-0">
        <h2 className="help-title">{t("help.title")}</h2>
        <p className="help-lead text-sm font-semibold leading-snug text-muted">
          <HelpText text={t("help.lead")} />
        </p>
        <div className="mt-2.5">
          <Segmented
            value={tab}
            onChange={switchTab}
            ariaLabel={t("help.title")}
            options={[
              { id: "effect", label: t("help.tab.effect") },
              { id: "log", label: t("help.tab.log") },
            ]}
          />
        </div>
      </div>
      <div
        ref={bodyRef}
        className="no-scrollbar relative z-10 mt-2.5 min-h-0 flex-1 space-y-2.5 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y pb-1"
      >
        {tab === "effect" ? (
          <>
            <EffectMark />
            <FxNotes />
            <RayPostcard />
          </>
        ) : (
          <>
            <WritePath />
            <p className="px-1 pt-0.5 font-display text-base font-semibold tracking-tight text-fg">
              {t("help.beats")}
            </p>
            {BEATS.map((beat, i) => (
              <section
                key={beat.k}
                className={cn("help-paper p-3.5", i % 2 === 1 && "rotate-[0.35deg]")}
              >
                <div className="flex items-start gap-2.5">
                  <span className="help-sticker mt-0.5 shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-display text-[1.15rem] leading-snug font-semibold tracking-tight text-fg">
                      {t(beat.k)}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold leading-snug text-muted">
                      <HelpText text={t(beat.v)} />
                    </p>
                    {beat.code ? <TsCode src={beat.code} className="mt-2" /> : null}
                  </div>
                </div>
              </section>
            ))}
          </>
        )}
      </div>
      <Button className="relative z-10 mt-3 shrink-0" onClick={onClose}>
        {t("help.close")}
      </Button>
    </div>
  );
}
