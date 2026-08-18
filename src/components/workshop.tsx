import { useCallback, useEffect, useRef, useState } from "react";
import { Undo2, Wind, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  compactReplica,
  defaultName,
  herd,
  makeReplica,
  newCritterId,
  rebuildProjection,
  replay,
  SPECIES,
  syncFrom,
  wipeProjection,
  writeLocal,
  type Critter,
  type EventTag,
  type Replica,
  type ReplicaId,
  type Species,
} from "@/lib/critter-sim";
import { checkMission, emptyFlags, spotlightFor, type Flags, type MissionId, type Spotlight } from "@/lib/missions";
import { armAudio, sfx, wait } from "@/lib/fx";
import { useI18n } from "@/lib/i18n-context";
import type { MessageKey } from "@/lib/i18n";
import { Button } from "@/components/ui";
import { useHud } from "@/components/studio-shell";

type World = { sun: Replica; moon: Replica };

function fresh(): World {
  return { sun: makeReplica("sun"), moon: makeReplica("moon") };
}

const FILL: Record<Species, string> = {
  pip: "#ffc800",
  nub: "#1cb0f6",
  bean: "#58cc02",
};

const STEPS = ["client()", "EventGroup", "handler", "journal"] as const;

type Pulse = {
  petId?: string;
  event?: EventTag;
  ok: boolean;
  nonce: number;
};

type Pending = {
  petId: string;
  event: EventTag;
};

