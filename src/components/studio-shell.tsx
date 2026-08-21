import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CircleHelp, Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui";
import { HelpSheet } from "@/components/help-sheet";
import { cn } from "@/lib/cn";
import { setSfxEnabled, sfxEnabled, startCues, unlockAudio, watchSfx } from "@/lib/fx";
import { preloadPetAssets } from "@/lib/png-sequence";

type NextAction = { label: string; onClick: () => void };
type LogHud = { count: number; bump: number; onOpen: () => void };
type Hud = {
  setNext: (v: NextAction | null) => void;
  setLog: (v: LogHud | null) => void;
  setSplash: (v: boolean) => void;
};

const HudContext = createContext<Hud>({ setNext: () => {}, setLog: () => {}, setSplash: () => {} });
export function useHud() {
  return useContext(HudContext);
}

function BrandLeaf() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="brand-mark-leaf">
      <path
        fill="currentColor"
        d="M13.8 2.1c-4 .3-7.4 2.4-9 5.8-1.1 2.3-.6 4.5 1 5.6 1.4.9 3.4.5 5.4-1 2.8-2.1 4.5-5.6 4.2-9.1 0-.5-.5-1.1-1.1-1.3h-.5z"
      />
      <path
        d="M5.8 13C7.6 10.6 10 9 12.8 8.1"
        fill="none"
        stroke="#3b2a14"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrandMark({ outlined = false, padded = false }: { outlined?: boolean; padded?: boolean }) {
  return (
    <span
      className={cn(
        "brand-mark text-base sm:text-[17px]",
        outlined ? null : "brand-mark-ink",
        padded && "px-1.5",
      )}
    >
      EventLog
      <BrandLeaf />
    </span>
  );
}

function ChipIcon({
  label,
  onClick,
  off = false,
  children,
}: {
  label: string;
  onClick: () => void;
  off?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-cuelume-press=""
      data-cuelume-release=""
      onClick={onClick}
      className={cn("hud-chip", off && "hud-chip-off")}
    >
      {children}
    </button>
  );
}

function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  const index = locale === "zh" ? 0 : 1;
  return (
    <div role="tablist" aria-label={t("lang.label")} className="hud-lang">
      <span
        aria-hidden
        className="hud-lang-thumb"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {[
        { id: "zh" as const, label: "中文" },
        { id: "en" as const, label: "EN" },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={locale === opt.id}
          data-cuelume-press=""
          data-cuelume-release=""
          onClick={() => setLocale(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function StudioShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [help, setHelp] = useState(false);
  const [next, setNext] = useState<NextAction | null>(null);
  const [log, setLog] = useState<LogHud | null>(null);
  const [bumpOn, setBumpOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [splash, setSplash] = useState(true);
  const hud = useMemo(() => ({ setNext, setLog, setSplash }), []);

  useEffect(() => {
    startCues();
    return watchSfx(setSoundOn);
  }, []);

  useEffect(() => {
    void preloadPetAssets();
  }, []);

  useEffect(() => {
    if (!log?.bump) return;
    setBumpOn(true);
    const id = window.setTimeout(() => setBumpOn(false), 720);
    return () => window.clearTimeout(id);
  }, [log?.bump]);

  return (
    <HudContext.Provider value={hud}>
      <div
        className="relative flex h-dvh flex-col overflow-hidden overscroll-none bg-bg text-fg select-none"
        onDragStart={(event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest("img, video, svg, canvas, picture, .tex-ground")
          ) {
            event.preventDefault();
          }
        }}
      >
        <div className="tex-ground" aria-hidden />
        <div
          className={cn(
            "relative z-10 flex min-h-0 w-full flex-1 flex-col",
            splash
              ? "overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y"
              : "items-center justify-center overflow-hidden",
          )}
        >
          <div
            className={cn(
              "relative flex w-full flex-col",
              splash ? "min-h-full" : "min-h-0 h-[min(100dvh,var(--studio-max-h))] max-w-[760px]",
            )}
          >
            <header
              className={cn(
                "z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-3",
                splash
                  ? "splash-chrome pointer-events-none absolute inset-x-0 top-0 z-20 pt-[max(0.85rem,env(safe-area-inset-top))] pb-12 [&>*]:pointer-events-auto"
                  : "relative shrink-0 bg-transparent pt-[max(0.3rem,env(safe-area-inset-top))]",
              )}
            >
              <div className="flex min-w-0 items-center gap-0.5">
                {log ? (
                  <button
                    type="button"
                    data-cuelume-press=""
                    data-cuelume-release=""
                    onClick={log.onOpen}
                    className={cn(
                      "flex items-center gap-1 rounded-full bg-surface px-2 py-1 shadow-[0_0_0_1.5px_rgba(59,42,20,0.14)] hover:bg-raised",
                      bumpOn && "anim-log-bump",
                    )}
                  >
                    <BrandMark />
                    <span
                      className={cn(
                        "grid min-w-5 place-items-center rounded-full bg-sun px-1.5 text-[10px] font-black text-fg",
                        bumpOn && "anim-pip",
                      )}
                    >
                      {log.count}
                    </span>
                  </button>
                ) : (
                  <BrandMark outlined={splash} padded />
                )}
              </div>
              <div className="justify-self-center">
                {next ? (
                  <Button size="sm" onClick={next.onClick} className="h-8 px-5 text-sm">
                    {next.label}
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center justify-self-end gap-1">
                <ChipIcon label={t("help.title")} onClick={() => setHelp(true)}>
                  <CircleHelp className="hud-mark size-[17px]" strokeWidth={2.45} />
                </ChipIcon>
                <ChipIcon
                  label={soundOn ? "mute" : "sound"}
                  off={!soundOn}
                  onClick={() => {
                    unlockAudio();
                    const nextOn = !sfxEnabled();
                    setSfxEnabled(nextOn);
                    setSoundOn(nextOn);
                  }}
                >
                  {soundOn ? (
                    <Volume2 className="hud-vol size-[17px]" strokeWidth={2.45} />
                  ) : (
                    <VolumeX className="size-[17px]" strokeWidth={2.45} />
                  )}
                </ChipIcon>
                <LangSwitch />
              </div>
            </header>
            <main
              className={cn(
                "flex flex-1 flex-col",
                splash
                  ? "px-0 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:!h-auto [&>*]:min-h-full"
                  : "min-h-0 overflow-visible px-2 pb-[max(0.9rem,env(safe-area-inset-bottom))] sm:px-3",
              )}
            >
              {children}
            </main>
          </div>
        </div>
        {help ? <HelpSheet onClose={() => setHelp(false)} /> : null}
      </div>
    </HudContext.Provider>
  );
}
