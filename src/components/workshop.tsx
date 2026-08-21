import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RegistryProvider, useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit } from "effect";
import {
  Clapperboard,
  Server,
  ServerOff,
  Smartphone,
  Sparkles,
  Undo2,
  Wifi,
  WifiOff,
  Wind,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  defaultName,
  herd,
  MAX_BELLY,
  MAX_ENERGY,
  MAX_HERD,
  MAX_MOOD,
  newCritterId,
  SPECIES,
  type Critter,
  type EventTag,
  type Replica,
  type ReplicaId,
  type Species,
} from "@/lib/critter-sim";
import {
  advanceAtom,
  busyAtom,
  islesRuntime,
  lessonAtom,
  moonReplicaAtom,
  onlineAtom,
  pickIsleAtom,
  playheadAtom,
  progressAtom,
  replayAtom,
  resetAtom,
  scheduleAtomTask,
  setOnlineAtom,
  setServerAtom,
  stormAtom,
  sunReplicaAtom,
  tracesAtom,
  writeAtom,
} from "@/lib/isles/atoms";
import { readOnline } from "@/lib/isles/runtime";
import { traceBeatFailed, traceBeatLabel, type TraceSpan } from "@/lib/isles/trace";
import { LAST_MISSION, MISSION_IDS, type Spotlight } from "@/lib/missions";
import { setIslePlayhead } from "@/lib/session";
import { armAudio, playCue, prefersReducedMotion, sfx, wait } from "@/lib/fx";
import { useI18n } from "@/lib/i18n-context";
import type { MessageKey } from "@/lib/i18n";
import { BootCurtain, type BootCurtainPhase } from "@/components/boot-curtain";
import { CritterSprite, usePetClip } from "@/components/critter-sprite";
import { HeroMedia } from "@/components/hero-media";
import { IsleGrain } from "@/components/isle-grain";
import { Button } from "@/components/ui";
import { useHud } from "@/components/studio-shell";

function stackContentHeight(stack: HTMLElement) {
  const styles = getComputedStyle(stack);
  return Math.max(
    0,
    Math.round(
      stack.clientHeight -
        (parseFloat(styles.paddingTop) || 0) -
        (parseFloat(styles.paddingBottom) || 0),
    ),
  );
}

function guideCopy(spot: Exclude<Spotlight, null>): MessageKey {
  switch (spot) {
    case "hatch":
      return "guide.hatch";
    case "feed":
      return "guide.feed";
    case "play":
      return "guide.play";
    case "storm":
      return "guide.storm";
    case "replay":
      return "guide.replay";
    case "name":
      return "guide.rename";
    case "online":
      return "guide.online";
    case "server":
      return "guide.server";
  }
}

