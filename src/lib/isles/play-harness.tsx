import { RegistryProvider, useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Struct } from "effect";
import type { ReactNode } from "react";
import { expect } from "vitest";
import { renderHook } from "vitest-browser-react";
import {
  defaultName,
  newCritterId,
  type ReplicaId,
  type Species,
  type WriteResult,
} from "@/lib/critter-sim";
import {
  advanceAtom,
  ferryAtom,
  islesRuntime,
  lessonAtom,
  moonReplicaAtom,
  onlineAtom,
  progressAtom,
  replayAtom,
  scheduleAtomTask,
  setOnlineAtom,
  setServerAtom,
  stormAtom,
  sunReplicaAtom,
  writeAtom,
} from "@/lib/isles/atoms";
import { readOnline, type FerryResult } from "@/lib/isles/runtime";
import { emptyFlags, type MissionId } from "@/lib/missions";
import { Progress } from "@/lib/session";

function AtomRoot({ children, mission }: { children: ReactNode; mission?: MissionId | 0 }) {
  const initialValues =
    mission === undefined
      ? undefined
      : [
          [
            progressAtom,
            Progress.make({
              mission,
              flags: emptyFlags(),
              active: "sun",
            }),
          ] as const,
        ];
  return (
    <RegistryProvider scheduleTask={scheduleAtomTask} initialValues={initialValues}>
      {children}
    </RegistryProvider>
  );
}

export function writeOk(exit: Exit.Exit<WriteResult, unknown>) {
  return Exit.isSuccess(exit) && exit.value.ok;
}

function usePlay() {
  useAtomMount(islesRuntime);
  const sun = useAtomValue(sunReplicaAtom);
  const moon = useAtomValue(moonReplicaAtom);
  const progress = useAtomValue(progressAtom);
  const lesson = useAtomValue(lessonAtom);
  const runtime = useAtomValue(islesRuntime);
  const online = readOnline(useAtomValue(onlineAtom));
  const setProgress = useAtomSet(progressAtom);
  const writeEvent = useAtomSet(writeAtom, { mode: "promiseExit" });
  const ferryEvents = useAtomSet(ferryAtom, { mode: "promiseExit" });
  const stormEvent = useAtomSet(stormAtom, { mode: "promiseExit" });
  const replayEvent = useAtomSet(replayAtom, { mode: "promiseExit" });
  const advanceLesson = useAtomSet(advanceAtom, { mode: "promiseExit" });
  const setOnlineEvent = useAtomSet(setOnlineAtom, { mode: "promiseExit" });
  const setServerEvent = useAtomSet(setServerAtom, { mode: "promiseExit" });
  return {
    sun,
    moon,
    progress,
    lesson,
    online,
    ready: runtime._tag === "Success",
    seek(mission: MissionId | 0) {
      setProgress((current) => Progress.make(Struct.evolve(current, { mission: () => mission })));
    },
    async hatch(species: Species = "pip", isle: ReplicaId = "sun") {
      const id = newCritterId();
      const exit = await writeEvent({
        isle,
        event: "Hatched",
        payload: { id, species, name: defaultName(species) },
      });
      return { id, ok: writeOk(exit), exit };
    },
    async write(
      event: "Fed" | "Named" | "Played" | "Slept",
      payload: Record<string, unknown>,
      isle: ReplicaId = "sun",
    ) {
      return writeEvent({ isle, event, payload });
    },
    async ferry(from: ReplicaId = "sun", to: ReplicaId = "moon", compact = false) {
      const exit = await ferryEvents({ from, to, compact });
      const imported = Exit.isSuccess(exit) ? (exit.value as FerryResult).imported : 0;
      return { exit, imported };
    },
    storm: (isle: ReplicaId = "sun") => stormEvent(isle),
    replay: (isle: ReplicaId = "sun") => replayEvent(isle),
    advance: () => advanceLesson(undefined),
    setOnline: (isle: ReplicaId, online: boolean) => setOnlineEvent({ isle, online }),
    setServer: (up: boolean) => setServerEvent(up),
  };
}

export async function mountPlay(mission?: MissionId | 0) {
  const wrapper =
    mission === undefined
      ? AtomRoot
      : function Root({ children }: { children: ReactNode }) {
          return <AtomRoot mission={mission}>{children}</AtomRoot>;
        };
  const hook = await renderHook(() => usePlay(), { wrapper });
  await expect.poll(() => hook.result.current.ready).toBe(true);
  return hook;
}

export async function playAt(hook: Awaited<ReturnType<typeof mountPlay>>, mission: MissionId | 0) {
  hook.result.current.seek(mission);
  await expect.poll(() => hook.result.current.progress.mission).toBe(mission);
}
