import { useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import type { BlockItem } from '../views/practice/store'
import ActionSheet from './ActionSheet'

// событие на ленте: пункт блока расписания + цвет его блока
export interface TimelineEntry {
  defId: string
  color: string
  item: BlockItem
}

const START_H = 6
const END_H = 23
const HOUR_H = 56 // px на час

const parseTime = (t?: string) => {
  if (!t) return null
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return { h: +m[1], m: +m[2] }
}
const toMin = (h: number, m: number) => h * 60 + m
const fmtMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const keyOf = (e: TimelineEntry) => `${e.defId}:${e.item.id}`

// окно «День»: вертикальная часовая лента как в Google Calendar.
// тап по пустому месту — новое событие на это время (округление до 30 мин);
// тап по событию — выполнено; long-press — переименовать/удалить;
// в режиме редактирования: название, время начала, длительность в минутах.
export default function TimelineView({
  entries,
  readOnly,
  showNow,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: {
  entries: TimelineEntry[]
  readOnly: boolean
  showNow: boolean
  onToggle: (e: TimelineEntry) => void
  onEdit: (e: TimelineEntry, patch: Partial<BlockItem>) => void
  onDelete: (e: TimelineEntry) => void
  onAdd: (time: string) => string // возвращает id нового события
}) {
  const [editKey, setEditKey] = useState<string | null>(null)
  const [sheet, setSheet] = useState<TimelineEntry | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const lpTimer = useRef<number | null>(null)
  const lpFired = useRef(false)

  const hours = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)
  const trackH = (END_H - START_H + 1) * HOUR_H

  const now = new Date()
  const nowMin = toMin(now.getHours(), now.getMinutes())
  const nowY = ((nowMin - START_H * 60) / 60) * HOUR_H

  const addAt = (clientY: number) => {
    const el = trackRef.current
    if (!el || readOnly) return
    const rect = el.getBoundingClientRect()
    const y = clientY - rect.top
    let min = START_H * 60 + (y / HOUR_H) * 60
    min = Math.round(min / 30) * 30
    min = Math.max(START_H * 60, Math.min(END_H * 60 + 30, min))
    const id = onAdd(fmtMin(min))
    // ждём рендер и включаем редактирование
    window.setTimeout(() => setEditKey((k) => k ?? `new:${id}`), 0)
  }

  const startLp = (e: TimelineEntry) => {
    lpFired.current = false
    lpTimer.current = window.setTimeout(() => {
      lpFired.current = true
      setSheet(e)
    }, 400)
  }
  const cancelLp = () => {
    if (lpTimer.current) window.clearTimeout(lpTimer.current)
    lpTimer.current = null
  }

  return (
    <section
      className="rounded-2xl mb-3 overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <Clock size={15} strokeWidth={1.8} style={{ color: 'var(--ring-schedule)' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
          Расписание
        </span>
        <span className="flex-1" />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>тап по часу — новое событие</span>
      </div>

      <div
        ref={trackRef}
        className="relative mx-2 mb-2"
        style={{ height: trackH, touchAction: 'pan-y' }}
        onClick={(ev) => addAt(ev.clientY)}
      >
        {/* часовая сетка */}
        {hours.map((h) => {
          const y = (h - START_H) * HOUR_H
          return (
            <div key={h} className="absolute inset-x-0" style={{ top: y }}>
              <span
                className="absolute left-1 -top-2"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}
              >
                {fmtMin(h * 60)}
              </span>
              <span className="absolute left-12 right-1 top-0 h-px" style={{ background: 'var(--line)' }} />
            </div>
          )
        })}

        {/* линия «сейчас» */}
        {showNow && nowY >= 0 && nowY <= trackH && (
          <div className="absolute left-10 right-1 z-10 pointer-events-none" style={{ top: nowY }}>
            <span
              className="absolute -left-9 -top-2"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#e05555' }}
            >
              {fmtMin(nowMin)}
            </span>
            <span className="absolute left-0 -top-[3px] w-1.5 h-1.5 rounded-full" style={{ background: '#e05555' }} />
            <span className="absolute left-1.5 right-0 top-0 h-px" style={{ background: '#e05555' }} />
          </div>
        )}

        {/* события */}
        {entries.map((e) => {
          const t = parseTime(e.item.time)
          if (!t) return null
          const dur = e.item.dur ?? 60
          const top = ((toMin(t.h, t.m) - START_H * 60) / 60) * HOUR_H
          const h = Math.max(26, (dur / 60) * HOUR_H - 3)
          if (top < -HOUR_H || top > trackH) return null
          const k = keyOf(e)
          const editing = (editKey === k || editKey === `new:${e.item.id}`) && !readOnly
          return (
            <div
              key={k}
              className="absolute left-12 right-1 rounded-xl px-2.5 py-1.5 overflow-hidden"
              style={{
                top: Math.max(0, top),
                height: h,
                background: 'var(--surface-2)',
                borderLeft: `3px solid ${e.color}`,
                opacity: e.item.done ? 0.55 : 1,
                zIndex: 5,
              }}
              onClick={(ev) => {
                ev.stopPropagation()
                cancelLp()
                if (lpFired.current) return
                if (!readOnly) onToggle(e)
              }}
              onPointerDown={(ev) => {
                ev.stopPropagation()
                if (!readOnly) startLp(e)
              }}
              onPointerUp={cancelLp}
              onPointerMove={(ev) => {
                if (lpTimer.current && ev.movementY !== undefined && Math.abs(ev.movementY) > 6) cancelLp()
              }}
            >
              {editing ? (
                <div className="flex flex-col gap-1" onClick={(ev) => ev.stopPropagation()}>
                  <input
                    ref={(el) => el?.focus()}
                    value={e.item.text}
                    onChange={(ev) => onEdit(e, { text: ev.target.value })}
                    onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === 'Escape') && setEditKey(null)}
                    placeholder="Событие…"
                    className="w-full min-w-0 bg-transparent outline-none"
                    style={{ fontSize: 13, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={e.item.time ?? ''}
                      onChange={(ev) => onEdit(e, { time: ev.target.value })}
                      placeholder="09:00"
                      className="w-[52px] bg-transparent outline-none"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', borderBottom: '1px solid var(--accent)' }}
                      title="Начало (HH:MM)"
                    />
                    <input
                      value={String(e.item.dur ?? 60)}
                      onChange={(ev) => onEdit(e, { dur: Math.max(15, +ev.target.value.replace(/\D/g, '') || 60) })}
                      className="w-[38px] bg-transparent outline-none"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', borderBottom: '1px solid var(--accent)' }}
                      title="Длительность, мин"
                    />
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>мин</span>
                    <button
                      onClick={() => setEditKey(null)}
                      className="ml-auto px-2 py-0.5 rounded-md"
                      style={{ fontSize: 11, color: 'var(--accent)' }}
                    >
                      готово
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span
                    className="block truncate"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--light)',
                      textDecoration: e.item.done ? 'line-through' : 'none',
                      textDecorationColor: 'var(--line-strong)',
                    }}
                  >
                    {e.item.text || 'Событие…'}
                  </span>
                  {h > 40 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                      {e.item.time} – {fmtMin(toMin(t.h, t.m) + dur)}
                    </span>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {sheet && (
        <ActionSheet
          title={sheet.item.text || 'Событие'}
          onClose={() => setSheet(null)}
          onRename={() => setEditKey(keyOf(sheet))}
          onDelete={() => onDelete(sheet)}
        />
      )}
    </section>
  )
}