function GuideHit({
  on,
  label,
  className,
  tip = "above",
  children,
}: {
  on: boolean;
  label?: string;
  className?: string;
  tip?: "above" | "right";
  children: ReactNode;
}) {
  return (
    <div className={cn("relative", on && "z-50", className)}>
      {on && label ? (
        <span className={cn("guide-tip", tip === "right" && "guide-tip-right")} aria-hidden>
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function hugIsleHeight(lane: HTMLElement) {
  const board = lane.querySelector<HTMLElement>(".isle-board");
  if (!board) return Math.round(lane.getBoundingClientRect().height);
  const header = board.querySelector<HTMLElement>("[data-isle-bar]");
  const slot = board.querySelector<HTMLElement>(".isle-slot");
  const boardCs = getComputedStyle(board);
  const borderY =
    (parseFloat(boardCs.borderTopWidth) || 0) + (parseFloat(boardCs.borderBottomWidth) || 0);
  const headerH = header?.getBoundingClientRect().height ?? 0;
  if (!slot) return Math.round(headerH + borderY);
  const slotCs = getComputedStyle(slot);
  const slotPad =
    (parseFloat(slotCs.paddingTop) || 0) +
    (parseFloat(slotCs.paddingBottom) || 0) +
    (parseFloat(slotCs.borderTopWidth) || 0) +
    (parseFloat(slotCs.borderBottomWidth) || 0);
  const slotMargin = (parseFloat(slotCs.marginTop) || 0) + (parseFloat(slotCs.marginBottom) || 0);
  const gap = parseFloat(slotCs.rowGap || slotCs.gap) || 0;
  const kids = Array.from(slot.children) as HTMLElement[];
  const inner =
    kids.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0) +
    Math.max(0, kids.length - 1) * gap;
  return Math.round(headerH + slotPad + inner + slotMargin + borderY);
}

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

function StatPips({
  label,
  value,
  max,
  pulse,
  kind,
}: {
  label: string;
  value: number;
  max: number;
  pulse?: boolean;
  kind: "belly" | "mood" | "energy";
}) {
  const n = Math.max(0, Math.min(max, value));
  const hop = Boolean(pulse);
  // Idle pulse is pure CSS (pip-breathe); stagger rows so the three stats
  // don't shimmer in sync. Keep it smaller than anim-pip (the real hop).
  const breatheBase = kind === "belly" ? 0 : kind === "mood" ? 3100 : 6300;
  return (
    <div
      className={cn(
        "stat-inlay flex min-w-0 w-full items-center justify-center rounded-full px-1.5 py-1.5",
        kind === "belly" && "stat-inlay-belly bg-warn-dim",
        kind === "mood" && "stat-inlay-mood bg-info-dim",
        kind === "energy" && "stat-inlay-energy bg-[#f3e2ff]",
      )}
      aria-label={`${label} ${n}/${max}`}
    >
      <span className="flex items-end gap-1.5">
        {Array.from({ length: max }, (_, i) => {
          const on = i < n;
          if (kind === "belly") {
            return (
              <span
                key={i}
                className={cn(
                  "size-4 rounded-full border-2",
                  on
                    ? "border-[#c77812] bg-[#ff9600] shadow-[0_1px_0_#c77812]"
                    : "border-[#e8c96a]/80 bg-white/40",
                  on && (hop ? "anim-pip" : "pip-breathe"),
                )}
                style={{ animationDelay: `${(hop ? 0 : breatheBase) + i * 70}ms` }}
              />
            );
          }
          if (kind === "mood") {
            return (
              <span
                key={i}
                className={cn(
                  "mb-px size-3.5 rotate-45 rounded-[3px]",
                  on ? "bg-sky shadow-[0_1px_0_#1899d6]" : "bg-white/45",
                  on && (hop ? "anim-pip" : "pip-breathe"),
                )}
                style={{ animationDelay: `${(hop ? 0 : breatheBase) + i * 70}ms` }}
              />
            );
          }
          return (
            <span
              key={i}
              className={cn(
                "w-2 rounded-[3px]",
                i === 0 ? "h-2.5" : i === 1 ? "h-3.5" : "h-5",
                on ? "bg-grape shadow-[0_1px_0_#a568cc]" : "bg-white/45",
                on && (hop ? "anim-pip" : "pip-breathe"),
              )}
              style={{ animationDelay: `${(hop ? 0 : breatheBase) + i * 70}ms` }}
            />
          );
        })}
      </span>
    </div>
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
  detail?: string;
  entryId?: string;
  isle: ReplicaId;
};

function nextHatchSpecies(pets: Critter[]): Species {
  const present = new Set(pets.map((pet) => pet.species));
  return SPECIES.find((sp) => !present.has(sp)) ?? "pip";
}

function guidePetId(pets: Critter[], focusId: string | null, spot: Spotlight): string | null {
  if (spot !== "feed" && spot !== "play" && spot !== "name") return null;
  if (focusId && pets.some((pet) => pet.id === focusId)) return focusId;
  if (spot === "feed") return pets.find((pet) => pet.belly < MAX_BELLY)?.id ?? pets[0]?.id ?? null;
  if (spot === "play") {
    return pets.find((pet) => pet.belly > 0 && pet.energy > 0)?.id ?? pets[0]?.id ?? null;
  }
  return pets[0]?.id ?? null;
}

const CARD_ACTIONS = [
  {
    event: "Released" as const,
    spot: null,
    icon: "/icons/release.webp",
    label: "act.release" as const,
    vibe: "act-release rounded-lg border-[#b42323] bg-[linear-gradient(180deg,#ff8585_0%,#e23b3b_80%)] text-accent-fg",
  },
  {
    event: "Fed" as const,
    spot: "feed" as const,
    icon: "/icons/feed.webp",
    label: "act.feed" as const,
    vibe: "act-feed rounded-[1.35rem] border-[#c77812] bg-[linear-gradient(180deg,#ffc44d_0%,#ff9600_72%)] text-fg",
  },
  {
    event: "Played" as const,
    spot: "play" as const,
    icon: "/icons/play.webp",
    label: "act.play" as const,
    vibe: "act-play rounded-2xl border-sky-deep bg-[linear-gradient(165deg,#7ee0ff_0%,#1cb0f6_70%)] text-accent-fg",
  },
  {
    event: "Slept" as const,
    spot: null,
    icon: "/icons/sleep.webp",
    label: "act.sleep" as const,
    vibe: "act-sleep rounded-full border-[#7a4bb5] bg-[linear-gradient(180deg,#e4b8ff_0%,#ce82ff_78%)] text-accent-fg",
  },
];

/** Memoized: forge-step ticks during an action re-render Workshop ~1/s; cards
 * only need to redraw for their own pet's pulse/pending slice. */
const CritterCard = memo(function CritterCard({
  pet,
  spot,
  picked,
  busy,
  pulse,
  pending,
  onAct,
  onPick,
}: {
  pet: Critter;
  spot: Spotlight;
  picked: boolean;
  busy: boolean;
  pulse: Pulse | null;
  pending: Pending | null;
  onAct: (event: EventTag, pet: Critter, name?: string) => void;
  onPick: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pet.name);
  const mine = pulse?.petId === pet.id && pulse.ok;
  const waiting = pending?.petId === pet.id;
  const fx = mine ? pulse?.event : undefined;
  const sequenced = usePetClip(pet.species, "idle");
  const actions = CARD_ACTIONS;

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onPick();
      }}
      className={cn(
        "pet-paper relative z-10 grid shrink-0 grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1 overflow-visible rounded-[16px] px-2 pt-2 pb-1.5",
        picked && "ring-[3px] ring-inset ring-accent",
        waiting && "ring-2 ring-inset ring-dashed ring-sky",
        mine && "anim-flash",
        pulse?.petId === pet.id && !pulse.ok && "anim-shake",
      )}
    >
      <div className="absolute top-0 left-10 z-[60] w-max max-w-[5.5rem] -translate-x-1/2 -translate-y-[85%]">
        <GuideHit
          on={spot === "name"}
          label={t("guide.rename")}
          tip="right"
          className="w-full min-w-0"
        >
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
              className={cn(
                "name-edit name-edit-field h-7 w-[5.5rem] px-2 text-sm font-black text-fg",
                spot === "name" && "guide-spot",
              )}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(pet.name);
                setEditing(true);
              }}
              className={cn(
                "name-edit flex max-w-full items-center justify-center gap-0.5 px-2 py-0.5",
                spot === "name" && "guide-spot",
              )}
            >
              <span className="min-w-0 truncate text-sm font-black">{pet.name}</span>
              <span className="name-pencil-sway shrink-0">
                <img
                  src="/icons/pencil.webp"
                  alt=""
                  className="name-pencil size-4 object-contain"
                />
              </span>
            </button>
          )}
        </GuideHit>
      </div>
      <div className="relative z-50 h-14 w-16 overflow-visible">
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 size-16",
            !sequenced && mine && (fx === "Played" ? "anim-wiggle" : "anim-pop"),
          )}
        >
          <CritterSprite
            pet={pet}
            burst={fx}
            burstKey={mine ? pulse?.nonce : undefined}
            alt={pet.name}
          />
        </div>
        {fx === "Fed" || fx === "Played" || fx === "Slept" ? (
          <img
            key={pulse?.nonce}
            src={
              fx === "Fed"
                ? "/icons/feed.webp"
                : fx === "Played"
                  ? "/icons/play.webp"
                  : "/icons/sleep.webp"
            }
            alt=""
            className="act-burst pointer-events-none absolute -top-3 -right-2 z-20 size-8 object-contain"
          />
        ) : null}
      </div>
      <StatPips
        label={t("stat.belly")}
        value={pet.belly}
        max={MAX_BELLY}
        pulse={mine && fx === "Fed"}
        kind="belly"
      />
      <StatPips
        label={t("stat.mood")}
        value={pet.mood}
        max={MAX_MOOD}
        pulse={mine && fx === "Played"}
        kind="mood"
      />
      <StatPips
        label={t("stat.energy")}
        value={pet.energy}
        max={MAX_ENERGY}
        pulse={mine && fx === "Slept"}
        kind="energy"
      />
      {actions.map((action, actionIndex) => {
        const guided = Boolean(action.spot && spot === action.spot);
        return (
          <GuideHit
            key={action.event}
            on={guided}
            label={action.spot ? t(guideCopy(action.spot)) : t("guide.tap")}
            className="min-w-0 w-full"
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => onAct(action.event, pet)}
              aria-label={t(action.label)}
              className={cn(
                "chunk chunk-sm relative flex h-7 w-full items-center justify-center overflow-visible px-0",
                action.vibe,
                "disabled:cursor-not-allowed disabled:opacity-40",
                guided && "guide-spot",
                waiting && pending?.event === action.event && "brightness-110",
                mine && fx === action.event && "anim-pop",
              )}
            >
              <img
                src={action.icon}
                alt=""
                className="act-mark pointer-events-none relative z-[2] size-8 object-contain"
                style={{
                  animationDelay: `${actionIndex * 0.37}s`,
                  animationDuration: `${2.15 + actionIndex * 0.55}s`,
                }}
              />
            </button>
          </GuideHit>
        );
      })}
    </div>
  );
});

