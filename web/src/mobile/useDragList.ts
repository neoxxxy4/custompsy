import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react'

interface DragState {
  index: number
  target: number
  delta: number
}

// drag-сортировка «как в Telegram»: long-press (~500ms) поднимает строку
// (scale + тень), дальше, не отпуская палец, строка живо переставляется
// между соседями; отпускание после сдвига фиксирует порядок (onReorder),
// отпускание без сдвига — обычный long-press (onLongPress, action-sheet).
// Удержание поднятой строки НАД другой строкой ~700ms (onMerge) — группировка
// в подблок; жест на этом завершается без перестановки.
// Скролл страницы блокируется только после срабатывания long-press:
// нативный non-passive touchmove + preventDefault (React вешает passive).
export function useDragList({
  disabled,
  onReorder,
  onLongPress,
  onMerge,
  ms = 500,
  mergeMs = 700,
}: {
  disabled?: boolean
  onReorder: (from: number, to: number) => void
  onLongPress: (index: number) => void
  onMerge?: (from: number, to: number) => void
  ms?: number
  mergeMs?: number
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rows = useRef<(HTMLElement | null)[]>([])
  const timer = useRef<number | undefined>(undefined)
  const mergeTimer = useRef<number | undefined>(undefined)
  const mergeTarget = useRef<number>(-1)
  const gesture = useRef<{ index: number; startX: number; startY: number; active: boolean; moved: boolean } | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const suppressClick = useRef(false)
  const cb = useRef({ onReorder, onLongPress, onMerge })
  const disabledRef = useRef(disabled)
  const msRef = useRef(ms)
  const mergeMsRef = useRef(mergeMs)

  useEffect(() => {
    cb.current = { onReorder, onLongPress, onMerge }
    disabledRef.current = disabled
    msRef.current = ms
    mergeMsRef.current = mergeMs
  })

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(mergeTimer.current)
    },
    [],
  )

  const clearMerge = useCallback(() => {
    window.clearTimeout(mergeTimer.current)
    mergeTimer.current = undefined
    mergeTarget.current = -1
  }, [])

  const updateDrag = useCallback(
    (y: number) => {
      const g = gesture.current
      const st = dragRef.current
      if (!g || !st) return
      const delta = y - g.startY
      if (Math.abs(delta) > 6) g.moved = true
      const row = rows.current[st.index]
      if (!row) return
      const center = row.offsetTop + row.offsetHeight / 2 + delta
      let target = 0
      rows.current.forEach((r, i) => {
        if (r && r.isConnected && i !== st.index && center > r.offsetTop + r.offsetHeight / 2) target++
      })
      const next = { index: st.index, target, delta }
      dragRef.current = next
      setDrag(next)
      // удержание над чужой строкой → onMerge (группировка в подблок)
      if (cb.current.onMerge) {
        if (target !== st.index && target !== mergeTarget.current) {
          clearMerge()
          mergeTarget.current = target
          mergeTimer.current = window.setTimeout(() => {
            const cur = dragRef.current
            if (!cur || cur.target !== target) return
            const from = cur.index
            // завершаем жест без перестановки, затем группируем
            gesture.current = null
            dragRef.current = null
            clearMerge()
            suppressClick.current = true
            window.setTimeout(() => {
              suppressClick.current = false
            }, 350)
            setDrag(null)
            cb.current.onMerge?.(from, target)
          }, mergeMsRef.current)
        } else if (target === st.index) clearMerge()
      }
    },
    [clearMerge],
  )

  const finish = useCallback(
    (commit: boolean) => {
      window.clearTimeout(timer.current)
      clearMerge()
      const g = gesture.current
      const st = dragRef.current
      gesture.current = null
      dragRef.current = null
      if (!st) return
      suppressClick.current = true
      window.setTimeout(() => {
        suppressClick.current = false
      }, 350)
      setDrag(null)
      if (!commit) return
      if (g?.moved && st.target !== st.index) cb.current.onReorder(st.index, st.target)
      else if (!g?.moved) cb.current.onLongPress(st.index)
    },
    [clearMerge],
  )

  // touchmove — нативный non-passive, чтобы preventDefault реально блокировал скролл
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      const g = gesture.current
      if (!g) return
      const t = e.touches[0]
      if (!t) return
      if (!g.active) {
        if (Math.abs(t.clientX - g.startX) > 10 || Math.abs(t.clientY - g.startY) > 10) {
          window.clearTimeout(timer.current)
          gesture.current = null
        }
        return
      }
      e.preventDefault()
      updateDrag(t.clientY)
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [updateDrag])

  // mouse — для десктопного браузера в мобильной вёрстке
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const g = gesture.current
      if (!g) return
      if (!g.active) {
        if (Math.abs(e.clientX - g.startX) > 10 || Math.abs(e.clientY - g.startY) > 10) {
          window.clearTimeout(timer.current)
          gesture.current = null
        }
        return
      }
      updateDrag(e.clientY)
    }
    const onUp = () => finish(true)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [updateDrag, finish])

  const start = (index: number, x: number, y: number) => {
    gesture.current = { index, startX: x, startY: y, active: false, moved: false }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const g = gesture.current
      if (!g) return
      g.active = true
      const st = { index: g.index, target: g.index, delta: 0 }
      dragRef.current = st
      setDrag(st)
    }, msRef.current)
  }

  // жест игнорируется, если touch начался на input/textarea
  // или внутри ВЛОЖЕННОГО drag-контейнера (пункты внутри чек-листа)
  const guardTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement
    if (el.closest('input, textarea')) return true
    const c = el.closest('[data-drag-container]')
    if (c && c !== containerRef.current) return true
    return false
  }

  const bindRow = (index: number) => ({
    ref: (el: HTMLDivElement | null) => {
      rows.current[index] = el
    },
    onTouchStart: (e: ReactTouchEvent<HTMLElement>) => {
      if (disabledRef.current) return
      if (guardTarget(e.target)) return
      const t = e.touches[0]
      if (t) start(index, t.clientX, t.clientY)
    },
    onMouseDown: (e: ReactMouseEvent<HTMLElement>) => {
      if (disabledRef.current || e.button !== 0) return
      if (guardTarget(e.target)) return
      start(index, e.clientX, e.clientY)
    },
  })

  const containerProps = {
    'ref': containerRef,
    'data-drag-container': '',
    onTouchEnd: () => finish(true),
    onTouchCancel: () => finish(false),
    onClickCapture: (e: ReactMouseEvent<HTMLElement>) => {
      if (suppressClick.current) {
        suppressClick.current = false
        e.preventDefault()
        e.stopPropagation()
      }
    },
  }

  const rowStyle = (index: number): CSSProperties => {
    if (!drag) return {}
    const h = rows.current[drag.index]?.offsetHeight ?? 0
    if (index === drag.index) {
      return {
        transform: `translateY(${drag.delta}px) scale(1.03)`,
        boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
        background: 'var(--surface-2)',
        borderRadius: 12,
        position: 'relative',
        zIndex: 10,
        userSelect: 'none',
      }
    }
    let shift = 0
    if (drag.target > drag.index) {
      if (index > drag.index && index <= drag.target) shift = -h
    } else if (drag.target < drag.index) {
      if (index < drag.index && index >= drag.target) shift = h
    }
    return { transform: `translateY(${shift}px)`, transition: 'transform .18s ease' }
  }

  return { containerProps, bindRow, rowStyle, dragging: drag !== null }
}
