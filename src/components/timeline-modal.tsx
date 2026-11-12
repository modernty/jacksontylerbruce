"use client"

import { useEffect, useRef } from "react"
import { growTimeline } from "./behaviors"

/** Plays the drawing's grow-in when it mounts, if it is the one showing at this width. */
function grow(node: HTMLDivElement, mobile: boolean) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
  if (matchMedia("(max-width: 768px)").matches !== mobile) return
  const svg = node.querySelector("svg")
  if (!svg) return
  growTimeline(svg, mobile ? node : (svg.querySelector(".mode[data-m=timeline]") ?? svg), mobile)
}

/** The horizontal drawing: opens scrolled to its right end, on now, and grows into view. */
export function desktopTimeline(node: HTMLDivElement | null) {
  if (!node) return
  node.scrollLeft = node.scrollWidth
  grow(node, false)
}

/** The vertical drawing on phones, growing into view. */
export function phoneTimeline(node: HTMLDivElement | null) {
  if (node) grow(node, true)
}

/**
 * The career timeline opened out of the panel into a window over the page. A native dialog, so focus
 * stays inside, and Escape, a click outside or the hidden close button shuts it. Only the drawing shows,
 * at its drawn size, scrolling sideways when the window is narrower.
 */
export function TimelineModal({ open, onClose, desktop, mobile }: { open: boolean; onClose: () => void; desktop: string; mobile: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])
  return (
    <dialog
      ref={dialog}
      className="timeline-modal"
      aria-label="Career timeline"
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself, not its contents.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open ? (
        <div className="timeline-modal-body">
          <button type="button" className="modal-close" onClick={onClose}>
            Close timeline
          </button>
          <div className="timeline-modal-frame">
            <div className="panel-timeline desk" ref={desktopTimeline} dangerouslySetInnerHTML={{ __html: desktop }} />
            <div className="panel-timeline phone" ref={phoneTimeline} dangerouslySetInnerHTML={{ __html: mobile }} />
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