/** Memoized with stable callbacks from Workshop, so forge-tick renders skip
 * both boards entirely. */
const Isle = memo(function Isle({
  replica,
  locked,
  selected,
  stretch,
  lit,
  spot,
  busy,
  pulse,
  pending,
  online,
  unreachable,
  onAct,
  onStorm,
  onReplay,
  onToggleOnline,
  onPick,
  onFocusPet,
  onOpenLog,
  focusPetId,
}: {
  replica: Replica;
  locked: boolean;
  selected: boolean;
  stretch: boolean;
  lit: boolean;
  spot: Spotlight;
  busy: boolean;
  pulse: Pulse | null;
  pending: Pending | null;
  online: boolean;
  unreachable: boolean;
  onAct: (event: EventTag, pet: Critter, name?: string) => void;
  onStorm: () => void;
  onReplay: () => void;
  onToggleOnline: () => void;
  onPick: () => void;
  onFocusPet: (id: string) => void;
  onOpenLog: () => void;
  focusPetId: string | null;
}) {
  const { t } = useI18n();
  const pets = herd(replica);
  const sun = replica.id === "sun";
  const packed = pets.length >= MAX_HERD;
  const guidedId = guidePetId(pets, focusPetId, spot);
  return (
    <section
      onClick={onPick}
      className={cn(
        "isle-board relative flex w-full min-w-0 flex-col overflow-visible rounded-[20px] transition-[background,box-shadow] duration-200",
        stretch ? "h-full min-h-0 flex-1" : "h-auto",
        sun ? "isle-board-sun" : "isle-board-moon",
        selected &&
          (sun
            ? "isle-board-on ring-[3px] ring-inset ring-[#b8860b]"
            : "isle-board-on ring-[3px] ring-inset ring-sky-deep"),
        lit && "anim-flash",
      )}
    >
      <IsleGrain isle={sun ? "sun" : "moon"} />
      <div
        className="relative z-10 flex items-center justify-between gap-2 px-3 pt-4 pb-2"
        data-isle-bar
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLog();
          }}
          className={cn(
            "relative isolate flex min-h-8 min-w-0 items-center gap-1 overflow-visible rounded-full py-1 pr-2.5 pl-[calc(2.7rem+8px)] transition-colors duration-200",
            selected
              ? cn(
                  "border-b-[3px] shadow-[0_2px_0_rgba(59,42,20,0.14)]",
                  sun
                    ? "anim-isle-pick border-[#b8860b]/35 bg-raised"
                    : "anim-isle-pick-moon border-sky-deep/50 bg-sky text-accent-fg",
                )
              : "border-b-2 border-[#3b2a14]/10 bg-surface/90",
          )}
          aria-label={t("isle.vault")}
        >
          <img
            src={sun ? "/isles/sun.webp" : "/isles/moon.webp"}
            alt=""
            width={56}
            height={56}
            draggable={false}
            className="pointer-events-none absolute -left-1.5 top-1/2 z-10 size-14 -translate-y-[64%] object-contain drop-shadow-[0_5px_7px_rgba(59,42,20,0.32)]"
          />
          <span className="min-w-0 truncate text-sm font-black">
            {t(sun ? "isle.sun" : "isle.moon")}
          </span>
          <span
            className={cn(
              "shrink-0 text-[11px] font-black",
              selected && !sun ? "text-accent-fg/80" : "text-muted",
            )}
          >
            #{replica.journal.length}
          </span>
        </button>
        {locked ? null : (
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <GuideHit
              on={spot === "online" && !online}
              label={t("guide.online")}
              className="shrink-0"
            >
              <Button
                size="sm"
                variant={online ? "sky" : "quiet"}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleOnline();
                }}
                className={cn("h-7 px-2", spot === "online" && !online && "guide-spot")}
                aria-pressed={online || unreachable}
                aria-label={t(
                  online ? "isle.online" : unreachable ? "isle.unreachable" : "isle.offline",
                )}
              >
                {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
                <span className="text-[10px] font-black">
                  {t(online ? "isle.online" : unreachable ? "isle.unreachable" : "isle.offline")}
                </span>
              </Button>
            </GuideHit>
            {packed ? (
              <span
                className={cn(
                  "text-[11px] font-extrabold",
                  selected && !sun ? "text-accent-fg/80" : "text-muted",
                )}
              >
                {t("isle.full")}
              </span>
            ) : null}
            <GuideHit on={spot === "storm"} label={t("guide.storm")} className="shrink-0">
              <Button
                size="sm"
                variant="quiet"
                disabled={busy || replica.journal.length === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onStorm();
                }}
                className={cn("h-7 px-2", spot === "storm" && "guide-spot")}
                aria-label={t("isle.storm")}
              >
                <Wind className="size-3.5" />
                <span className="text-[10px] font-black">{t("isle.storm")}</span>
              </Button>
            </GuideHit>
            <GuideHit on={spot === "replay"} label={t("guide.replay")} className="shrink-0">
              <Button
                size="sm"
                variant="quiet"
                disabled={busy || replica.journal.length === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onReplay();
                }}
                className={cn("h-7 px-2", spot === "replay" && "guide-spot")}
                aria-label={t("isle.replay")}
              >
                <Undo2 className="size-3.5" />
                <span className="text-[10px] font-black">{t("isle.replay")}</span>
              </Button>
            </GuideHit>
          </div>
        )}
      </div>
      <div
        className={cn(
          "isle-slot relative z-10 mx-1.5 mb-1.5 flex flex-col rounded-[14px]",
          locked || pets.length === 0
            ? cn("items-center justify-center", stretch && "min-h-24 flex-1")
            : cn(
                "no-scrollbar gap-7 px-2 pt-8 pb-2",
                stretch
                  ? "min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain"
                  : "overflow-visible",
              ),
        )}
      >
        {locked ? (
          <p className="text-sm font-extrabold text-subtle">{t("isle.locked")}</p>
        ) : pets.length === 0 ? (
          <p className="text-sm font-extrabold text-subtle">{t("isle.empty")}</p>
        ) : (
          pets.map((pet) => (
            <CritterCard
              key={pet.id}
              pet={pet}
              spot={pet.id === guidedId ? spot : null}
              picked={pet.id === focusPetId}
              busy={busy}
              pulse={pulse && pulse.petId === pet.id ? pulse : null}
              pending={pending && pending.petId === pet.id ? pending : null}
              onAct={onAct}
              onPick={() => onFocusPet(pet.id)}
            />
          ))
        )}
      </div>
    </section>
  );
});

