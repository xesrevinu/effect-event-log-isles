import { replay, type Replica, type ReplicaId } from "@/lib/critter-sim";
import type { ViewEntry } from "@/lib/isles/decode";

const LABELS: Record<ReplicaId, string> = { sun: "Sun", moon: "Moon" };

export function viewReplica(
  id: ReplicaId,
  journal: readonly ViewEntry[],
  playhead: number | null,
): Replica {
  const visible = playhead === null ? journal : journal.slice(0, playhead);
  return {
    id,
    label: LABELS[id],
    journal: [...journal],
    projection: replay(visible),
    remoteCursor: {},
    seq: journal.length,
  };
}
