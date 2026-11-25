/**
 * The LCA × Loblaw Digital lockup.
 *
 * Sized entirely in `em`, so whatever sets the font-size on its container sets the scale:
 * the hero clamps it against the viewport, the gate prints it small. Both marks and the
 * cross move together, which is what keeps the proportions right at every size.
 *
 * Both assets are drawn as alpha masks over a solid fill rather than as `<img>`, because
 * each carries a baked-in near-black; masking discards that and takes the colour from
 * `--ink-display`, so the lockup rethemes with the type.
 */

/**
 * The wordmark's *visible* height, in em of whatever font-size the container sets. This is
 * the lockup's scale control.
 *
 * Sized by ink rather than by box, because the two masks are trimmed differently: swapping
 * the Loblaw wordmark from a PNG padded by 12.93% a side to an SVG trimmed to its ink kept
 * the lockup identical on screen precisely because this number describes the letters, not
 * the file around them.
 */
const WORDMARK_INK = 1.2017;

/**
 * How much of each mask's own box is ink, measured off the files rather than assumed. A
 * mark's box height is its ink height divided by this, so re-exporting an asset with a
 * different trim is a one-number change here.
 */
const LOBLAW_INK_FRACTION = 0.9846;
/** Box fraction from the left edge to the first ink — what the cross has to clear. */
const LOBLAW_SIDE_PADDING = 0.0086;
const LOBLAW_ASPECT = 699 / 389;

/**
 * LCA stands at 54.96% of the wordmark's height. That is the proportion the lockup has
 * drawn from the start: the official lockup quotes 38.85%, measured against the old PNG's
 * padded box, which is the same thing said about a taller rectangle.
 */
const LCA_TO_WORDMARK = 0.5496;
const LCA_ASPECT = 129.707 / 56.3267;

const LOBLAW_HEIGHT = WORDMARK_INK / LOBLAW_INK_FRACTION;
const LCA_HEIGHT = WORDMARK_INK * LCA_TO_WORDMARK;

/** The air either side of the cross, in em of the container. */
const CROSS_GAP = 0.3752;
/** The cross's own size — and the unit its margins resolve against, which is the trap. */
const CROSS_SIZE = 0.55;

/*
 * A visible gap is the margin plus whatever padding the neighbouring mask carries inside
 * its own box, so the two margins are not equal: LCA is trimmed to its ink and needs the
 * full gap, while the Loblaw SVG brings 0.86% of its width along and needs slightly less.
 * Computed rather than written down, so re-exporting either mask is a matter of updating
 * its measured fraction above. (When the wordmark was a PNG padded by 12.93% a side, this
 * came out at no right margin at all.)
 */
const CROSS_MARGIN_LEFT = CROSS_GAP / CROSS_SIZE;
const CROSS_MARGIN_RIGHT =
  (CROSS_GAP - LOBLAW_HEIGHT * LOBLAW_ASPECT * LOBLAW_SIDE_PADDING) / CROSS_SIZE;

export function Lockup() {
  return (
    <>
      <Mark
        label="LCA"
        src="/demos/remedy-work/lca-lockup.svg"
        height={`${LCA_HEIGHT}em`}
        aspect={LCA_ASPECT}
        fill="var(--lca-mark)"
      />
      <span
        aria-hidden
        className="font-normal"
        style={{
          fontSize: `${CROSS_SIZE}em`,
          marginLeft: `${CROSS_MARGIN_LEFT}em`,
          marginRight: `${CROSS_MARGIN_RIGHT}em`,
        }}
      >
        ×
      </span>
      <Mark
        label="Loblaw Digital"
        src="/demos/remedy-work/loblaw-digital-mask.svg"
        height={`${LOBLAW_HEIGHT}em`}
        aspect={LOBLAW_ASPECT}
        fill="var(--ink-display)"
      />
    </>
  );
}

/**
 * One mark of the lockup, drawn as an alpha mask over a solid fill. Width comes from the
 * aspect ratio rather than being stated, so a mark can never skew.
 */
function Mark({
  label,
  src,
  height,
  aspect,
  fill,
}: {
  label: string;
  src: string;
  height: string;
  aspect: number;
  /** The mask is read for alpha only, so the visible colour comes from here. */
  fill: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-block shrink-0"
      style={{
        background: fill,
        height,
        aspectRatio: aspect,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskMode: "alpha",
      }}
    />
  );
}