const TRACE_BEATS = 12;

function tracesOf(value: unknown): TraceSpan[] {
  if (Array.isArray(value)) return value as TraceSpan[];
  if (value && typeof value === "object" && "_tag" in value) {
    const tagged = value as { _tag: string; value?: unknown };
    if (tagged._tag === "Success" && Array.isArray(tagged.value))
      return tagged.value as TraceSpan[];
  }
  return [];
}

function TraceStrip({ spans }: { spans: TraceSpan[] }) {
  const beats = spans.slice(-TRACE_BEATS);
  return (
    <div className="trace-ecg" aria-label="trace">
      <span className="trace-ecg-line" aria-hidden />
      <ol className="trace-ecg-beats">
        {beats.map((span, index) => {
          const live = span.status === "Started";
          const dead = traceBeatFailed(span);
          return (
            <li key={span.spanId} className="trace-ecg-beat">
              {index > 0 ? <span className="trace-ecg-pipe" aria-hidden /> : null}
              <span
                className={cn(
                  "forge-chip trace-ecg-chip truncate px-1 py-0.5 text-center text-[9px] font-black leading-none tracking-tight",
                  dead && "anim-shake trace-ecg-chip-dead",
                  live && !dead && "anim-pipe-live trace-ecg-chip-on",
                  !live && !dead && "trace-ecg-chip-done",
                )}
              >
                {traceBeatLabel(span)}
              </span>
            </li>
          );
        })}
        <li className="trace-ecg-now" aria-hidden />
      </ol>
    </div>
  );
}

