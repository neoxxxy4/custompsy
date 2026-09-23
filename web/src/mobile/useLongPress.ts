import { useRef } from 'react'

// long-press ~500ms без движения → onLongPress; движение/ранний отпуск — отмена.
// работает на touch и mouse; клик после сработавшего long-press подавляется.
// long-press не стартует с input/textarea (не мешать редактированию и выделению текста).
export function useLongPress(onLongPress: () => void, opts?: { disabled?: boolean; ms?: number }) {
  const timer = useRef<number | undefined>(undefined)
  const fired = useRef(false)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const disabled = opts?.disabled ?? false
  const ms = opts?.ms ?? 500

  const cancel = () => {
    window.clearTimeout(timer.current)
    startPos.current = null
  }

  const isEditableTarget = (e: React.SyntheticEvent) =>
    (e.target as HTMLElement).closest('input, textarea') !== null

  const start = (e: React.SyntheticEvent, x: number, y: number) => {
    if (disabled || isEditableTarget(e)) return
    fired.current = false
    startPos.current = { x, y }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      fired.current = true
      startPos.current = null
      onLongPress()
    }, ms)
  }

  const move = (x: number, y: number) => {
    if (!startPos.current) return
    if (Math.abs(x - startPos.current.x) > 10 || Math.abs(y - startPos.current.y) > 10) cancel()
  }

  return {
    onTouchStart: (e: React.TouchEvent) => start(e, e.touches[0].clientX, e.touches[0].clientY),
    onTouchMove: (e: React.TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY),
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: (e: React.MouseEvent) => start(e, e.clientX, e.clientY),
    onMouseMove: (e: React.MouseEvent) => move(e.clientX, e.clientY),
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onClickCapture: (e: React.SyntheticEvent) => {
      if (fired.current) {
        fired.current = false
        e.preventDefault()
        e.stopPropagation()
      }
    },
  }
}
