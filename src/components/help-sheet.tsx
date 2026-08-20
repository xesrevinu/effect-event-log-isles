import { useEffect, useState } from "react";
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
    { name: "Success", gloss: t("help.fx.slot.success"), tone: "text-accent-deep" },
    { name: "Error", gloss: t("help.fx.slot.error"), tone: "text-danger" },
    { name: "Requirements", gloss: t("help.fx.slot.needs"), tone: "text-sky-deep" },
  ] as const;
  return (
    <div className="rounded-[22px] bg-raised px-4 py-6">
      <p className="text-center font-display text-[2.15rem] leading-none font-semibold tracking-tight text-fg">
        Effect
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {slots.map((slot) => (
          <div key={slot.name} className="min-w-0 text-center">
            <p className={cn("font-display text-[0.95rem] leading-tight font-semibold tracking-tight", slot.tone)}>
              {slot.name}
            </p>
            <p className="mt-1.5 text-[10px] font-black tracking-wide text-subtle">{slot.gloss}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[22px] bg-surface p-4">
      <p className="font-black text-accent-deep">{title}</p>
      <p className="mt-1.5 text-sm font-semibold leading-relaxed text-muted">
        <HelpText text={body} />
      </p>
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
    <section className="flex flex-col gap-3 rounded-[22px] bg-surface p-4 shadow-[0_1px_0_rgba(59,42,20,0.06)]">
      <div>
        <p className="font-black text-accent-deep">{t("help.path.title")}</p>
        <p className="mt-1 text-sm font-semibold text-muted">
          <HelpText text={t("help.path.hint")} />
        </p>
      </div>
      <div className="grid grid-cols-2 items-stretch gap-2.5">
        <div className={cn("flex min-h-[5.5rem] items-center gap-2.5 rounded-[18px] px-3.5 py-3", ok ? "bg-sun/70" : "bg-inset")}>
          <img src="/isles/sun.png" alt="" width={36} height={36} className="size-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="text-[11px] font-black leading-none text-muted">{t("help.path.isle")}</p>
            <p className="mt-1.5 text-sm font-black leading-snug">{t(ok ? "help.path.isle.ok" : "help.path.isle.no")}</p>
          </div>
        </div>
        <div className={cn("flex min-h-[5.5rem] items-center rounded-[18px] px-3.5 py-3", ok ? "bg-ok-dim" : "bg-danger-dim")}>
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
          className={cn(
            "h-9 rounded-full px-3 text-xs font-black",
            ok ? "bg-ok-dim text-accent-deep" : "bg-inset text-muted",
          )}
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
          className={cn(
            "h-9 rounded-full px-3 text-xs font-black",
            !ok ? "bg-danger-dim text-danger" : "bg-inset text-muted",
          )}
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
                <span className={cn("mx-0.5 h-[3px] w-2 shrink-0 rounded-full", dead ? "bg-danger" : done || here ? "bg-accent" : "bg-faint")} />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setStep(i);
                }}
                className={cn(
                  "min-w-0 flex-1 truncate rounded-full px-1 py-[6px] text-center text-[10px] font-black leading-none sm:text-[11px]",
                  dead && "bg-danger text-accent-fg",
                  here && !dead && "bg-accent text-accent-fg",
                  done && !here && !dead && "bg-ok-dim text-accent-deep",
                  !here && !done && !dead && "bg-inset text-subtle",
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

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-bg px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4">
      <h2 className="font-display text-2xl font-semibold">{t("help.title")}</h2>
      <p className="mt-1 text-sm font-semibold leading-snug text-muted">
        <HelpText text={t("help.lead")} />
      </p>
      <div className="mt-3">
        <Segmented
          value={tab}
          onChange={setTab}
          ariaLabel={t("help.title")}
          options={[
            { id: "effect", label: t("help.tab.effect") },
            { id: "log", label: t("help.tab.log") },
          ]}
        />
      </div>
      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto overscroll-contain pb-1">
        {tab === "effect" ? (
          <>
            <EffectMark />
            {FX_CARDS.map((card) => (
              <Card key={card.k} title={t(card.k)} body={t(card.v)} />
            ))}
          </>
        ) : (
          <>
            <WritePath />
            <p className="px-1 pt-1 text-sm font-black text-fg">{t("help.beats")}</p>
            {BEATS.map((beat, i) => (
              <section key={beat.k} className="rounded-[22px] bg-surface p-3.5">
                <p className="text-[11px] font-black text-subtle">{i + 1}/6</p>
                <p className="font-black text-accent-deep">{t(beat.k)}</p>
                <p className="mt-1 text-sm font-semibold leading-snug text-muted">
                  <HelpText text={t(beat.v)} />
                </p>
                {beat.code ? <TsCode src={beat.code} className="mt-2" /> : null}
              </section>
            ))}
          </>
        )}
      </div>
      <Button className="mt-3" onClick={onClose}>
        {t("help.close")}
      </Button>
    </div>
  );
}
