import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CircleHelp, Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { playCue, setSfxEnabled, sfxEnabled, startCues, unlockAudio, watchSfx } from "@/lib/fx";
import type { Locale, MessageKey } from "@/lib/i18n";

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

function ChipIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="chunk grid size-10 place-items-center rounded-2xl border-[#d7b56a] bg-surface text-fg shadow-[0_1px_0_rgba(255,255,255,0.7)]"
    >
      {children}
    </button>
  );
}

function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="tablist"
      aria-label={t("lang.label")}
      className="chunk grid h-10 w-[7.75rem] shrink-0 grid-cols-2 rounded-2xl border-[#d7b56a] bg-surface p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.7)]"
    >
      {([
        { id: "zh" as const, label: "中文" },
        { id: "en" as const, label: "EN" },
      ]).map((opt) => {
        const on = locale === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => setLocale(opt.id)}
            className={cn(
              "h-9 w-full rounded-xl px-1 text-sm font-extrabold",
              on ? "bg-sun text-fg" : "text-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Help({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const rows: { k: MessageKey; v: MessageKey }[] = [
    { k: "help.1.k", v: "help.1.v" },
    { k: "help.2.k", v: "help.2.v" },
    { k: "help.3.k", v: "help.3.v" },
    { k: "help.4.k", v: "help.4.v" },
    { k: "help.5.k", v: "help.5.v" },
    { k: "help.6.k", v: "help.6.v" },
  ];
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-bg p-4">
      <h2 className="font-display text-2xl font-semibold">{t("help.title")}</h2>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.k} className="rounded-2xl bg-surface p-4">
            <p className="font-black text-accent-deep">{t(r.k)}</p>
            <p className="mt-1 text-sm font-semibold text-muted">{t(r.v)}</p>
          </div>
        ))}
      </div>
      <Button className="mt-3" onClick={onClose}>
        {t("help.close")}
      </Button>
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
    if (!log?.bump) return;
    setBumpOn(true);
    const id = window.setTimeout(() => setBumpOn(false), 720);
    return () => window.clearTimeout(id);
  }, [log?.bump]);

  return (
    <HudContext.Provider value={hud}>
      <div className="relative flex h-dvh flex-col overflow-hidden overscroll-none bg-bg text-fg">
        <div className={cn("relative mx-auto flex min-h-0 w-full flex-1 flex-col", !splash && "max-w-[760px]")}>
          <header
            className={cn(
              "z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-3",
              splash
                ? "pointer-events-none absolute inset-x-0 top-0 bg-transparent pt-[max(0.55rem,env(safe-area-inset-top))] pb-4 [&>*]:pointer-events-auto"
                : "relative shrink-0 bg-bg pt-[max(0.3rem,env(safe-area-inset-top))]",
            )}
          >
            <div className="flex items-center gap-1">
              {log ? (
                <button
                  type="button"
                  data-cuelume-press=""
                  data-cuelume-release=""
                  onClick={log.onOpen}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl bg-sun px-2 py-1",
                    bumpOn && "anim-log-bump",
                  )}
                >
                  <span className="font-display text-[15px] font-semibold tracking-tight">EventLog</span>
                  <span className={cn("grid min-w-5 place-items-center rounded-full bg-fg px-1.5 text-[11px] font-black text-sun", bumpOn && "anim-pip")}>
                    {log.count}
                  </span>
                </button>
              ) : splash ? (
                <span className="chunk rounded-2xl border-[#d7b56a] bg-surface px-2.5 py-1.5 font-display text-[15px] font-semibold tracking-tight shadow-[0_1px_0_rgba(255,255,255,0.7)]">
                  EventLog
                </span>
              ) : (
                <p className="font-display text-[15px] font-semibold tracking-tight">EventLog</p>
              )}
              <ChipIcon label={t("help.title")} onClick={() => setHelp(true)}>
                <CircleHelp className="size-5" />
              </ChipIcon>
              <ChipIcon
                label={soundOn ? "mute" : "sound"}
                onClick={() => {
                  unlockAudio();
                  const nextOn = !sfxEnabled();
                  setSfxEnabled(nextOn);
                  setSoundOn(nextOn);
                }}
              >
                {soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
              </ChipIcon>
            </div>
            <div className="justify-self-center">
              {next ? (
                <Button size="sm" onClick={next.onClick} className="h-8 px-4 text-sm">
                  {next.label}
                </Button>
              ) : null}
            </div>
            <div className="justify-self-end">
              <LangSwitch />
            </div>
          </header>
          <main className={cn("min-h-0 flex-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]", splash ? "px-0" : "px-2 sm:px-3")}>
            {children}
          </main>
        </div>
        {help ? <Help onClose={() => setHelp(false)} /> : null}
      </div>
    </HudContext.Provider>
  );
}
