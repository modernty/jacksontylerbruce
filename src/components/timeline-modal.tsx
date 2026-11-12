"use client"

import { useEffect, useRef } from "react"

/** Scrolls a sideways timeline to its right end, so it opens on now. */
export function startAtNow(node: HTMLDivElement | null) {
  if (node) node.scrollLeft = node.scrollWidth
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
            <div className="panel-timeline desk" ref={startAtNow} dangerouslySetInnerHTML={{ __html: desktop }} />
            <div className="panel-timeline phone" dangerouslySetInnerHTML={{ __html: mobile }} />
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
