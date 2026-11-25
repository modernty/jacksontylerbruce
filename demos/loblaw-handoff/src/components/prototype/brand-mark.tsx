/**
 * The PC Chat interlock, inlined so it can turn.
 *
 * The four petals come verbatim from `public/proto/icons/brand-mark.svg`. All four of
 * that file's gradients are identical, so one is enough here.
 *
 * The gradient is `userSpaceOnUse` and sits outside the rotating group on purpose: it
 * stays fixed while the petals turn, so the colour sweeps across them rather than
 * riding along. That is what the Lottie does — a stationary gradient layer revealed
 * through a rotating alpha matte — and it is the whole character of the animation.
 *
 * Two knowing deviations from ICON_Interlock_APPROVED.json, both to make it read at
 * 32px rather than to save effort:
 *
 *   - The file turns 180° in two eased phases over 36 frames at 24fps. Looped, that
 *     eased half-turn pulses, which reads as hesitation rather than work. This makes one
 *     constant 360° over the same 1.5s and stops, which ends where it began.
 *   - The petals also drift a few units on a 96-frame cycle nested inside the 36-frame
 *     comp. At this size that is jitter, so it is dropped.
 */

export function BrandMark({
  size = 32,
  spinning = false,
  ...props
}: {
  size?: number;
  /** Turns once, at the file's own rate, and holds. Independent of anything else on
   *  screen — the duration belongs to the mark, not to whatever it appears beside. */
  spinning?: boolean;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block"
      {...props}
    >
      <defs>
        <linearGradient
          id="pc-interlock"
          x1="6.95485"
          y1="26.4471"
          x2="31.9062"
          y2="5.14731"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C81208" />
          <stop offset="0.393598" stopColor="#DD1833" />
          <stop offset="0.647547" stopColor="#FF6E42" />
          <stop offset="0.825931" stopColor="#FE9BD1" />
          <stop offset="1" stopColor="#DEDBE6" />
        </linearGradient>
      </defs>

      <g
        data-spinning={spinning || undefined}
        className="proto-interlock"
        style={{ transformOrigin: "16px 16px" }}
      >
        <path
          d="M18.0951 20.1969C21.9952 18.609 25.946 19.2907 26.9197 21.7197C27.8936 24.1486 25.5214 27.405 21.6213 28.9929C17.7215 30.5808 13.7707 29.899 12.7967 27.4702C11.8228 25.0413 14.195 21.7848 18.0951 20.1969Z"
          fill="url(#pc-interlock)"
        />
        <path
          d="M4.40241 12.8335C6.81264 11.8521 10.0442 14.2427 11.6199 18.173C13.1956 22.1032 12.5191 26.0846 10.1088 27.0661C7.6986 28.0474 4.46716 25.6569 2.89138 21.7265C1.31579 17.7964 1.99235 13.815 4.40241 12.8335Z"
          fill="url(#pc-interlock)"
        />
        <path
          d="M22.3008 4.76709C24.7112 3.78574 27.9426 6.17628 29.5184 10.1066C31.094 14.0368 30.4175 18.0182 28.0073 18.9996C25.597 19.981 22.3656 17.5905 20.7898 13.6601C19.2142 9.73002 19.8908 5.74855 22.3008 4.76709Z"
          fill="url(#pc-interlock)"
        />
        <path
          d="M10.7923 2.9156C14.6923 1.3277 18.6436 2.00956 19.6176 4.43834C20.5913 6.86725 18.2191 10.1237 14.319 11.7118C10.4189 13.2997 6.46765 12.6179 5.4939 10.189C4.52014 7.76009 6.89232 4.50355 10.7923 2.9156Z"
          fill="url(#pc-interlock)"
        />
      </g>
    </svg>
  );
}