function Face({
  pet,
  size = 64,
}: {
  pet: Pick<Critter, "species" | "stage" | "belly" | "mood" | "energy">;
  size?: number;
}) {
  const stuffed = pet.belly >= 3;
  const sleepy = pet.energy <= 0;
  const play = pet.mood >= 3 && pet.energy > 0 && !sleepy;
  const sad = pet.mood <= 0 && !play;
  const h = pet.stage === "egg" ? size * 0.78 : pet.stage === "kid" ? size * 0.92 : size;
  const w = pet.species === "bean" ? size * 0.74 : pet.species === "nub" ? size * 0.9 : size;
  const cx = size / 2;
  const cy = size / 2;
  const eyeY = sleepy || pet.stage === "egg" ? h * 0.46 : h * 0.4;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden className="size-full">
      <ellipse cx={cx} cy={cy + 3} rx={w * 0.44} ry={h * 0.42} fill="rgba(59,42,20,0.12)" />
      <ellipse cx={cx} cy={cy} rx={w * 0.44} ry={h * 0.44} fill={FILL[pet.species]} stroke="#3b2a14" strokeWidth="3" />
      <ellipse cx={cx - w * 0.12} cy={cy - h * 0.14} rx={w * 0.16} ry={h * 0.1} fill="rgba(255,255,255,0.35)" />
      {pet.species === "nub" ? (
        <>
          <ellipse cx={cx - w * 0.28} cy={cy - h * 0.38} rx={size * 0.09} ry={size * 0.12} fill={FILL.nub} stroke="#3b2a14" strokeWidth="2.5" />
          <ellipse cx={cx + w * 0.28} cy={cy - h * 0.38} rx={size * 0.09} ry={size * 0.12} fill={FILL.nub} stroke="#3b2a14" strokeWidth="2.5" />
        </>
      ) : null}
      {pet.species === "bean" ? (
        <path d={`M ${cx} ${cy - h * 0.46} q ${size * 0.08} ${-size * 0.16} ${size * 0.18} ${-size * 0.04}`} fill="none" stroke="#3b2a14" strokeWidth="3" strokeLinecap="round" />
      ) : null}
      {pet.stage === "egg" ? (
        <path d={`M ${size * 0.32} ${h * 0.4} L ${size * 0.4} ${h * 0.32} L ${size * 0.48} ${h * 0.42} L ${size * 0.58} ${h * 0.3} L ${size * 0.68} ${h * 0.4}`} fill="none" stroke="#3b2a14" strokeWidth="3" />
      ) : sleepy ? (
        <>
          <path d={`M ${cx - size * 0.16} ${eyeY} q ${size * 0.06} ${size * 0.05} ${size * 0.12} 0`} fill="none" stroke="#3b2a14" strokeWidth="3" strokeLinecap="round" />
          <path d={`M ${cx + size * 0.04} ${eyeY} q ${size * 0.06} ${size * 0.05} ${size * 0.12} 0`} fill="none" stroke="#3b2a14" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : play ? (
        <>
          <path d={`M ${cx - size * 0.2} ${eyeY} l ${size * 0.06} ${-size * 0.05} l ${size * 0.06} ${size * 0.05} l ${size * 0.06} ${-size * 0.05}`} fill="none" stroke="#3b2a14" strokeWidth="2.6" strokeLinejoin="round" />
          <path d={`M ${cx + size * 0.02} ${eyeY} l ${size * 0.06} ${-size * 0.05} l ${size * 0.06} ${size * 0.05} l ${size * 0.06} ${-size * 0.05}`} fill="none" stroke="#3b2a14" strokeWidth="2.6" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx={cx - size * 0.12} cy={eyeY} r={sad ? 2.1 : 3.3} fill="#3b2a14" />
          <circle cx={cx + size * 0.12} cy={eyeY} r={sad ? 2.1 : 3.3} fill="#3b2a14" />
          <circle cx={cx - size * 0.1} cy={eyeY - 1} r={1} fill="#fff" />
          <circle cx={cx + size * 0.14} cy={eyeY - 1} r={1} fill="#fff" />
        </>
      )}
      <ellipse cx={cx - w * 0.22} cy={h * 0.58} rx={size * 0.07} ry={size * 0.045} fill={stuffed || play ? "#ff8aa0" : "transparent"} />
      <ellipse cx={cx + w * 0.22} cy={h * 0.58} rx={size * 0.07} ry={size * 0.045} fill={stuffed || play ? "#ff8aa0" : "transparent"} />
      {stuffed ? (
        <ellipse cx={cx} cy={h * 0.68} rx={size * 0.1} ry={size * 0.07} fill="#3b2a14" />
      ) : sad ? (
        <path d={`M ${cx - size * 0.1} ${h * 0.7} q ${size * 0.1} ${-size * 0.08} ${size * 0.2} 0`} fill="none" stroke="#3b2a14" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d={`M ${cx - size * 0.1} ${h * 0.64} q ${size * 0.1} ${size * 0.12} ${size * 0.2} 0`} fill="none" stroke="#3b2a14" strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
  );
}

function tiltOf(seed: string, i: number) {
  return ((seed.charCodeAt(i % seed.length) + i * 19) % 17) - 8;
}

function Marks({ n, mark, pulse, seed, tone }: { n: number; mark: string; pulse?: boolean; seed: string; tone: string }) {
  return (
    <span className={cn("inline-flex h-8 shrink-0 items-center rounded-full px-1.5", tone)}>
      {Array.from({ length: 3 }, (_, i) => (
        <span
          key={i}
          className={cn("anim-tilt inline-block text-[18px] leading-none", pulse && i < n && "anim-pip")}
          style={{
            ["--tilt" as string]: `${tiltOf(seed + mark, i)}deg`,
            opacity: i < n ? 1 : 0.2,
            animationDelay: `${i * 90}ms`,
          }}
        >
          {mark}
        </span>
      ))}
    </span>
  );
}

const EVENT_TONE: Record<EventTag, string> = {
  Hatched: "bg-sun",
  Named: "bg-grape",
  Fed: "bg-sun",
  Played: "bg-sky",
  Slept: "bg-grape",
  Released: "bg-danger",
  Snapshot: "bg-ok-dim",
};

function payloadLine(payload: Record<string, unknown>) {
  return JSON.stringify(payload);
}

type Attempt = {
  event: EventTag;
  payload: Record<string, unknown>;
  ok: boolean;
  error?: string;
  entryId?: string;
  isle: ReplicaId;
};

function CritterCard({
  pet,
  spot,
  busy,
  pulse,
  pending,
  onAct,
}: {
  pet: Critter;
  spot: Spotlight;
  busy: boolean;
  pulse: Pulse | null;
  pending: Pending | null;
  onAct: (event: EventTag, pet: Critter, name?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pet.name);
  const mine = pulse?.petId === pet.id && pulse.ok;
  const waiting = pending?.petId === pet.id;
  const fx = mine ? pulse?.event : undefined;
  const actions = [
    { event: "Fed" as const, spot: "feed", mark: "🍪", tone: "border-[#d97a00] bg-[#ff9600] text-fg" },
    { event: "Played" as const, spot: "play", mark: "✨", tone: "border-sky-deep bg-sky text-accent-fg" },
    { event: "Slept" as const, spot: null, mark: "😴", tone: "border-grape-deep bg-grape text-accent-fg" },
    { event: "Released" as const, spot: null, mark: "✕", tone: "border-[#d93838] bg-danger text-accent-fg" },
  ];

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col rounded-[18px] bg-surface px-2.5 py-2",
        waiting && "ring-2 ring-inset ring-dashed ring-sky",
        mine && "anim-flash",
        pulse?.petId === pet.id && !pulse.ok && "anim-shake",
      )}
    >
      {fx === "Slept" ? <span className="anim-zzz pointer-events-none absolute top-0 right-6 text-[11px] font-black text-grape">z</span> : null}
      {fx === "Played" ? <span className="pointer-events-none absolute top-0.5 right-8 text-[11px]">✨</span> : null}
      {fx === "Fed" ? <span className="pointer-events-none absolute top-0.5 right-8 text-[12px]">🍪</span> : null}
      <div className="flex items-center gap-2">
        <div className={cn("size-14 shrink-0", mine && (fx === "Played" ? "anim-wiggle" : "anim-pop"))}>
          <Face pet={pet} size={64} />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                setEditing(false);
                if (draft.trim() && draft.trim() !== pet.name) onAct("Named", pet, draft.trim());
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className={cn("h-7 w-full rounded-lg bg-inset px-2 text-sm font-black text-fg", spot === "name" && "ring-2 ring-accent")}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(pet.name);
                setEditing(true);
              }}
              className={cn("block max-w-full truncate text-left text-base font-black", spot === "name" && "rounded-lg ring-2 ring-accent")}
            >
              {pet.name}
            </button>
          )}
          <div className="mt-1 flex flex-nowrap items-center gap-1.5">
            <Marks n={pet.belly} pulse={mine && fx === "Fed"} mark="🍪" seed={pet.id} tone="bg-warn-dim" />
            <Marks n={pet.mood} pulse={mine && fx === "Played"} mark="✨" seed={pet.id} tone="bg-[#f3e2ff]" />
            <Marks n={pet.energy} pulse={mine && fx === "Slept"} mark="😴" seed={pet.id} tone="bg-info-dim" />
          </div>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {actions.map((action) => (
          <button
            key={action.event}
            type="button"
            disabled={busy}
            onClick={() => onAct(action.event, pet)}
            aria-label={action.event}
            className={cn(
              "chunk chunk-sm flex h-10 flex-col items-center justify-center gap-0 rounded-xl px-0 py-1",
              action.tone,
              "disabled:cursor-not-allowed disabled:opacity-40",
              action.spot && spot === action.spot && "anim-hint",
              waiting && pending?.event === action.event && "brightness-110",
              mine && fx === action.event && "anim-pop",
            )}
          >
            <span className="text-[15px] leading-none">{action.mark}</span>
            <span className="text-[10px] leading-none font-black">{action.event}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Isle({
  replica,
  locked,
  selected,
  lit,
  spot,
  busy,
  pulse,
  pending,
  onAct,
  onStorm,
  onReplay,
  onFold,
  onPick,
  onOpenLog,
}: {
  replica: Replica;
  locked: boolean;
  selected: boolean;
  lit: boolean;
  spot: Spotlight;
  busy: boolean;
  pulse: Pulse | null;
  pending: Pending | null;
  onAct: (event: EventTag, pet: Critter, name?: string) => void;
  onStorm: () => void;
  onReplay: () => void;
  onFold: () => void;
  onPick: () => void;
  onOpenLog: () => void;
}) {
  const { t } = useI18n();
  const pets = herd(replica);
  const sun = replica.id === "sun";
  return (
    <section
      onClick={onPick}
      className={cn(
        "flex h-full w-full min-h-0 min-w-0 flex-col rounded-[20px] transition-colors duration-200",
        sun ? "bg-sun/40" : "bg-sky/25",
        selected && (sun ? "bg-sun ring-[3px] ring-inset ring-[#b8860b]" : "bg-sky/60 ring-[3px] ring-inset ring-sky-deep"),
        !selected && "opacity-75",
        lit && "anim-flash",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className={cn("min-w-0 truncate text-sm font-black", selected && "rounded-lg bg-surface px-1.5 py-0.5")}>{t(sun ? "isle.sun" : "isle.moon")}</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenLog(); }}
            className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-black"
          >
            #{replica.journal.length}
          </button>
        </div>
        {locked ? null : (
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="quiet" disabled={busy || replica.journal.length === 0} onClick={(e) => { e.stopPropagation(); onStorm(); }} className={cn("h-7 px-2", spot === "storm" && "ring-2 ring-fg")} aria-label="wipe">
              <Wind className="size-3.5" />
              <span className="text-[10px] font-black">wipe</span>
            </Button>
            <Button size="sm" variant="quiet" disabled={busy || replica.journal.length === 0} onClick={(e) => { e.stopPropagation(); onReplay(); }} className={cn("h-7 px-2", spot === "replay" && "ring-2 ring-fg")} aria-label="replay">
              <Undo2 className="size-3.5" />
              <span className="text-[10px] font-black">replay</span>
            </Button>
            <Button size="sm" variant="quiet" disabled={busy || replica.journal.length < 2} onClick={(e) => { e.stopPropagation(); onFold(); }} className={cn("h-7 px-2", spot === "fold" && "ring-2 ring-fg")} aria-label="compact">
              <span className="text-[10px] font-black">compact</span>
            </Button>
          </div>
        )}
      </div>
      {locked ? (
        <div className="mx-1.5 mb-1.5 flex flex-1 items-center justify-center rounded-[14px] bg-surface/80">
          <p className="text-sm font-extrabold text-subtle">{t("isle.locked")}</p>
        </div>
      ) : pets.length === 0 ? (
        <div className="mx-1.5 mb-1.5 flex flex-1 items-center justify-center rounded-[14px] bg-surface/80">
          <p className="text-sm font-extrabold text-subtle">{t("isle.empty")}</p>
        </div>
      ) : (
        <div className="mx-1 mb-1.5 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain p-1">
          {pets.map((pet) => (
            <CritterCard key={pet.id} pet={pet} spot={spot} busy={busy} pulse={pulse} pending={pending} onAct={onAct} />
          ))}
        </div>
      )}
    </section>
  );
}

function TimelineBar({
  forge,
  failing,
}: {
  forge: number;
  failing: boolean;
}) {
  const fill = forge < 0 ? 0 : Math.min(forge, failing ? 2 : forge) / 3;
  return (
    <div className="shrink-0 px-4 pt-1 pb-4">
      <div className="relative flex items-start justify-between">
        <div className="pointer-events-none absolute top-[7px] right-3 left-3 h-[3px] rounded-full bg-faint" />
        <div
          className="pointer-events-none absolute top-[7px] left-3 h-[3px] rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `calc(${fill} * (100% - 1.5rem))` }}
        />
        {STEPS.map((label, i) => {
          const on = forge === i;
          const done = forge > i && !(failing && i >= 2);
          const dead = failing && i === 2;
          const locked = failing && i === 3;
          return (
            <div key={label} className="relative z-10 flex w-14 flex-col items-center gap-1">
              <span
                className={cn(
                  "size-4 rounded-full",
                  dead && "anim-shake bg-danger",
                  locked && "bg-faint",
                  on && !dead && "anim-pop bg-accent ring-4 ring-ok-dim",
                  done && "bg-accent",
                  !on && !done && !dead && !locked && "bg-surface shadow-[0_0_0_3px_#e8c96a]",
                )}
              />
              <span className={cn("text-[11px] font-extrabold", on || dead ? "text-fg" : "text-subtle")}>
                {label.replace("()", "")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepToast({
  show,
  failing,
  text,
}: {
  show: boolean;
  failing: boolean;
  text: string;
}) {
  const [paint, setPaint] = useState(show);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (show) {
      setPaint(true);
      setLeaving(false);
      return;
    }
    if (!paint) return;
    setLeaving(true);
    const id = window.setTimeout(() => {
      setPaint(false);
      setLeaving(false);
    }, 240);
    return () => window.clearTimeout(id);
  }, [show, paint]);
  if (!paint) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-4 z-20",
        leaving ? "anim-toast-out" : "anim-toast-in",
      )}
      style={{ bottom: "22%" }}
    >
      <div className={cn("rounded-2xl px-4 py-3 shadow-[0_10px_28px_rgba(59,42,20,0.16)]", failing ? "bg-danger-dim" : "bg-surface")}>
        <p key={text} className={cn("anim-copy text-[15px] font-black leading-snug", failing ? "text-danger" : "text-fg")}>
          {text}
        </p>
      </div>
    </div>
  );
}

function EventsDialog({
  title,
  sources,
  attempt,
  selectedId,
  onSelect,
  onClose,
}: {
  title: string;
  sources: { label: string; replica: Replica }[];
  attempt: Attempt | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const list = useRef<HTMLDivElement>(null);
  const len = sources.reduce((n, s) => n + s.replica.journal.length, 0);
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [len, attempt?.entryId]);

  return (
    <div className="absolute inset-0 z-30">
      <button type="button" className="absolute inset-0 bg-[rgba(59,42,20,0.46)]" onClick={onClose} aria-label="close events" />
      <div className="absolute top-[10%] left-1/2 flex max-h-[78%] w-[min(94%,420px)] -translate-x-1/2 flex-col overflow-hidden rounded-[28px] bg-raised shadow-[0_20px_50px_rgba(59,42,20,0.28)] ring-4 ring-fg/10">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-base font-black">{title}</p>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-surface" aria-label="close">
            <X className="size-4" />
          </button>
        </div>
        <div ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pt-1 pb-5">
          {len === 0 && !attempt ? (
            <p className="rounded-2xl bg-surface px-3 py-4 text-sm font-bold text-subtle">{t("log.empty")}</p>
          ) : null}
          {sources.map((src) => (
            <div key={src.replica.id} className="space-y-2">
              {sources.length > 1 ? (
                <p className="text-[11px] font-black text-muted">{src.label} · #{src.replica.journal.length}</p>
              ) : null}
              {src.replica.journal.map((e, i) => {
                const on = selectedId === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelect(on ? null : e.id)}
                    className={cn("w-full rounded-2xl px-3 py-2.5 text-left", EVENT_TONE[e.event], on && "ring-2 ring-inset ring-fg")}
                  >
                    <p className="font-mono text-[12px] font-black">
                      #{i + 1} {e.event}
                    </p>
                    <p className="break-all font-mono text-[11px] font-bold text-fg/80">{payloadLine(e.payload)}</p>
                  </button>
                );
              })}
            </div>
          ))}
          {attempt && !attempt.ok ? (
            <div className="w-full rounded-2xl bg-danger-dim px-3 py-2.5">
              <p className="font-mono text-[12px] font-black text-danger">
                {attempt.event} · {t("log.ghost")}
              </p>
              <p className="break-all font-mono text-[11px] font-bold text-fg/70">{payloadLine(attempt.payload)}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Workshop() {
  const { t } = useI18n();
  const { setNext, setLog, setSplash } = useHud();
  const [seated, setSeated] = useState(false);
  const [world, setWorld] = useState<World>(fresh);
  const [active, setActive] = useState<ReplicaId>("sun");
  const [mission, setMission] = useState<MissionId | 0>(1);
  const [flags, setFlags] = useState<Flags>(emptyFlags);
  const [won, setWon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [forge, setForge] = useState(-1);
  const [failing, setFailing] = useState(false);
  const [caption, setCaption] = useState<MessageKey>("cap.idle");
  const [capParams, setCapParams] = useState<Record<string, string | number>>({});
  const [lit, setLit] = useState<ReplicaId | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [logView, setLogView] = useState<"all" | ReplicaId | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const run = useRef(0);

  const moonOpen = mission === 0 || mission >= 4;
  const spot: Spotlight = mission !== 0 && !won ? spotlightFor(mission, flags) : null;
  const logCount = world.sun.journal.length + world.moon.journal.length;
  const prevLog = useRef(0);
  const logBump = useRef(0);

  useEffect(() => {
    setSplash(!seated);
    return () => setSplash(false);
  }, [seated, setSplash]);

  useEffect(() => {
    if (!seated) {
      setLog(null);
      return;
    }
    if (logCount > prevLog.current) logBump.current = Date.now();
    prevLog.current = logCount;
    setLog({
      count: logCount,
      bump: logBump.current,
      onOpen: () => setLogView("all"),
    });
    return () => setLog(null);
  }, [seated, logCount, setLog]);

  const check = useCallback((next: World, nextFlags: Flags, id: MissionId | 0) => {
    if (id === 0) return;
    if (checkMission(id, next.sun, next.moon, nextFlags)) {
      setWon(true);
      sfx.win();
    }
  }, []);

  useEffect(() => () => { run.current += 1; }, []);

  async function walk(ok: boolean, apply?: () => void) {
    const token = ++run.current;
    setBusy(true);
    setFailing(false);
    const last = ok ? 3 : 2;
    for (let i = 0; i <= last; i++) {
      if (run.current !== token) return false;
      setForge(i);
      if (!ok && i === 2) {
        setFailing(true);
        sfx.reject();
        apply?.();
      } else sfx.step();
      if (ok && i === 3) apply?.();
      const hold = !ok && i === 2 ? 1700 : i === 0 ? 950 : i === 3 ? 1200 : 1100;
      await wait(hold);
    }
    return run.current === token;
  }

  async function act(isle: ReplicaId, event: EventTag, payload: Record<string, unknown>) {
    if (busy) return;
    const replica = world[isle];
    sfx.stamp();
    const { replica: nextRep, result } = writeLocal(replica, event, payload);
    const petId = String((result.ok ? result.entry.payload.id : payload.id) ?? "");
    setAttempt({
      event,
      payload: result.ok ? result.entry.payload : payload,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
      entryId: result.ok ? result.entry.id : undefined,
      isle,
    });
    setPending({ petId, event });
    setPulse(null);
    setCaption("cap.walk");
    const nextFlags: Flags = {
      ...flags,
      rejected: flags.rejected || !result.ok,
      played: flags.played || (result.ok && event === "Played"),
      slept: flags.slept || (result.ok && event === "Slept"),
    };
    const next = { ...world, [isle]: nextRep };
    const ok = await walk(result.ok, () => {
      if (result.ok) {
        setWorld(next);
        setFlags(nextFlags);
        setActive(isle);
        setLit(isle);
        sfx.commit();
        setCaption("cap.ok");
        setPending(null);
        setPicked(result.entry.id);
        setPulse({ petId, event, ok: true, nonce: Date.now() });
      } else {
        setPending(null);
        setPulse({ petId, event, ok: false, nonce: Date.now() });
      }
    });
    const token = run.current;
    if (!ok) return;
    if (!result.ok) {
      setForge(2);
      setFailing(true);
      setCaption("cap.no");
      setCapParams({ why: t((`err.${result.error}` as MessageKey)) });
    }
    setPending(null);
    setBusy(false);
    check(next, nextFlags, mission);
    window.setTimeout(() => {
      if (run.current === token) {
        setForge(-1);
        setFailing(false);
        setLit(null);
      }
    }, 1100);
  }

  function onCardAct(isle: ReplicaId) {
    return (event: EventTag, pet: Critter, name?: string) => {
      void act(isle, event, event === "Named" ? { id: pet.id, name } : { id: pet.id });
    };
  }

  async function hatch(species: Species) {
    const isle = moonOpen ? active : "sun";
    void act(isle, "Hatched", { id: newCritterId(), species, name: defaultName(species) });
  }

  async function ferry(from: ReplicaId, to: ReplicaId) {
    if (busy || !moonOpen) return;
    setBusy(true);
    sfx.ferry();
    const result = syncFrom(world[from], world[to]);
    setCaption(result.imported.length ? "cap.sync" : "cap.syncEmpty");
    setCapParams({ n: result.imported.length });
    await wait(1200);
    const nextFlags: Flags = { ...flags, conflicted: flags.conflicted || result.conflicts > 0 };
    if (result.conflicts > 0) setCaption("cap.conflict");
    const next = { ...world, [to]: result.target };
    setWorld(next);
    setFlags(nextFlags);
    setActive(to);
    setLit(to);
    const token = run.current;
    window.setTimeout(() => {
      if (run.current === token) setLit(null);
    }, 480);
    setBusy(false);
    check(next, nextFlags, mission);
  }

  async function storm(id: ReplicaId) {
    if (busy || world[id].journal.length === 0) return;
    setBusy(true);
    sfx.wipe();
    setCaption("cap.storm");
    setWorld({ ...world, [id]: wipeProjection(world[id]) });
    setFlags({ ...flags, wiped: true, rebuilt: false });
    setPulse({ ok: false, nonce: Date.now() });
    await wait(900);
    setBusy(false);
  }

  async function doReplay(id: ReplicaId) {
    if (busy || world[id].journal.length === 0) return;
    setBusy(true);
    setCaption("cap.replay");
    const replica = world[id];
    setWorld((w) => ({ ...w, [id]: { ...w[id], projection: {} } }));
    for (let i = 0; i < replica.journal.length; i++) {
      const entry = replica.journal[i];
      setPicked(entry.id);
      setPulse({ petId: entry.primaryKey, event: entry.event, ok: true, nonce: Date.now() });
      setWorld((w) => ({
        ...w,
        [id]: { ...w[id], projection: replay(replica.journal.slice(0, i + 1)) },
      }));
      sfx.rebuild();
      await wait(750);
    }
    const nextRep = rebuildProjection(replica);
    const next = { ...world, [id]: nextRep };
    const nextFlags: Flags = { ...flags, rebuilt: herd(nextRep).length > 0 };
    setWorld(next);
    setFlags(nextFlags);
    setBusy(false);
    check(next, nextFlags, mission);
  }

  function fold(id: ReplicaId) {
    if (busy) return;
    const { replica, shorter } = compactReplica(world[id]);
    if (!shorter) return;
    sfx.commit();
    setCaption("cap.fold");
    const next = { ...world, [id]: replica };
    const nextFlags: Flags = { ...flags, compacted: true };
    setWorld(next);
    setFlags(nextFlags);
    check(next, nextFlags, mission);
  }

  function advance() {
    if (mission === 0 || mission === 6) {
      setMission(0);
      setWon(false);
      return;
    }
    setMission((m) => (m === 0 ? 0 : ((m + 1) as MissionId)));
    setWon(false);
  }

  function reset() {
    run.current += 1;
    setWorld(fresh());
    setActive("sun");
    setMission(1);
    setFlags(emptyFlags());
    setWon(false);
    setForge(-1);
    setFailing(false);
    setCaption("cap.idle");
    setBusy(false);
    setLogView(null);
    setAttempt(null);
    setPulse(null);
    setPending(null);
  }

  useEffect(() => {
    if (!won) {
      setNext(null);
      return;
    }
    setNext({
      label: mission === 6 ? t("hud.free") : t("hud.next"),
      onClick: advance,
    });
    return () => setNext(null);
  }, [won, mission, t, setNext]);

  const title = mission === 0 ? t("ms.free.title") : t(`ms.${mission}.title` as MessageKey);
  const hint = mission === 0 ? t("ms.free.hint") : t(`ms.${mission}.hint` as MessageKey);
  const win = mission === 0 ? "" : t(`ms.${mission}.win` as MessageKey);
  const stepHint = failing
    ? t(caption, capParams)
    : forge < 0
      ? t("log.append")
      : t(`step.${forge}` as MessageKey, { event: attempt?.event ?? "Event" });
  const toastOn = forge >= 0 || failing;

  if (!seated) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <img
          src="/hero.jpg"
          alt="EventLog Isles"
          width={1792}
          height={1008}
          fetchPriority="high"
          decoding="async"
          className="aspect-16/9 block h-auto w-full max-h-[min(58vh,58vw)] object-cover object-[center_18%] [mask-image:linear-gradient(to_bottom,#000_74%,transparent)]"
        />
        <div className="relative z-10 -mt-8 flex shrink-0 flex-col gap-3 px-4 pb-2 sm:px-6">
          <p className="min-h-[2.2em] font-display text-[36px] leading-[0.95] font-semibold tracking-tight sm:min-h-[1.1em] sm:text-5xl">{t("boot.title")}</p>
          <p className="min-h-[3.25em] max-w-md text-base leading-snug font-semibold text-muted">{t("boot.body")}</p>
          <div className="relative left-1/2 w-[90vw] -translate-x-1/2">
            <Button size="lg" className="h-14 w-full text-lg" onClick={() => { armAudio(); setSeated(true); }}>
              {t("boot.go")}
            </Button>
          </div>
          <div className="space-y-1 text-sm font-bold text-muted">
            <p>
              {t("boot.credit")}{" "}
              <a href="https://x.com/xesrevinu" target="_blank" rel="noreferrer" className="text-fg underline decoration-2 underline-offset-2">
                @xesrevinu
              </a>
            </p>
            <p>
              <a href="https://effect.website" target="_blank" rel="noreferrer" className="text-fg underline decoration-2 underline-offset-2">
                {t("boot.site")}
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-1">
      <div className="shrink-0">
        <div className="relative flex h-8 items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-1">
            {([1, 2, 3, 4, 5, 6] as const).map((n) => {
              const filled = mission === 0 || n < mission || (n === mission && won);
              const here = mission !== 0 && n === mission && !won;
              return (
                <span
                  key={n}
                  className={cn(
                    "h-3 flex-1 rounded-full",
                    filled && "bg-accent",
                    here && "bg-fg",
                    !filled && !here && "bg-faint",
                  )}
                />
              );
            })}
          </div>
          {mission === 0 ? null : (
            <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-subtle">
              {t("hud.step", { n: mission })}
            </span>
          )}
        </div>
        <div className="mt-1 min-w-0">
          <p className="truncate text-sm font-black leading-tight">{won ? win : title}</p>
          <p className="truncate text-[11px] leading-tight font-semibold text-muted">{won ? title : hint}</p>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col gap-2 p-0.5">
          <Isle
            replica={world.sun}
            locked={false}
            selected={active === "sun"}
            lit={lit === "sun"}
            spot={active === "sun" ? spot : null}
            busy={busy}
            pulse={pulse}
            pending={pending}
            onAct={onCardAct("sun")}
            onStorm={() => void storm("sun")}
            onReplay={() => void doReplay("sun")}
            onFold={() => fold("sun")}
            onPick={() => setActive("sun")}
            onOpenLog={() => setLogView("sun")}
          />
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" className={cn("h-8 flex-1 text-xs", spot === "ferry" && "ring-2 ring-fg")} disabled={busy || !moonOpen} onClick={() => void ferry("sun", "moon")}>
              sync ↓
            </Button>
            <Button size="sm" variant="sky" className="h-8 flex-1 text-xs" disabled={busy || !moonOpen} onClick={() => void ferry("moon", "sun")}>
              sync ↑
            </Button>
          </div>
          <Isle
            replica={world.moon}
            locked={!moonOpen}
            selected={active === "moon"}
            lit={lit === "moon"}
            spot={active === "moon" ? spot : null}
            busy={busy}
            pulse={pulse}
            pending={pending}
            onAct={onCardAct("moon")}
            onStorm={() => void storm("moon")}
            onReplay={() => void doReplay("moon")}
            onFold={() => fold("moon")}
            onPick={() => setActive("moon")}
            onOpenLog={() => setLogView("moon")}
          />
        </div>
        {logView ? (
          <EventsDialog
            title={logView === "all" ? t("log.all") : t(logView === "sun" ? "isle.sun" : "isle.moon")}
            sources={
              logView === "all"
                ? [
                    { label: t("isle.sun"), replica: world.sun },
                    { label: t("isle.moon"), replica: world.moon },
                  ]
                : [{ label: t(logView === "sun" ? "isle.sun" : "isle.moon"), replica: world[logView] }]
            }
            attempt={attempt && (logView === "all" || attempt.isle === logView) ? attempt : null}
            selectedId={picked}
            onSelect={setPicked}
            onClose={() => setLogView(null)}
          />
        ) : null}
      </div>

      <TimelineBar forge={forge} failing={failing} />
      <StepToast show={toastOn} failing={failing} text={stepHint} />

      <div className="grid shrink-0 grid-cols-4 gap-1.5">
        {SPECIES.map((sp) => (
          <Button
            key={sp}
            variant={sp === "pip" ? "sun" : sp === "nub" ? "sky" : "primary"}
            disabled={busy || herd(world[active]).length >= 2}
            onClick={() => void hatch(sp)}
            className={cn("h-11 gap-1 px-1 text-xs", spot === "hatch" && "ring-2 ring-fg")}
          >
            <span className="size-6">
              <Face pet={{ species: sp, stage: "kid", belly: 2, mood: 2, energy: 2 }} size={28} />
            </span>
            {sp === "pip" ? "Pip" : sp === "nub" ? "Nub" : "Bean"}
          </Button>
        ))}
        <Button variant="quiet" disabled={busy} onClick={reset} className="h-11 text-xs">
          reset
        </Button>
      </div>
    </div>
  );
}
