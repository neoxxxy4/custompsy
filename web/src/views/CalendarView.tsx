import { useMemo, useState } from 'react'
import { CAL_EVENTS, type CalEvent } from '../data/system'
import { useLS } from './practice/store'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const WD = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function CalendarView() {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<string>(fmt(today))
  const [custom, setCustom] = useLS<CalEvent[]>('aod-cal', [])
  const [draft, setDraft] = useState('')

  const events = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    ;[...CAL_EVENTS, ...custom].forEach((e) => {
      ;(map[e.date] ||= []).push(e)
    })
    return map
  }, [custom])

  const cells = useMemo(() => {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const first = new Date(y, m, 1)
    const lead = (first.getDay() + 6) % 7 // Monday-first
    const daysIn = new Date(y, m + 1, 0).getDate()
    const prevDays = new Date(y, m, 0).getDate()
    const arr: { date: string; day: number; other: boolean }[] = []
    for (let i = lead - 1; i >= 0; i--) arr.push({ date: fmt(new Date(y, m - 1, prevDays - i)), day: prevDays - i, other: true })
    for (let d = 1; d <= daysIn; d++) arr.push({ date: fmt(new Date(y, m, d)), day: d, other: false })
    while (arr.length % 7 !== 0) {
      const d = arr.length - (lead + daysIn) + 1
      arr.push({ date: fmt(new Date(y, m + 1, d)), day: d, other: true })
    }
    return arr
  }, [cursor])

  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))

  const addEvent = () => {
    if (!draft.trim()) return
    setCustom((c) => [...c, { date: selected, title: draft.trim(), color: '#8ab2d1', kind: 'ритуал' }])
    setDraft('')
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-10">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label mb-2">Модуль 07</p>
          <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>Календарь</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => shift(-1)} className="glass rounded-sm px-3 py-2 mono-label-bright hover:opacity-80">←</button>
          <p className="display" style={{ fontSize: 24, minWidth: 220, textAlign: 'center' }}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <button onClick={() => shift(1)} className="glass rounded-sm px-3 py-2 mono-label-bright hover:opacity-80">→</button>
        </div>
      </div>

      <div className="rise mt-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3" style={{ animationDelay: '100ms' }}>
        <div className="panel rounded-md p-3">
          <div className="grid grid-cols-7 mb-1">
            {WD.map((d) => (
              <p key={d} className="mono-label text-center py-2">{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((c) => {
              const dayEvents = events[c.date] || []
              const isToday = c.date === fmt(today)
              const isSel = c.date === selected
              return (
                <div
                  key={c.date}
                  className={`cal-day ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''} ${c.other ? 'other-month' : ''}`}
                  onClick={() => setSelected(c.date)}
                >
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isToday ? 'var(--accent)' : 'var(--text)' }}>
                    {c.day}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {dayEvents.slice(0, 2).map((e, i) => (
                      <p
                        key={i}
                        className="truncate text-[10px] leading-tight px-1 py-0.5 rounded-sm"
                        style={{ background: `${e.color}22`, color: 'var(--text)', borderLeft: `2px solid ${e.color}` }}
                      >
                        {e.title}
                      </p>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="mono-label" style={{ fontSize: 8 }}>+{dayEvents.length - 2}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* side panel */}
        <aside className="panel rounded-md p-5 h-fit">
          <p className="mono-label">День</p>
          <p className="display mt-1" style={{ fontSize: 22 }}>{selected.split('-').reverse().join('.')}</p>
          <div className="mt-4 space-y-2.5">
            {(events[selected] || []).length === 0 && (
              <p className="text-[12.5px]" style={{ color: 'var(--muted)' }}>Свободный слот. Никаких обязательств.</p>
            )}
            {(events[selected] || []).map((e, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="tag-dot mt-1.5" style={{ background: e.color }} />
                <div>
                  <p className="text-[13px] leading-snug" style={{ color: 'var(--light)' }}>{e.title}</p>
                  <p className="mono-label mt-0.5" style={{ fontSize: 8 }}>{e.kind}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="mono-label mb-2">Добавить событие</p>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEvent()}
              placeholder="Название…"
              className="w-full bg-transparent rounded-sm px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--light)' }}
            />
            <button
              onClick={addEvent}
              className="mt-2 w-full mono-label-bright px-3 py-2 rounded-sm hover:opacity-85 transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              В календарь
            </button>
            <p className="mono-label mt-3" style={{ fontSize: 8 }}>свои события хранятся в этом браузере</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
