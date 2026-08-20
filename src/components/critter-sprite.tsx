import { useEffect, useState } from "react";
import type { Critter, EventTag, Species } from "@/lib/critter-sim";
import {
  clipForEvent,
  clipSheet,
  clipSpec,
  decodePetSheet,
  loadPetsManifest,
  nextRoamClip,
  peekPetSheet,
  roamIdleMs,
  SPRITE_VIEW_SCALE,
  type PetClipId,
  type PetsManifest,
} from "@/lib/png-sequence";
import { PngSequence } from "@/components/png-sequence";

type Look = Pick<Critter, "species" | "stage" | "belly" | "mood" | "energy"> & {
  name?: string;
};

const FILL: Record<Species, string> = {
  pip: "#ffc800",
  nub: "#1cb0f6",
  bean: "#58cc02",
};

export function usePetClip(species: Look["species"], clip: PetClipId) {
  const [manifest, setManifest] = useState<PetsManifest | null>(null);
  useEffect(() => {
    let live = true;
    void loadPetsManifest().then((next) => {
      if (live) setManifest(next);
    });
    return () => {
      live = false;
    };
  }, []);
  return clipSpec(manifest, species, clip);
}

export function CritterSprite({
  pet,
  burst,
  burstKey,
  alt,
  roam,
}: {
  pet: Look;
  burst?: EventTag;
  burstKey?: number;
  alt?: string;
  roam?: boolean;
}) {
  const [clip, setClip] = useState<PetClipId>("idle");
  const [shown, setShown] = useState<PetClipId>("idle");
  const spec = usePetClip(pet.species, shown);
  const waiting = roam && !burst;

  useEffect(() => {
    const src = clipSheet(pet.species, clip, spec ?? undefined);
    if (peekPetSheet(src)) {
      setShown(clip);
      return;
    }
    let live = true;
    void decodePetSheet(src).then(
      () => {
        if (live) setShown(clip);
      },
      () => {
        if (live) setShown(clip);
      },
    );
    return () => {
      live = false;
    };
  }, [pet.species, clip, spec]);

  useEffect(() => {
    if (!burst) return;
    setClip(clipForEvent(burst));
  }, [burst, burstKey, pet.species]);

  useEffect(() => {
    if (!waiting || clip !== "idle") return;
    const timer = window.setTimeout(() => {
      setClip(nextRoamClip(Math.random()));
    }, roamIdleMs(Math.random(), pet.species));
    return () => window.clearTimeout(timer);
  }, [waiting, clip, pet.species]);

  if (!spec) {
    return (
      <span
        className="relative z-50 block size-full rounded-full"
        style={{ background: FILL[pet.species] }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className="relative z-50 block size-full origin-bottom"
      style={{ transform: `scale(${SPRITE_VIEW_SCALE})` }}
    >
      <PngSequence
        key={`${pet.species}-${shown}-${shown === "idle" ? "loop" : (burstKey ?? 0)}`}
        sheet={clipSheet(pet.species, shown, spec)}
        cols={spec.cols ?? 15}
        rows={spec.rows ?? 10}
        count={spec.count}
        fps={spec.fps}
        loop={spec.loop}
        alt={alt ?? pet.name ?? pet.species}
        onEnded={shown === "idle" ? undefined : () => setClip("idle")}
      />
    </span>
  );
}
