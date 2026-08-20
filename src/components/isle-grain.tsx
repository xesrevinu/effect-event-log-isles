type IsleGrainProps = {
  isle: "sun" | "moon";
};

/**
 * Jagged grit, not the page plus-pattern. The turbulence lives in a
 * fixed-size SVG tile (public/grain-*.svg) used as a repeating background:
 * the browser rasterizes the filter once per tile and board resizes /
 * lane-height transitions just repeat the cached texture. An inline
 * 100%-sized feTurbulence re-rasterized every frame of those transitions.
 */
export function IsleGrain({ isle }: IsleGrainProps) {
  return (
    <div className="isle-board-skin" aria-hidden>
      <div
        className="isle-board-grain"
        style={{
          backgroundImage: `url(/grain-${isle}.svg)`,
          backgroundSize: "240px 240px",
          backgroundRepeat: "repeat",
        }}
      />
    </div>
  );
}
