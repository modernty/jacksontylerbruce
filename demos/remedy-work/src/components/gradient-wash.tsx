/**
 * The page's background wash, following the Loblaw Labs background: warm colour banded
 * across the top — coral at the left, peach through the middle, rose at the right —
 * falling away to near-white before the content starts, with a faint warm cast in the
 * bottom corner.
 *
 * Anchored to the document rather than the viewport. The reference is a single-screen
 * layout, where a viewport-fixed wash and a document-anchored one look identical; this
 * page is many screens tall, and fixing the band to the viewport repainted coral behind
 * every screenful of cards and muddied their tints. Anchoring it to the top of the
 * document keeps the reference's opening and lets the grids sit on clean near-white.
 *
 * The three tints are separate layers so each can move at its own pace — see
 * `wash-drift-*` in `globals.css`. One layer holding all three would slide as a rigid
 * sheet; three at three speeds rearrange the band instead.
 *
 * The base colour lives on `body`, so the area below these bands is never unpainted.
 */

/** Tall enough to carry the hero and still fade out before the first cards. */
const BAND_HEIGHT = "min(1500px, 132vh)";

/**
 * How far each layer overhangs its band on every side, as a percentage of the band.
 *
 * These gradients are anchored at the band's edges and still carry colour where their own
 * box ends, so a layer sized to the band shows a hard cut across the corner the moment it
 * moves. The overhang has to clear the furthest any layer travels — 14% of its own width,
 * which is 27% of the band. Raise this before raising the distances in the keyframes.
 */
const LAYER_INSET = 45;

const SPAN = 100 + 2 * LAYER_INSET;

/** Band coordinates — what you actually see — into the oversized layer's own. */
const position = (value: number) =>
  `${(((value + LAYER_INSET) / SPAN) * 100).toFixed(2)}%`;
const extent = (value: number) => `${((value / SPAN) * 100).toFixed(2)}%`;

type Tint = {
  colour: string;
  /** Width and height of the blob, as a percentage of the band. */
  size: [number, number];
  /** Centre, as a percentage of the band. Negative sits it past the top edge. */
  at: [number, number];
  /** Where the colour has faded out entirely, as a percentage of the blob. */
  fade: number;
};

function tintImage({ colour, size, at, fade }: Tint) {
  return `radial-gradient(${extent(size[0])} ${extent(size[1])} at ${position(at[0])} ${position(at[1])}, ${colour} 0%, transparent ${fade}%)`;
}

/* Anchored slightly past the top edge so only the lower falloff shows, which is what makes
   the three read as one graduated sweep. */
const TINTS: (Tint & { drift: string })[] = [
  {
    drift: "wash-drift-a",
    colour: "var(--wash-coral)",
    size: [96, 74],
    at: [4, -6],
    fade: 72,
  },
  {
    drift: "wash-drift-b",
    colour: "var(--wash-peach)",
    size: [82, 66],
    at: [42, -10],
    fade: 74,
  },
  {
    drift: "wash-drift-c",
    colour: "var(--wash-rose)",
    size: [90, 72],
    at: [97, -4],
    fade: 74,
  },
];

export function GradientWash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10">
      {/* `overflow-clip` so a moving layer can never widen the page. */}
      <div
        className="absolute inset-x-0 top-0 overflow-clip"
        style={{ height: BAND_HEIGHT }}
      >
        {TINTS.map((tint) => (
          <div
            key={tint.drift}
            className={`absolute ${tint.drift}`}
            style={{ inset: `${-LAYER_INSET}%`, background: tintImage(tint) }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The warm cast in the bottom corner, rendered at the end of the document so it sits
 * against the footer rather than wherever the fold happens to fall.
 */
export function GradientFoot() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[min(760px,80vh)] overflow-clip"
    >
      <div
        className="wash-drift-b absolute"
        style={{
          inset: `${-LAYER_INSET}%`,
          background: tintImage({
            colour: "var(--wash-ember)",
            size: [62, 78],
            at: [104, 108],
            fade: 72,
          }),
        }}
      />
    </div>
  );
}
