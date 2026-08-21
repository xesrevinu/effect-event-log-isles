import { Effect, SubscriptionRef } from "effect";
import { describe, expect, it } from "vitest";
import { defaultName, newCritterId } from "@/lib/critter-sim";
import { Isles, layerIsles } from "@/lib/isles/runtime";
import { IsleTrace, type TraceSpan } from "@/lib/isles/trace";

const provide = <A, E>(effect: Effect.Effect<A, E, Isles | IsleTrace>) =>
  Effect.runPromise(Effect.scoped(effect.pipe(Effect.provide(layerIsles("memory")))));

const eventually = <A, E, R>(read: Effect.Effect<A, E, R>, pred: (value: A) => boolean) =>
  Effect.gen(function* () {
    for (let i = 0; i < 100; i++) {
      const value = yield* read;
      if (pred(value)) return value;
      yield* Effect.sleep(30);
    }
    return yield* Effect.die("timed out waiting for sync");
  });

describe("Isles EventLog", () => {
  it("commits a hatch and leaves the journal unchanged on stuffed reject", async () => {
    const result = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        const id = newCritterId();
        const hatched = yield* isles.write("sun", "Hatched", {
          id,
          species: "pip",
          name: defaultName("pip"),
        });
        const afterHatch = yield* isles.entries("sun");
        const fed = yield* isles.write("sun", "Fed", { id });
        const stuffed = yield* isles.write("sun", "Fed", { id });
        const afterReject = yield* isles.entries("sun");
        return { hatched, afterHatch, fed, stuffed, afterReject };
      }),
    );

    expect(result.hatched.ok).toBe(true);
    if (result.hatched.ok) {
      expect(result.hatched.entry.id.length).toBeGreaterThan(0);
      expect(result.hatched.entry.event).toBe("Hatched");
    }
    expect(result.afterHatch.map((entry) => entry.event)).toEqual(["Hatched"]);
    expect(result.fed.ok).toBe(true);
    expect(result.stuffed).toEqual({ ok: false, error: "stuffed" });
    expect(result.afterReject.map((entry) => entry.event)).toEqual(["Hatched", "Fed"]);
  });

  it("ferries events, not a copied island, and reports Named conflicts", async () => {
    const result = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        const id = newCritterId();
        yield* isles.write("sun", "Hatched", {
          id,
          species: "nub",
          name: defaultName("nub"),
        });
        const first = yield* isles.ferry("sun", "moon", false);
        yield* isles.write("sun", "Named", { id, name: "Sol" });
        yield* isles.write("moon", "Named", { id, name: "Luna" });
        const second = yield* isles.ferry("sun", "moon", false);
        const moon = yield* isles.entries("moon");
        return { first, second, moon };
      }),
    );

    expect(result.first.imported).toBeGreaterThan(0);
    expect(result.moon.some((entry) => entry.event === "Hatched")).toBe(true);
    expect(result.second.conflicts).toBeGreaterThan(0);
    expect(result.moon.filter((entry) => entry.event === "Named").length).toBeGreaterThan(1);
  });

  it("folds on ferry into a Snapshot instead of rewriting the source journal", async () => {
    const result = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        const id = newCritterId();
        yield* isles.write("sun", "Hatched", {
          id,
          species: "bean",
          name: defaultName("bean"),
        });
        yield* isles.write("sun", "Played", { id });
        yield* isles.write("sun", "Slept", { id });
        const sunBefore = yield* isles.entries("sun");
        const folded = yield* isles.ferry("sun", "moon", true);
        const sunAfter = yield* isles.entries("sun");
        const moon = yield* isles.entries("moon");
        return { sunBefore, sunAfter, folded, moon };
      }),
    );

    expect(result.sunBefore).toHaveLength(3);
    expect(result.sunAfter).toHaveLength(3);
    expect(result.folded.compacted).toBe(true);
    expect(result.moon.map((entry) => entry.event)).toEqual(["Snapshot"]);
    expect(result.moon.length).toBeLessThan(result.sunAfter.length);
  });

  it("keeps the two clients offline until a manual ferry through the server", async () => {
    const result = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        const id = newCritterId();
        yield* isles.write("sun", "Hatched", {
          id,
          species: "pip",
          name: defaultName("pip"),
        });
        yield* isles.ferry("sun", "moon", false);
        yield* isles.write("sun", "Played", { id });
        const moonBeforeBack = yield* isles.entries("moon");
        const again = yield* isles.ferry("sun", "moon", false);
        const back = yield* isles.ferry("moon", "sun", false);
        const sun = yield* isles.entries("sun");
        const moon = yield* isles.entries("moon");
        return { moonBeforeBack, again, back, sun, moon };
      }),
    );

    expect(result.moonBeforeBack.map((entry) => entry.event)).toEqual(["Hatched"]);
    expect(result.again.imported).toBe(1);
    expect(result.moon.map((entry) => entry.event)).toEqual(["Hatched", "Played"]);
    expect(result.back.imported).toBe(0);
    expect(result.sun.map((entry) => entry.event)).toEqual(["Hatched", "Played"]);
  });

  it("auto-merges both ways while both clients are online", async () => {
    const result = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        const id = newCritterId();
        yield* isles.setOnline("sun", true);
        yield* isles.setOnline("moon", true);
        yield* isles.write("sun", "Hatched", {
          id,
          species: "pip",
          name: defaultName("pip"),
        });
        const moonLive = yield* eventually(isles.entries("moon"), (rows) =>
          rows.some((entry) => entry.event === "Hatched"),
        );
        yield* isles.write("moon", "Named", { id, name: "Luna" });
        const sunLive = yield* eventually(isles.entries("sun"), (rows) =>
          rows.some((entry) => entry.event === "Named"),
        );
        return { moonLive, sunLive };
      }),
    );

    expect(result.moonLive.some((entry) => entry.event === "Hatched")).toBe(true);
    expect(result.sunLive.some((entry) => entry.event === "Named")).toBe(true);
  });

  it("lets one client drop offline, then catch up on reconnect", async () => {
    const result = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        const id = newCritterId();
        yield* isles.setOnline("sun", true);
        yield* isles.write("sun", "Hatched", {
          id,
          species: "pip",
          name: defaultName("pip"),
        });
        yield* Effect.sleep(80);
        const moonWhileOffline = yield* isles.entries("moon");
        yield* isles.write("sun", "Played", { id });
        yield* isles.setOnline("moon", true);
        const moonCaughtUp = yield* eventually(isles.entries("moon"), (rows) =>
          rows.some((entry) => entry.event === "Played"),
        );
        yield* isles.setOnline("moon", false);
        yield* isles.write("sun", "Slept", { id });
        yield* Effect.sleep(80);
        const moonDropped = yield* isles.entries("moon");
        yield* isles.setOnline("moon", true);
        const moonRejoined = yield* eventually(isles.entries("moon"), (rows) =>
          rows.some((entry) => entry.event === "Slept"),
        );
        return { moonWhileOffline, moonCaughtUp, moonDropped, moonRejoined };
      }),
    );

    expect(result.moonWhileOffline).toEqual([]);
    expect(result.moonCaughtUp.map((entry) => entry.event)).toEqual(["Hatched", "Played"]);
    expect(result.moonDropped.some((entry) => entry.event === "Slept")).toBe(false);
    expect(result.moonRejoined.map((entry) => entry.event)).toEqual(["Hatched", "Played", "Slept"]);
  });

  it("drops live remotes when the server goes down, then catches up when it returns", async () => {
    const result = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        const id = newCritterId();
        yield* isles.setOnline("sun", true);
        yield* isles.setOnline("moon", true);
        yield* isles.write("sun", "Hatched", {
          id,
          species: "pip",
          name: defaultName("pip"),
        });
        yield* eventually(isles.entries("moon"), (rows) =>
          rows.some((entry) => entry.event === "Hatched"),
        );
        yield* isles.setServer(false);
        yield* isles.write("sun", "Played", { id });
        yield* Effect.sleep(80);
        const moonWhileDown = yield* isles.entries("moon");
        yield* isles.setServer(true);
        const moonAfterUp = yield* eventually(isles.entries("moon"), (rows) =>
          rows.some((entry) => entry.event === "Played"),
        );
        const net = yield* SubscriptionRef.get(isles.online);
        return { moonWhileDown, moonAfterUp, net };
      }),
    );

    expect(result.moonWhileDown.some((entry) => entry.event === "Played")).toBe(false);
    expect(result.moonAfterUp.map((entry) => entry.event)).toEqual(["Hatched", "Played"]);
    expect(result.net).toEqual({ server: true, sun: true, moon: true });
  });

  it("journal subscription updates after a local write", async () => {
    const result = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        yield* Effect.sleep(20);
        const before = yield* SubscriptionRef.get(isles.journal("sun"));
        yield* isles.write("sun", "Hatched", {
          id: newCritterId(),
          species: "pip",
          name: defaultName("pip"),
        });
        const after = yield* eventually(SubscriptionRef.get(isles.journal("sun")), (rows) =>
          rows.some((entry) => entry.event === "Hatched"),
        );
        return { before, after };
      }),
    );
    expect(result.before).toEqual([]);
    expect(result.after.map((entry) => entry.event)).toEqual(["Hatched"]);
  });

  it("records different spans for hatch, stuffed reject, ferry, and destroy", async () => {
    const spans = await provide(
      Effect.gen(function* () {
        const isles = yield* Isles;
        const trace = yield* IsleTrace;
        const id = newCritterId();
        yield* isles.write("sun", "Hatched", {
          id,
          species: "pip",
          name: defaultName("pip"),
        });
        yield* isles.write("sun", "Fed", { id });
        yield* isles.write("sun", "Fed", { id });
        yield* isles.ferry("sun", "moon", false);
        yield* isles.destroy("sun");
        return yield* eventually(SubscriptionRef.get(trace.spans), (rows) => {
          const writes = rows.filter(
            (span) => span.name === "isles.write" && span.status === "Ended",
          );
          return (
            writes.length >= 3 &&
            rows.some((span) => span.name === "isles.ferry" && span.status === "Ended") &&
            rows.some((span) => span.name === "isles.destroy" && span.status === "Ended")
          );
        });
      }),
    );

    const writes = spans.filter(
      (span: TraceSpan) => span.name === "isles.write" && span.status === "Ended",
    );
    expect(writes.map((span) => span.attributes.event)).toEqual(["Hatched", "Fed", "Fed"]);
    expect(writes.map((span) => span.attributes.ok)).toEqual([true, true, false]);
    expect(writes[2]?.attributes.error).toBe("stuffed");
  });
});
