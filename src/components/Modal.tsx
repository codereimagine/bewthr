import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { useVisualViewport } from '../hooks/useVisualViewport'
import './Modal.css'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

// Module-level refcount so multiple modals can coexist without one
// closing prematurely unlocking body scroll for the other still open.
// closeStack tracks the order modals opened so Escape only dismisses
// the topmost (last-pushed) one when modals are stacked.
// savedScrollY captures the page scroll position at first-modal-open so it
// can be restored when the last modal closes — required by the iOS-safe
// body-lock pattern below.
let openModalCount = 0
const closeStack: Array<() => void> = []
let savedScrollY = 0

// iOS-safe body scroll lock. The naive `body { overflow: hidden }` pattern
// is broken on iOS Safari mobile: when the body has overflow:hidden, iOS
// captures touches for page-level scroll attempts (which are then blocked)
// rather than routing them to fixed-positioned scroll containers like our
// modal. Result: modal contents become unscrollable.
//
// The canonical fix used by every iOS-aware library (body-scroll-lock,
// react-remove-scroll, etc.) is to make the body itself position:fixed at
// a negative top offset equal to the current scroll position. This freezes
// the visual page in place AND lets fixed-positioned modals scroll their
// own overflow correctly because the body is no longer trying to capture
// touches as page scroll.
function lockBody() {
  savedScrollY = window.scrollY
  document.body.style.position = 'fixed'
  document.body.style.top = `-${savedScrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
}

function unlockBody() {
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  window.scrollTo(0, savedScrollY)
}

// Drag-to-dismiss threshold in CSS pixels. ~20% of typical mobile modal
// height. Below this snaps back; above this triggers close.
const DRAG_DISMISS_THRESHOLD = 80

export function Modal({ open, title, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; pointerId: number } | null>(null)
  const vv = useVisualViewport()

  // Resize the modal to fit above the on-screen keyboard. visualViewport
  // shrinks when iOS / Android keyboards appear (CSS dvh does not account
  // for the keyboard). We apply max-height + bottom inline so search
  // results stay reachable without dismissing the keyboard first.
  useEffect(() => {
    if (!modalRef.current) return
    if (typeof window === 'undefined') return
    if (vv.height > 0 && vv.height < window.innerHeight - 1) {
      const maxH = Math.round(vv.height * 0.85)
      const keyboardH = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      modalRef.current.style.maxHeight = `${maxH}px`
      modalRef.current.style.bottom = `${keyboardH}px`
    } else {
      modalRef.current.style.maxHeight = ''
      modalRef.current.style.bottom = ''
    }
  }, [vv.height, vv.offsetTop])

  useEffect(() => {
    if (!open) return
    openModalCount++
    if (openModalCount === 1) lockBody()
    closeStack.push(onClose)
    return () => {
      openModalCount = Math.max(0, openModalCount - 1)
      const idx = closeStack.lastIndexOf(onClose)
      if (idx !== -1) closeStack.splice(idx, 1)
      if (openModalCount === 0) unlockBody()
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (closeStack[closeStack.length - 1] === onClose) {
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Reset drag offset whenever the modal opens or closes — guards against
  // a stale --drag-y carrying over if the user re-opens quickly.
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.style.setProperty('--drag-y', '0px')
      modalRef.current.style.removeProperty('transition')
    }
  }, [open])

  // Drag-to-dismiss is scoped to the .modal-drag-zone (handle + header).
  // Body content is left to native scroll — fighting iOS's gesture system
  // for body-at-top dismissal caused real scroll regressions in modal
  // contents with scrolling lists. The handle is the canonical iOS/
  // Material affordance and is wide enough to be thumb-friendly. Other
  // dismiss routes remain: × button, backdrop tap, Escape key.
  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (!modalRef.current) return
    dragRef.current = { startY: e.clientY, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    modalRef.current.style.setProperty('transition', 'none')
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return
    if (!modalRef.current) return
    const delta = Math.max(0, e.clientY - dragRef.current.startY)
    modalRef.current.style.setProperty('--drag-y', `${delta}px`)
  }

  function handlePointerEnd(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return
    if (!modalRef.current) return
    const delta = Math.max(0, e.clientY - dragRef.current.startY)
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    modalRef.current.style.removeProperty('transition')
    if (delta >= DRAG_DISMISS_THRESHOLD) {
      onClose()
    } else {
      modalRef.current.style.setProperty('--drag-y', '0px')
    }
  }

  return (
    <>
      <div
        className={`modal-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <div ref={modalRef} className={`modal ${open ? 'open' : ''}`}>
        <div
          className="modal-drag-zone"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div className="modal-handle" />
          <div className="modal-header">
            <div className="modal-title">{title}</div>
            <button
              className="modal-close"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {'×'}
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </>
  )
}
