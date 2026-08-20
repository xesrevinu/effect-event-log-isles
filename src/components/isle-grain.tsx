type IsleGrainProps = {
  isle: "sun" | "moon";
};

/**
 * Jagged grit, not the page plus-pattern. Turbulence (not fractalNoise) +
 * uneven X/Y frequency so the teeth are larger and less tiled-looking.
 * Clipped to the board by the parent.
 */
export function IsleGrain({ isle }: IsleGrainProps) {
  const id = `isle-grit-${isle}`;
  return (
    <div className="isle-board-skin" aria-hidden>
      <svg className="isle-board-grain" width="100%" height="100%">
        <filter
          id={id}
          x="0"
          y="0"
          width="100%"
          height="100%"
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
        >
          <feTurbulence
            type="turbulence"
            baseFrequency="0.09 0.15"
            numOctaves="3"
            seed={isle === "sun" ? 21 : 44}
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.23  0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0.28 0"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </div>
  );
}
