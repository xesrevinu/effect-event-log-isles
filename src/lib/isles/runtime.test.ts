import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { defaultName, newCritterId } from "@/lib/critter-sim";
import { Isles, layerIsles } from "@/lib/isles/runtime";

const provide = <A, E>(effect: Effect.Effect<A, E, Isles>) =>
  Effect.runPromise(Effect.scoped(effect.pipe(Effect.provide(layerIsles("memory")))));

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
});
