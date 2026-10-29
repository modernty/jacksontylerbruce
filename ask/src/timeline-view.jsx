import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildTimeline } from "./timeline.js";
import { useCatalog } from "./views.jsx";

function useOrientation() {
  const [orientation, setOrientation] = useState(() =>
    window.matchMedia("(max-width: 767px)").matches ? "vertical" : "horizontal",
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setOrientation(query.matches ? "vertical" : "horizontal");
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return orientation;
}

function center(element, host) {
  const mark = element.getBoundingClientRect();
  const frame = host.getBoundingClientRect();
  return {
    x: mark.left - frame.left + mark.width / 2,
    y: mark.top - frame.top + mark.height / 2,
  };
}

function overlaps(a, b) {
  const pad = 4;
  return !(a.right + pad <= b.left || a.left >= b.right + pad || a.bottom + pad <= b.top || a.top >= b.bottom + pad);
}

function placeLabels(root) {
  const leaders = [...root.querySelectorAll(".mark.is-now .leader")];
  const ticks = [...root.querySelectorAll(".tick")];
  leaders.forEach((leader) => {
    leader.style.transform = "";
  });
  const shifts = [
    [0, 0],
    [0, 28],
    [0, 56],
    [-160, 0],
    [-160, 28],
    [16, 28],
  ];
  leaders.forEach((leader) => {
    for (const [dx, dy] of shifts) {
      leader.style.transform = dx || dy ? `translate(${dx}px, ${dy}px)` : "";
      const box = leader.getBoundingClientRect();
      const hit = ticks.some((tick) => overlaps(box, tick.getBoundingClientRect()))
        || leaders.some((other) => other !== leader && overlaps(box, other.getBoundingClientRect()));
      if (!hit) return;
    }
  });
}

export function Timeline({ focus, anchor }) {
  const { status, catalog } = useCatalog();
  const orientation = useOrientation();
  const frame = useRef(null);
  const [arcs, setArcs] = useState([]);
  const [hover, setHover] = useState("");
  useLayoutEffect(() => {
    if (status !== "ready" || !frame.current) return;
    placeLabels(frame.current);
  }, [status, orientation, focus, anchor, catalog]);
  if (status === "loading") return <p data-state="loading">Loading</p>;
  if (status === "error") return <p data-view="text">The public record did not load.</p>;
  const model = buildTimeline(catalog, { focus, anchor });
  const hot = hover || model.focus || "";

  function showArcs(event, item) {
    const host = event.currentTarget.closest("[data-timeline]");
    const from = center(event.currentTarget.querySelector(".square"), host);
    const paths = [];
    for (const id of item.related || []) {
      const other = host.querySelector(`[data-timeline-id="${CSS.escape(id)}"] .square`);
      if (!other) continue;
      const to = center(other, host);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const midX = (from.x + to.x) / 2 + (-dy / length) * 28;
      const midY = (from.y + to.y) / 2 + (dx / length) * 28;
      paths.push(`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`);
    }
    setHover(item.markId);
    setArcs(paths);
  }

  function hideArcs() {
    setHover("");
    setArcs([]);
  }

  return (
    <section ref={frame} className="timeline" data-timeline data-orientation={orientation} data-hover={hot || undefined}>
      <div className="tick-row" aria-hidden="true">
        <span className="lane-gap" />
        <div className="plot">
          {model.ticks.map((year) => {
            const p = (year - model.start) / (model.end - model.start);
            const edge = p <= 0.001 ? "start" : p >= 0.999 ? "end" : undefined;
            return (
              <span key={year} className="tick" data-edge={edge} style={{ "--p": p }}>
                <span className="plus">+</span>
                <span className="meta">{year}</span>
              </span>
            );
          })}
        </div>
      </div>
      <div className="lanes">
        {model.lanes.map((lane) => (
          <div className="lane" data-lane={lane.id} key={lane.id}>
            <span className="lane-name meta">{lane.label}</span>
            <div className="plot">
              {lane.items.map((item, index) => {
                const stack = lane.items.filter((other, otherIndex) => otherIndex < index && Math.abs(other.point - item.point) < 0.02).length;
                const openOnes = lane.items.filter((other) => other.open);
                const offset = item.open ? openOnes.findIndex((other) => other.markId === item.markId) - (openOnes.length - 1) / 2 : stack;
                return (
                <Fragment key={item.markId}>
                {lane.id === "roles" ? (
                  <span className={item.open ? "bar is-open" : "bar"} style={{ "--a": item.x0, "--b": item.x1, "--offset": offset }} />
                ) : null}
                <a
                  className={item.now ? "mark is-now" : "mark"}
                  data-timeline-id={item.id}
                  data-now={item.now ? "true" : "false"}
                  data-open={item.open ? "true" : "false"}
                  data-focus={model.focus === item.id ? "true" : "false"}
                  href={item.href}
                  style={{ "--p": item.point, "--stack": offset }}
                  onMouseEnter={(event) => showArcs(event, item)}
                  onMouseLeave={hideArcs}
                  onFocus={(event) => showArcs(event, item)}
                  onBlur={hideArcs}
                >
                  <span className="square" />
                  <span className="leader">
                    <span className={lane.id === "roles" ? "company" : "project-name"}>{item.label}</span>
                    {item.meta ? <span className="meta quiet">{item.meta}</span> : null}
                    {item.year ? <span className={lane.id === "roles" ? "company" : "project-name"}>{item.year}</span> : null}
                  </span>
                </a>
                </Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <svg className="arcs" data-timeline-arcs aria-hidden="true">
        {arcs.map((path) => (
          <path key={path} d={path} />
        ))}
      </svg>
    </section>
  );
}

export function renderShowTimeline({ args }) {
  const focus = args && typeof args.focus === "string" ? args.focus : undefined;
  const anchor = args && typeof args.anchor === "string" ? args.anchor : undefined;
  return <Timeline focus={focus} anchor={anchor} />;
}
