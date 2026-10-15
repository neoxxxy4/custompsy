import { useMemo, useState } from 'react'
import {
  seedTodayData,
  type BlockItem,
  type BlockList,
  type TodayData,
} from '../views/practice/store'
import { WD } from '../lib/dayStats'
import { formatDateRu } from './mapLogic'

type Period = 'week' | 'sprint' | 'all' | 'range'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const safeDate = (d?: string | null): string => {
  if (!d || !DATE_RE.test(d)) return '—'
  return formatDateRu(d)
}

const readLS = <T,>(key: string): T | null => {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const parseDate = (iso: string) => new Date(iso + 'T00:00:00').getTime()

const collectTaskItems = (lists: BlockList[]): BlockItem[] =>
  lists.flatMap((l) => [
    ...(l.kind === 'list' ? [] : l.items),
    ...collectTaskItems(l.lists ?? []),
  ])

const dayStat = (dateKey: string) => {
  const wdName = WD[new Date(dateKey + 'T00:00:00').getDay()]
  const data = readLS<TodayData>(`aod4-today-data-${dateKey}`) ?? seedTodayData(dateKey, wdName, true)
  let done = 0
  let total = 0
  Object.values(data).forEach((block) => {
    const all = [...block.items, ...collectTaskItems(block.lists)]
    done += all.filter((i) => i.done).length
    total += all.length
  })
  return { done, total, data }
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Неделя' },
  { id: 'sprint', label: 'Спринт' },
  { id: 'all', label: 'Вся' },
  { id: 'range', label: 'Отрезок' },
]

export default function ProgressView() {
  const [period, setPeriod] = useState<Period>('week')
  const [rangeFrom, setRangeFrom] = useState(daysAgo(7))
  const [rangeTo, setRangeTo] = useState(todayIso())

  const bounds = useMemo(() => {
    const now = Date.now()
    let from = now - 7 * 86400000
    let to = now
    if (period === 'sprint') {
      from = now - 28 * 86400000
    } else if (period === 'all') {
      from = 0
    } else if (period === 'range') {
      from = parseDate(rangeFrom)
      to = parseDate(rangeTo) + 86400000
    }
    return { from, to }
  }, [period, rangeFrom, rangeTo])

  const days = useMemo(() => {
    const list: { key: string; done: number; total: number; pct: number }[] = []
    const fromDate = new Date(bounds.from)
    const toDate = new Date(bounds.to)
    for (let d = new Date(fromDate); d < toDate; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const s = dayStat(key)
      list.push({ key, done: s.done, total: s.total, pct: s.total ? Math.round((s.done / s.total) * 100) : 0 })
    }
    return list
  }, [bounds])

  const totalDone = days.reduce((a, d) => a + d.done, 0)
  const totalTotal = days.reduce((a, d) => a + d.total, 0)
  const completedDays = days.filter((d) => d.total > 0 && d.done === d.total).length

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Прогресс
      </h1>

      <div className="mt-4 mb-3">
        <div
          className="flex gap-1 rounded-xl p-1 overflow-x-auto"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="flex-none rounded-lg py-1.5 px-3 transition-colors"
              style={{
                fontSize: 12,
                fontWeight: 600,
                background: period === p.id ? 'var(--accent)' : 'transparent',
                color: period === p.id ? 'var(--on-fill)' : 'var(--muted)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'range' && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="flex-1 rounded-xl px-2 py-1.5 outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}
            />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>→</span>
            <input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="flex-1 rounded-xl px-2 py-1.5 outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Пунктов</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--light)' }}>{totalDone}/{totalTotal}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Выполнено дней</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--light)' }}>{completedDays}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>Эффективность</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--light)' }}>{totalTotal ? Math.round((totalDone / totalTotal) * 100) : 0}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          {days.length === 0 ? (
            <p className="p-3 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>Нет данных</p>
          ) : (
            days.map((d, idx) => (
              <div key={d.key} className="flex items-center gap-3 px-3 py-2" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--line)' }}>
                <span className="flex-1" style={{ fontSize: 13, color: 'var(--text)' }}>{safeDate(d.key)}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{d.done}/{d.total}</span>
                <div className="flex-none w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full" style={{ width: `${d.pct}%`, background: d.pct === 100 ? 'var(--done)' : 'var(--accent)' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
