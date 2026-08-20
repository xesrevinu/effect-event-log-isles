import { Effect } from "effect";
import type * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import type * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { describe, expect, it } from "vitest";
import { defaultName, newCritterId } from "@/lib/critter-sim";
import { destroyAtom, islesRuntime, sunEntriesAtom, writeAtom } from "@/lib/isles/atoms";

const resultOf = <A, E>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
) => Effect.runPromise(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }));

describe("Isles atoms", () => {
  it("refreshes the journal atom after a hatch write", async () => {
    const registry = AtomRegistry.make();
    registry.mount(islesRuntime);
    registry.mount(sunEntriesAtom);

    try {
      registry.set(destroyAtom, "sun");
      await resultOf(registry, destroyAtom);

      const before = await resultOf(registry, sunEntriesAtom);
      expect(before).toEqual([]);

      const id = newCritterId();
      registry.set(writeAtom, {
        isle: "sun",
        event: "Hatched",
        payload: { id, species: "pip", name: defaultName("pip") },
      });
      const written = await resultOf(registry, writeAtom);
      expect(written).toMatchObject({ ok: true });

      const after = await resultOf(registry, sunEntriesAtom);
      expect(after.map((entry) => entry.event)).toEqual(["Hatched"]);
      expect(after[0]?.primaryKey).toBe(id);
    } finally {
      registry.dispose();
    }
  });
});