function ForgeToast({ spans }: { spans: TraceSpan[] }) {
  const failing = spans.at(-1) ? traceBeatFailed(spans.at(-1)!) : false;
  return (
    <div className="min-w-0 flex-1">
      <div className={cn("forge-plaque", failing && "is-fail")}>
        <div className="forge-plaque-inner">
          <span className="trace-kicker" aria-hidden>
            trace
          </span>
          <TraceStrip spans={spans} />
        </div>
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

  const node = (
    <div className="pointer-events-auto fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(59,42,20,0.46)]"
        onClick={onClose}
        aria-label="close events"
      />
      <div className="absolute top-[10%] left-1/2 flex max-h-[78%] w-[min(94%,420px)] -translate-x-1/2 flex-col overflow-hidden rounded-[28px] bg-raised shadow-[0_20px_50px_rgba(59,42,20,0.28)] ring-4 ring-fg/10">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-base font-black">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl bg-surface"
            aria-label="close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div
          ref={list}
          className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pt-1 pb-5"
        >
          {len === 0 && !attempt ? (
            <p className="rounded-2xl bg-surface px-3 py-4 text-sm font-bold text-subtle">
              {t("log.empty")}
            </p>
          ) : null}
          {sources.map((src) => (
            <div key={src.replica.id} className="space-y-2">
              {sources.length > 1 ? (
                <p className="text-[11px] font-black text-muted">
                  {src.label} · #{src.replica.journal.length}
                </p>
              ) : null}
              {src.replica.journal.map((e, i) => {
                const on = selectedId === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelect(on ? null : e.id)}
                    className={cn(
                      "w-full rounded-2xl px-3 py-2.5 text-left",
                      EVENT_TONE[e.event],
                      on && "ring-2 ring-inset ring-fg",
                    )}
                  >
                    <p className="font-mono text-[12px] font-black">
                      #{i + 1} {e.event}
                    </p>
                    <p className="break-all font-mono text-[11px] font-bold text-fg/80">
                      {payloadLine(e.payload)}
                    </p>
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
              <p className="break-all font-mono text-[11px] font-bold text-fg/70">
                {payloadLine(attempt.payload)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}

function GrokMark() {
  return (
    <svg viewBox="0 0 12 11.57" aria-hidden className="boot-mark-grok">
      <path
        fill="currentColor"
        d="M4.635 7.428 8.624 4.466c.196-.145.475-.088.568.137.491 1.19.272 2.619-.704 3.6-.976.981-2.334 1.197-3.575.707l-1.356.631c1.945 1.337 4.306 1.006 5.782-.479 1.17-1.177 1.533-2.781 1.194-4.228L10.536 4.837C10.044 2.711 10.657 1.862 11.911.125L12 0 10.349 1.66v-.005L4.634 7.429"
      />
      <path
        fill="currentColor"
        d="M3.811 8.147C2.416 6.807 2.656 4.732 3.847 3.535c.881-.886 2.324-1.247 3.583-.716l1.353-.628c-.244-.177-.556-.368-.915-.501C6.248 1.02 4.309 1.353 2.992 2.676 1.725 3.95 1.327 5.909 2.011 7.58c.511 1.249-.327 2.133-1.17 3.025L0 11.571l3.81-3.423"
      />
    </svg>
  );
}

const CREDIT_MARKS = {
  grok: () => <GrokMark />,
  phone: () => <Smartphone strokeWidth={2.4} />,
  spark: () => <Sparkles strokeWidth={2.4} />,
  pic: () => <Clapperboard strokeWidth={2.4} />,
} as const;

function CreditBits({ text }: { text: string }) {
  const parts = text.split(/\{(grok|phone|spark|pic)\}/g);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const Mark = CREDIT_MARKS[part as keyof typeof CREDIT_MARKS];
        return (
          <span key={`${part}-${i}`} className="boot-mark">
            <Mark />
          </span>
        );
      })}
    </>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function Workshop() {
  return (
    <RegistryProvider scheduleTask={scheduleAtomTask}>
      <WorkshopApp />
    </RegistryProvider>
  );
}

function WorkshopApp() {
  const { t } = useI18n();
  const { setNext, setLog, setSplash } = useHud();
  useAtomMount(islesRuntime);
  const sun = useAtomValue(sunReplicaAtom);
  const moon = useAtomValue(moonReplicaAtom);
  const progress = useAtomValue(progressAtom);
  const lesson = useAtomValue(lessonAtom);
  const busy = useAtomValue(busyAtom);
  const setBusy = useAtomSet(busyAtom);
  const setPlayhead = useAtomSet(playheadAtom);
  const online = readOnline(useAtomValue(onlineAtom));
  const writeEvent = useAtomSet(writeAtom, { mode: "promiseExit" });
  const setOnline = useAtomSet(setOnlineAtom, { mode: "promiseExit" });
  const setServer = useAtomSet(setServerAtom, { mode: "promiseExit" });
  const stormEvent = useAtomSet(stormAtom, { mode: "promiseExit" });
  const replayEvent = useAtomSet(replayAtom, { mode: "promiseExit" });
  const advanceLesson = useAtomSet(advanceAtom, { mode: "promiseExit" });
  const resetLesson = useAtomSet(resetAtom, { mode: "promiseExit" });
  const pickIsle = useAtomSet(pickIsleAtom, { mode: "promiseExit" });
  const traces = tracesOf(useAtomValue(tracesAtom));
  const serverUp = online.server;
  const mission = progress.mission;
  const active = progress.active;
  const won = lesson.complete;
  const [seated, setSeated] = useState(false);
  const [curtain, setCurtain] = useState<BootCurtainPhase | "off">("off");
  const [bootStep, setBootStep] = useState(0);
  const [landed, setLanded] = useState(false);
  const [lit, setLit] = useState<ReplicaId | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [focusPetId, setFocusPetId] = useState<string | null>(null);
  const [logView, setLogView] = useState<"all" | ReplicaId | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const run = useRef(0);

  const [moonLane, setMoonLane] = useState(false);
  const [moonIn, setMoonIn] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);
  const sunLaneRef = useRef<HTMLDivElement>(null);
  const sunMode = useRef<"boot" | "fill" | "hug" | "pair">("boot");
  const world = { sun, moon };
  const sunHerd = herd(world.sun).length;
  const hugSun = !moonIn && sunHerd > 0;
  const moonOpen = lesson.moonOpen;
  const spot: Spotlight = !won && !logView ? lesson.spotlight : null;
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

  const prevComplete = useRef(false);
  useEffect(() => {
    if (lesson.complete && !prevComplete.current && mission !== 0) sfx.win();
    prevComplete.current = lesson.complete;
  }, [lesson.complete, mission]);

  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (curtain !== "rise") return;
    const id = window.setTimeout(() => {
      setSeated(true);
      setCurtain((current) => (current === "rise" ? "hold" : current));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [curtain]);

  useEffect(() => {
    if (curtain !== "exit") return;
    const land = window.setTimeout(() => setLanded(true), 300);
    const done = window.setTimeout(() => setCurtain("off"), 1300);
    return () => {
      window.clearTimeout(land);
      window.clearTimeout(done);
    };
  }, [curtain]);

  useEffect(() => {
    if (curtain !== "hold") return;
    let alive = true;
    void (async () => {
      for (let i = 1; i <= 4; i++) {
        if (!alive) return;
        await wait(i === 1 ? 340 : 280);
        if (!alive) return;
        setBootStep(i);
        sfx.step();
      }
      await wait(720);
      if (!alive) return;
      playCue("arrival", 1);
      setCurtain("exit");
    })();
    return () => {
      alive = false;
    };
  }, [curtain]);

  useEffect(() => {
    if (moonOpen) {
      setMoonLane(true);
      let nested = 0;
      const outer = window.requestAnimationFrame(() => {
        nested = window.requestAnimationFrame(() => {
          setMoonIn(true);
          sfx.arrive();
        });
      });
      return () => {
        window.cancelAnimationFrame(outer);
        window.cancelAnimationFrame(nested);
      };
    }
    setMoonIn(false);
    const hide = window.setTimeout(() => setMoonLane(false), prefersReducedMotion() ? 0 : 1700);
    return () => window.clearTimeout(hide);
  }, [moonOpen]);

  // Sun lane height machine. Three modes:
  // - "fill": no inline height — CSS `height: 100%` keeps the lane full even
  //   while the shell is still settling after boot (first paint is correct
  //   with zero JS involved).
  // - "hug": inline pixel height equal to the isle's intrinsic content.
  // - "pair": inline height cleared — the `is-pair` grid rows own the split.
  // Transitions between modes always animate px → px (FLIP), never from a
  // percentage, so the very first fill → hug shrink interpolates too.
  useLayoutEffect(() => {
    const stack = stackRef.current;
    const sun = sunLaneRef.current;
    if (!stack || !sun) return;
    const prev = sunMode.current;
    const mode = moonIn ? "pair" : hugSun ? "hug" : "fill";
    sunMode.current = mode;

    // Applies a height write with the transition suppressed for one layout pass.
    const snap = (apply: () => void) => {
      sun.classList.add("sun-lane-snap");
      apply();
      void sun.offsetHeight;
      sun.classList.remove("sun-lane-snap");
    };
    const release = () =>
      snap(() => {
        sun.style.height = "";
      });

    if (mode === "pair") {
      if (!sun.style.height) return; // already CSS-driven; grid rows animate the split
      if (prefersReducedMotion()) {
        release();
        return;
      }
      if (prev === "hug") {
        // Glide the pinned hug height toward the lane's half of the stack
        // while the grid rows split, then hand control back to CSS 100%.
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const half = Math.max(0, Math.round((stackContentHeight(stack) - rem * 0.5) / 2));
        sun.style.height = `${half}px`;
      }
      const settle = window.setTimeout(() => {
        if (sunMode.current === "pair") release();
      }, 1750);
      return () => window.clearTimeout(settle);
    }

    if (mode === "hug") {
      const to = hugIsleHeight(sun);
      if (prev === "boot" || prefersReducedMotion()) {
        snap(() => {
          sun.style.height = `${to}px`;
        });
        return;
      }
      // FLIP: pin the currently painted height in pixels first, so even the
      // first shrink (starting from CSS `height: 100%`) interpolates.
      const rect = Math.round(sun.getBoundingClientRect().height);
      const from = sun.style.height ? rect : Math.max(rect, stackContentHeight(stack));
      if (Math.abs(from - to) < 2) {
        snap(() => {
          sun.style.height = `${to}px`;
        });
        return;
      }
      snap(() => {
        sun.style.height = `${from}px`;
      });
      let outer = 0;
      let inner = 0;
      outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => {
          // Re-measure: a freshly hatched card has finished layout by now.
          sun.style.height = `${hugIsleHeight(sun)}px`;
        });
      });
      return () => {
        window.cancelAnimationFrame(outer);
        window.cancelAnimationFrame(inner);
      };
    }

    // mode === "fill"
    if (!sun.style.height) return; // already on CSS `height: 100%`
    if (prev === "boot" || prefersReducedMotion()) {
      release();
      return;
    }
    const to = stackContentHeight(stack);
    if (Math.abs(Math.round(sun.getBoundingClientRect().height) - to) < 2) {
      release();
      return;
    }
    sun.style.height = `${to}px`;
    const done = (event: TransitionEvent) => {
      if (event.propertyName !== "height") return;
      sun.removeEventListener("transitionend", done);
      // Hand back to CSS so later shell resizes keep the lane full.
      if (sunMode.current === "fill") release();
    };
    sun.addEventListener("transitionend", done);
    return () => sun.removeEventListener("transitionend", done);
    // `seated` matters: the lane refs are null until the play shell mounts, so
    // this effect must re-run then to resolve "boot" → "fill" before the first
    // real transition (otherwise the first hatch snaps instead of animating).
  }, [seated, moonIn, hugSun, sunHerd]);

  function beginPlay() {
    armAudio();
    if (prefersReducedMotion()) {
      setSeated(true);
      setLanded(true);
      return;
    }
    playCue("loading", 1);
    setBootStep(0);
    setCurtain("rise");
  }

  async function act(isle: ReplicaId, event: EventTag, payload: Record<string, unknown>) {
    if (busy) return;
    const token = ++run.current;
    setBusy(true);
    sfx.stamp();
    const exit = await writeEvent({ isle, event, payload });
    const result = Exit.isSuccess(exit)
      ? exit.value
      : { ok: false as const, error: "jam", detail: String(exit.cause) };
    const committed = result.ok && result.entry.id.length > 0;
    const petId = String((committed ? result.entry.payload.id : payload.id) ?? "");
    if (petId) setFocusPetId(petId);
    setAttempt({
      event,
      payload: committed ? result.entry.payload : payload,
      ok: committed,
      error: committed ? undefined : result.ok ? "jam" : result.error,
      detail: committed ? undefined : result.ok ? "write returned an empty journal id" : result.detail,
      entryId: committed ? result.entry.id : undefined,
      isle,
    });
    setPending(null);
    if (committed) {
      setLit(isle);
      sfx.commit();
      setPicked(result.entry.id);
      setPulse({ petId, event, ok: true, nonce: Date.now() });
    } else {
      sfx.reject();
      setPulse({ petId, event, ok: false, nonce: Date.now() });
    }
    await wait(committed ? 480 : 640);
    if (run.current !== token) return;
    setBusy(false);
    window.setTimeout(() => {
      if (run.current === token) setLit(null);
    }, 420);
  }

  // Stable per-isle callbacks (latest handlers via ref) so the memoized
  // Isle/CritterCard trees skip unrelated parent renders during actions.
  const isleHandlers = useRef({ act, storm, doReplay, toggleOnline, focusPet: setFocusPetId });
  isleHandlers.current = { act, storm, doReplay, toggleOnline, focusPet: setFocusPetId };
  const isleCallbacks = useMemo(() => {
    const forIsle = (isle: ReplicaId) => ({
      onAct: (event: EventTag, pet: Critter, name?: string) => {
        isleHandlers.current.focusPet(pet.id);
        void isleHandlers.current.act(
          isle,
          event,
          event === "Named" ? { id: pet.id, name } : { id: pet.id },
        );
      },
      onStorm: () => void isleHandlers.current.storm(isle),
      onReplay: () => void isleHandlers.current.doReplay(isle),
      onToggleOnline: () => void isleHandlers.current.toggleOnline(isle),
      onPick: () => void pickIsle(isle),
      onFocusPet: (id: string) => isleHandlers.current.focusPet(id),
      onOpenLog: () => setLogView(isle),
    });
    return { sun: forIsle("sun"), moon: forIsle("moon") };
  }, []);

  async function hatch(species: Species) {
    const isle = moonOpen ? active : "sun";
    const id = newCritterId();
    setFocusPetId(id);
    void act(isle, "Hatched", { id, species, name: defaultName(species) });
  }

  async function toggleOnline(isle: ReplicaId) {
    if (busy) return;
    const next = !online[isle];
    setBusy(true);
    await setOnline({ isle, online: next });
    setBusy(false);
  }

  async function toggleServer() {
    if (busy) return;
    const next = !serverUp;
    setBusy(true);
    await setServer(next);
    setBusy(false);
  }

  async function storm(id: ReplicaId) {
    if (busy || world[id].journal.length === 0) return;
    setBusy(true);
    sfx.wipe();
    await stormEvent(id);
    setPulse({ ok: false, nonce: Date.now() });
    await wait(900);
    setBusy(false);
  }

  async function doReplay(id: ReplicaId) {
    if (busy || world[id].journal.length === 0) return;
    setBusy(true);
    const replica = world[id];
    setPlayhead((current) => setIslePlayhead(current, id, 0));
    for (let i = 0; i < replica.journal.length; i++) {
      const entry = replica.journal[i];
      setPicked(entry.id);
      setPulse({ petId: entry.primaryKey, event: entry.event, ok: true, nonce: Date.now() });
      setPlayhead((current) => setIslePlayhead(current, id, i + 1));
      sfx.rebuild();
      await wait(750);
    }
    await replayEvent(id);
    setBusy(false);
  }

  function advance() {
    void advanceLesson(undefined);
  }

  function reset() {
    run.current += 1;
    void resetLesson(undefined);
    setLogView(null);
    setAttempt(null);
    setPulse(null);
    setPending(null);
    setFocusPetId(null);
  }

  useEffect(() => {
    if (!won) {
      setNext(null);
      return;
    }
    setNext({
      label: mission === LAST_MISSION ? t("hud.free") : t("hud.next"),
      onClick: advance,
    });
    return () => setNext(null);
  }, [won, mission, t, setNext]);

  const title = mission === 0 ? t("ms.free.title") : t(`ms.${mission}.title` as MessageKey);
  const hint = mission === 0 ? t("ms.free.hint") : t(`ms.${mission}.hint` as MessageKey);
  const win = mission === 0 ? "" : t(`ms.${mission}.win` as MessageKey);

  const boot =
    curtain !== "off" ? (
      <BootCurtain
        key="boot-curtain"
        phase={curtain}
        step={bootStep}
        onRiseEnd={() => {
          setSeated(true);
          setCurtain((current) => (current === "rise" ? "hold" : current));
        }}
        onExitEnd={() => {
          setCurtain("off");
        }}
      />
    ) : null;

  return (
    <>
      {!seated ? (
        <div className="flex h-full min-h-0 flex-col">
          <div
            aria-hidden
            className="shrink-0 bg-hero-sky h-[max(4.75rem,calc(env(safe-area-inset-top)+4rem))] sm:h-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] lg:h-0"
          />
          <HeroMedia />
          <div className="relative z-10 -mt-8 flex shrink-0 flex-col gap-3 px-4 pb-2 sm:px-6">
            <p className="boot-headline min-h-[2.2em] font-display text-[36px] leading-[1.05] font-bold tracking-tight sm:min-h-[1.1em] sm:text-5xl">
              <span className="boot-headline-ink">{t("boot.title")}</span>
              <span className="boot-headline-mask" aria-hidden>
                <span className="boot-headline-tide">{t("boot.title")}</span>
              </span>
            </p>
            <p className="min-h-[3.25em] max-w-md text-base leading-snug font-semibold text-muted">
              {t("boot.body")}
            </p>
            <div className="relative left-1/2 w-[90vw] -translate-x-1/2">
              <Button
                size="lg"
                className="h-14 w-full text-lg"
                disabled={curtain !== "off"}
                onClick={beginPlay}
              >
                {t("boot.go")}
              </Button>
            </div>
            <div className="relative left-1/2 w-[90vw] -translate-x-1/2 grid grid-cols-1 gap-2.5 text-[13px] font-semibold leading-snug text-muted sm:gap-3 sm:text-sm lg:grid-cols-3">
              <div className="boot-note boot-note-who flex items-center gap-2">
                <p className="min-w-0 flex-1">
                  <CreditBits text={t("boot.credit")} />{" "}
                  <a
                    href="https://x.com/xesrevinu"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-fg"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-current">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.829L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                    </svg>
                    <span className="underline decoration-2 underline-offset-2">Ray</span>
                  </a>
                </p>
                <a
                  href="https://github.com/xesrevinu/effect-event-log-isles"
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("boot.github")}
                  title={t("boot.github")}
                  className="boot-github"
                >
                  <GithubMark className="size-4" />
                </a>
              </div>
              <div className="boot-note boot-note-make space-y-1.5">
                <p>
                  <CreditBits text={t("boot.made")} />
                </p>
                <p>
                  <CreditBits text={t("boot.art")} />
                </p>
              </div>
              <div className="boot-note boot-note-effect space-y-1.5">
                <p>
                  <CreditBits text={t("boot.effect")} />
                </p>
                <p>
                  <a
                    href="https://effect.website"
                    target="_blank"
                    rel="noreferrer"
                    className="text-fg underline decoration-2 underline-offset-2"
                  >
                    {t("boot.site")}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "boot-stage relative flex h-full min-h-0 flex-col gap-1",
            landed && "is-landed",
          )}
        >
          <div className="boot-arrive boot-arrive-copy shrink-0">
            <div className="relative flex h-5 items-center gap-1.5">
              <div className="flex min-w-0 flex-1 gap-0.5">
                {MISSION_IDS.map((n) => {
                  const filled = mission === 0 || n < mission || (n === mission && won);
                  const here = mission !== 0 && n === mission && !won;
                  return (
                    <span
                      key={n}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        filled && "bg-warn",
                        here && "bg-grape",
                        !filled && !here && "bg-[#e6d8c4]",
                      )}
                    />
                  );
                })}
              </div>
              {mission === 0 ? null : (
                <span className="shrink-0 rounded-full bg-surface px-1.5 py-px text-[10px] font-black leading-none text-subtle">
                  {t("hud.step", { n: mission })}
                </span>
              )}
            </div>
            <div className="isle-copy mt-0.5 min-w-0">
              <p className="line-clamp-2 text-lg font-black leading-snug">{won ? win : title}</p>
              <p className="line-clamp-2 text-sm leading-snug font-semibold text-muted">
                {won ? title : hint}
              </p>
            </div>
          </div>

          <div className="boot-arrive boot-arrive-isle relative z-0 min-h-0 flex-1 overflow-visible">
            <div
              ref={stackRef}
              className={cn(
                "isle-stack h-full min-h-0 p-0.5",
                moonIn && "is-pair",
                moonIn && (active === "sun" ? "is-focus-sun" : "is-focus-moon"),
              )}
            >
              <div ref={sunLaneRef} className="sun-lane" onClick={() => void pickIsle("sun")}>
                <Isle
                  replica={world.sun}
                  locked={false}
                  selected={active === "sun"}
                  stretch
                  lit={lit === "sun"}
                  spot={spot}
                  busy={busy}
                  pulse={pulse}
                  pending={pending}
                  online={online.sun && serverUp}
                  unreachable={online.sun && !serverUp}
                  focusPetId={focusPetId}
                  {...isleCallbacks.sun}
                />
              </div>
              {moonLane ? (
                <div
                  className="isle-moon-lane"
                  inert={!moonIn}
                  onClick={() => void pickIsle("moon")}
                >
                  <div className="isle-moon-board">
                    <Isle
                      replica={world.moon}
                      locked={false}
                      selected={active === "moon"}
                      stretch
                      lit={lit === "moon"}
                      spot={spot}
                      busy={busy}
                      pulse={pulse}
                      pending={pending}
                      online={online.moon && serverUp}
                      unreachable={online.moon && !serverUp}
                      focusPetId={focusPetId}
                      {...isleCallbacks.moon}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative z-50 flex shrink-0 items-center gap-1 px-0.5">
            <ForgeToast spans={traces} />
            {moonLane ? (
              <GuideHit on={spot === "server"} label={t("guide.server")} className="flex shrink-0">
                <Button
                  size="sm"
                  variant={serverUp ? "sky" : "danger"}
                  className={cn(
                    "h-8 w-[7rem] shrink-0 px-2 text-[11px]",
                    spot === "server" && "guide-spot",
                  )}
                  disabled={busy}
                  onClick={() => void toggleServer()}
                  aria-pressed={serverUp}
                >
                  {serverUp ? <Server className="size-3" /> : <ServerOff className="size-3" />}
                  <span className="grid min-w-0 flex-1">
                    <span className="invisible col-start-1 row-start-1 truncate">
                      {t("net.serverDown")}
                    </span>
                    <span className="col-start-1 row-start-1 truncate">
                      {t(serverUp ? "net.server" : "net.serverDown")}
                    </span>
                  </span>
                </Button>
              </GuideHit>
            ) : null}
          </div>
          <div className="relative z-50 flex shrink-0 flex-col">
            <div className="relative z-50 grid shrink-0 grid-cols-4 items-end gap-1.5 pt-8">
              {SPECIES.map((sp, index) => {
                const pets = herd(world[active]);
                const full = !lesson.controls.hatch.enabled || pets.length >= MAX_HERD;
                const guidedHatch = nextHatchSpecies(pets);
                const needOther = spot === "hatch" && pets.length > 0 && pets.length < MAX_HERD;
                const blocked = full || (needOther && pets.some((pet) => pet.species === sp));
                return (
                  <div
                    key={sp}
                    style={{ ["--i" as string]: index }}
                    className="boot-arrive boot-arrive-dock relative"
                  >
                    <Button
                      variant={sp === "pip" ? "sun" : sp === "nub" ? "sky" : "primary"}
                      aria-disabled={blocked}
                      onClick={() => {
                        if (!blocked) void hatch(sp);
                      }}
                      className={cn(
                        "relative h-11 w-full px-1 text-xs",
                        spot === "hatch" && sp === guidedHatch && "guide-spot",
                      )}
                    >
                      {sp === "pip" ? "Pip" : sp === "nub" ? "Nub" : "Bean"}
                    </Button>
                    <span
                      className="absolute bottom-[42%] left-1/2 z-20 size-[4.5rem] -translate-x-1/2 cursor-pointer"
                      onClick={() => {
                        if (!blocked) void hatch(sp);
                      }}
                    >
                      {/* Static ground shadow: filter drop-shadow on a canvas
                          that repaints ~10x/s re-blurs every frame. */}
                      <span
                        aria-hidden
                        className="absolute bottom-0.5 left-1/2 h-2.5 w-12 -translate-x-1/2 rounded-full bg-[rgba(59,42,20,0.24)] blur-[3px]"
                      />
                      <CritterSprite
                        roam
                        pet={{ species: sp, stage: "kid", belly: 2, mood: 2, energy: 2 }}
                        alt={sp}
                      />
                      {spot === "hatch" && sp === guidedHatch ? (
                        <span className="guide-tip" aria-hidden>
                          {t("guide.hatch")}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
              <Button
                variant="quiet"
                disabled={busy}
                onClick={reset}
                style={{ ["--i" as string]: SPECIES.length }}
                className="boot-arrive boot-arrive-dock h-11 text-xs"
              >
                {t("hud.again")}
              </Button>
            </div>
          </div>
          {logView ? (
            <EventsDialog
              title={
                logView === "all" ? t("log.all") : t(logView === "sun" ? "isle.sun" : "isle.moon")
              }
              sources={
                logView === "all"
                  ? [
                      { label: t("isle.sun"), replica: world.sun },
                      { label: t("isle.moon"), replica: world.moon },
                    ]
                  : [
                      {
                        label: t(logView === "sun" ? "isle.sun" : "isle.moon"),
                        replica: world[logView],
                      },
                    ]
              }
              attempt={attempt && (logView === "all" || attempt.isle === logView) ? attempt : null}
              selectedId={picked}
              onSelect={setPicked}
              onClose={() => setLogView(null)}
            />
          ) : null}
        </div>
      )}
      {boot}
    </>
  );
}
