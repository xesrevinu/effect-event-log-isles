import { expect, it } from "vitest";
import { traceBeatFailed, traceBeatLabel, type TraceSpan } from "@/lib/isles/trace";

const span = (name: string, attributes: TraceSpan["attributes"] = {}): TraceSpan => ({
  spanId: "s",
  name,
  attributes,
  status: "Ended",
  ok: true,
});

it("labels write spans by event tag", () => {
  expect(traceBeatLabel(span("isles.write", { event: "Hatched", ok: true }))).toBe("Hatched");
  expect(traceBeatLabel(span("isles.write", { event: "Fed", ok: false }))).toBe("Fed");
  expect(traceBeatFailed(span("isles.write", { event: "Fed", ok: false }))).toBe(true);
});

it("labels isle operations without a fake pipeline", () => {
  expect(traceBeatLabel(span("isles.ferry"))).toBe("ferry");
  expect(traceBeatLabel(span("isles.storm"))).toBe("storm");
  expect(traceBeatLabel(span("isles.setOnline", { online: false }))).toBe("offline");
  expect(traceBeatLabel(span("isles.setServer", { up: true }))).toBe("server");
});
