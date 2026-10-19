import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  seedTodayData,
  type BlockItem,
  type BlockList,
  type Diary,
  type ListRecord,
  type Note,
  type TodayData,
  allEmotionTags,
  emotionName,
  plutchikColor,
  uid,
  useLS,
} from '../views/practice/store'
import { WD } from '../lib/dayStats'
import { readLS } from '../lib/sync'
import { CATEGORIES, formatDateRu, isInverseParam, valueHex } from './mapLogic'

interface SessionNote {
  id: string
  text: string
  ts: number
}

interface TherapyNote {
  id: string
  text: string
  category: string
  ts: number
}

interface PathLevel {
  id: number
  title: string
  focus: string[]
}

const LEVELS: PathLevel[] = [
  { id: 1, title: 'Вход и калибровка', focus: ['Стабилизация состояния', 'Снижение тревоги и хаоса', 'Формирование наблюдателя'] },
  { id: 2, title: 'Наблюдатель', focus: ['Осознание механизмов', 'Отделение себя от реакций', 'Видение паттернов'] },
  { id: 3, title: 'Антрополог', focus: ['Исследование корней', 'Детские сценарии', 'Глубинные убеждения'] },
  { id: 4, title: 'Инженер поведения', focus: ['Перепроектирование действий', 'Новые стратегии', 'Закрепление моделей'] },
  { id: 5, title: 'Архитектор идентичности', focus: ['Сборка новой роли', 'Структура ответственности', 'Профессиональная позиция'] },
  { id: 6, title: 'Навигация будущего', focus: ['Стратегический масштаб', 'План 3–5 лет', 'Расширение влияния'] },
]

const THERAPY_CATEGORIES: Record<string, { label: string; color: string }> = {
  trauma: { label: 'Травма', color: '#ef4444' },
  offense: { label: 'Обида', color: '#f97316' },
  shame: { label: 'Стыд', color: '#eab308' },
  guilt: { label: 'Вина', color: '#8b5cf6' },
  fear: { label: 'Страх', color: '#06b6d4' },
  anger: { label: 'Гнев', color: '#ec4899' },
  other: { label: 'Другое', color: 'var(--muted)' },
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const safeDate = (d?: string | null): string => {
  if (!d || !DATE_RE.test(d)) return '—'
  return formatDateRu(d)
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
  const data = readLS<TodayData | null>(`aod4-today-data-${dateKey}`, null) ?? seedTodayData(dateKey, wdName, true)
  let done = 0
  let total = 0
  Object.values(data).forEach((block) => {
    const all = [...block.items, ...collectTaskItems(block.lists)]
    done += all.filter((i) => i.done).length
    total += all.length
  })
  return { done, total, data }
}

type AnalyticsTab = 'selfmap' | 'emotions' | 'therapy' | 'progress' | 'path'
type SessionTab = 'session' | AnalyticsTab
type Period = 'week' | 'sprint' | 'all' | 'range'

const ANALYTICS_KEY = 'aod4-session-analytics-tabs'
const ANALYTICS_LABELS: Record<AnalyticsTab, string> = {
  selfmap: 'Самооценка',
  emotions: 'Эмоции',
  therapy: 'Терапия',
  progress: 'Прогресс',
  path: 'Путь',
}
const DEFAULT_ANALYTICS: AnalyticsTab[] = ['selfmap', 'emotions', 'therapy', 'progress', 'path']

function useSessionTabs() {
  const [enabled] = useLS<AnalyticsTab[]>(ANALYTICS_KEY, DEFAULT_ANALYTICS)
  const tabs: { id: SessionTab; label: string }[] = [{ id: 'session', label: 'Сессия' }]
  const safe = (enabled ?? []).filter((id): id is AnalyticsTab => id in ANALYTICS_LABELS)
  safe.forEach((id) => tabs.push({ id, label: ANALYTICS_LABELS[id] }))
  return tabs
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Неделя' },
  { id: 'sprint', label: 'Спринт' },
  { id: 'all', label: 'Вся' },
  { id: 'range', label: 'Отрезок' },
]

export default function SessionView() {
  const TABS = useSessionTabs()
  const [tab, setTab] = useState<SessionTab>('session')
  const activeTab = TABS.some((t) => t.id === tab) ? tab : 'session'

  const [period, setPeriod] = useState<Period>('week')
  const [rangeFrom, setRangeFrom] = useState(daysAgo(7))
  const [rangeTo, setRangeTo] = useState(todayIso())
  const [now] = useState(() => Date.now())

  const showPeriod = activeTab === 'emotions' || activeTab === 'therapy' || activeTab === 'progress'

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Сессия
      </h1>

      <div
        className="flex gap-1 rounded-xl p-1 mt-4 mb-3 overflow-x-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-none rounded-lg py-1.5 px-3 transition-colors"
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: activeTab === t.id ? 'var(--accent)' : 'transparent',
              color: activeTab === t.id ? 'var(--on-fill)' : 'var(--muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showPeriod && (
        <div className="mb-3">
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
      )}

      {activeTab === 'session' && <SessionTab />}
      {activeTab === 'selfmap' && <SelfmapTab />}
      {activeTab === 'emotions' && <EmotionsTab period={period} rangeFrom={rangeFrom} rangeTo={rangeTo} now={now} />}
      {activeTab === 'therapy' && <TherapyTab period={period} rangeFrom={rangeFrom} rangeTo={rangeTo} now={now} />}
      {activeTab === 'progress' && <ProgressTab period={period} rangeFrom={rangeFrom} rangeTo={rangeTo} now={now} />}
      {activeTab === 'path' && <PathTab />}
    </div>
  )
}

// ─── helpers ───

function usePeriodBounds(period: Period, rangeFrom: string, rangeTo: string, now: number) {
  return useMemo(() => {
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
  }, [period, rangeFrom, rangeTo, now])
}

// ─── session ───

function SessionTab() {
  const [notes, setNotes] = useLS<SessionNote[]>('aod4-session-notes', [])
  const [draft, setDraft] = useState('')
  const [noteSheet, setNoteSheet] = useState<SessionNote | null>(null)

  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    setNotes((ns) => [{ id: uid(), text, ts: Date.now() }, ...ns])
    setDraft('')
  }

  const deleteNote = (id: string) => setNotes((ns) => ns.filter((n) => n.id !== id))

  const dateStr = (ts: number) => safeDate(new Date(ts).toISOString().slice(0, 10))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <p className="mb-3" style={{ fontSize: 13, color: 'var(--muted)' }}>
          Заметки и вопросы для специалиста
        </p>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNote() }}
            placeholder="Новая тема или вопрос..."
            className="flex-1 min-w-0 rounded-xl px-3 outline-none"
            style={{ height: 40, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button
            onClick={addNote}
            className="flex-none grid place-items-center rounded-xl"
            style={{ width: 40, height: 40, background: 'var(--accent)', color: 'var(--on-fill)' }}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {notes.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>—</p>}
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => setNoteSheet(n)}
              className="w-full text-left rounded-xl px-3 py-2.5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
            >
              <span className="block" style={{ fontSize: 13, color: 'var(--text)' }}>{n.text}</span>
              <span className="block mt-1" style={{ fontSize: 11, color: 'var(--muted)' }}>{dateStr(n.ts)}</span>
            </button>
          ))}
        </div>
      </div>

      {noteSheet && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setNoteSheet(null)} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderBottom: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="grid place-items-center pb-3">
              <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
            </div>
            <h2 className="mb-3" style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
              {noteSheet.text || 'Заметка'}
            </h2>
            <button
              onClick={() => { deleteNote(noteSheet.id); setNoteSheet(null) }}
              className="w-full py-3 rounded-xl"
              style={{ background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 600 }}
            >
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── selfmap ───

type AnalysisView = 'plus' | 'minus' | 'strengths' | 'gaps'

function SelfmapTab() {
  const [stored] = useLS<{ snapshots: Record<string, number[][]> }>('aod4-selfmap-v1', { snapshots: {} })
  const [view, setView] = useState<AnalysisView>('plus')
  const snapshots = useMemo(() => stored?.snapshots ?? {}, [stored?.snapshots])
  const dates = useMemo(() => Object.keys(snapshots).sort(), [snapshots])
  const [date1, setDate1] = useState(dates[0] ?? '')
  const [date2, setDate2] = useState(dates[dates.length - 1] ?? '')

  const items = useMemo(() => {
    const s1 = snapshots[date1]
    const s2 = snapshots[date2]
    if (!Array.isArray(s1) || !Array.isArray(s2) || date1 === date2) return []
    const result: { paramName: string; categoryName: string; value1: number; value2: number; diff: number; norm: number }[] = []
    CATEGORIES.forEach((cat, ci) => {
      const row1 = s1[ci]
      const row2 = s2[ci]
      if (!Array.isArray(row1) || !Array.isArray(row2)) return
      cat.params.forEach((paramName, pi) => {
        const v1 = row1[pi]
        const v2 = row2[pi]
        if (typeof v1 !== 'number' || typeof v2 !== 'number') return
        const inverse = isInverseParam(ci, pi)
        const norm1 = inverse ? 12 - v1 : v1
        const norm2 = inverse ? 12 - v2 : v2
        result.push({ paramName, categoryName: cat.name, value1: v1, value2: v2, diff: norm2 - norm1, norm: norm2 })
      })
    })
    return result
  }, [snapshots, date1, date2])

  const filtered = useMemo(() => {
    if (view === 'plus') return items.filter((i) => i.diff > 0).sort((a, b) => b.diff - a.diff)
    if (view === 'minus') return items.filter((i) => i.diff < 0).sort((a, b) => a.diff - b.diff)
    if (view === 'strengths') return items.filter((i) => i.norm >= 10 && i.norm <= 12).sort((a, b) => b.norm - a.norm)
    return items.filter((i) => i.norm >= 0 && i.norm <= 2).sort((a, b) => a.norm - b.norm)
  }, [items, view])

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2 mb-3">
          <select value={date1} onChange={(e) => setDate1(e.target.value)} className="flex-1 rounded-xl px-2 py-1.5 outline-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}>
            {dates.map((d) => <option key={d} value={d}>{safeDate(d)}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>→</span>
          <select value={date2} onChange={(e) => setDate2(e.target.value)} className="flex-1 rounded-xl px-2 py-1.5 outline-none" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}>
            {dates.map((d) => <option key={d} value={d}>{safeDate(d)}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
          {([
            { id: 'plus', label: 'Улучш +' },
            { id: 'minus', label: 'Ухудш −' },
            { id: 'strengths', label: 'Сила' },
            { id: 'gaps', label: 'Узкие' },
          ] as { id: AnalysisView; label: string }[]).map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className="rounded-lg py-1.5"
              style={{ fontSize: 12, fontWeight: 600, background: view === v.id ? 'var(--accent)' : 'transparent', color: view === v.id ? 'var(--on-fill)' : 'var(--muted)' }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        {filtered.length === 0 ? (
          <p className="p-3 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>Нет данных</p>
        ) : (
          filtered.map((item, idx) => (
            <div key={`${item.paramName}-${idx}`} className="flex items-center gap-2 px-3 py-2" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--line)' }}>
              <span className="flex-1 min-w-0" style={{ fontSize: 12, color: 'var(--text)' }}>
                {item.paramName}
                <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>{item.categoryName}</span>
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{item.value1} → {item.value2}</span>
              <span className="px-1.5 rounded" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, background: valueHex(false, item.norm), color: '#fff' }}>
                {item.diff > 0 ? '+' : ''}{Math.round(item.diff * 10) / 10}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── emotions ───

function EmotionsTab({ period, rangeFrom, rangeTo, now }: { period: Period; rangeFrom: string; rangeTo: string; now: number }) {
  const [notes] = useLS<Note[]>('aod4-notes', [])
  const [listrecs] = useLS<ListRecord[]>('aod4-listrecs', [])
  const [diary] = useLS<Diary>('aod4-diary', {})
  const bounds = usePeriodBounds(period, rangeFrom, rangeTo, now)

  const tags = useMemo(() => {
    return allEmotionTags(notes, listrecs, diary).filter((t) => t.created >= bounds.from && t.created < bounds.to)
  }, [notes, listrecs, diary, bounds])

  const grouped = useMemo(() => {
    const map: Record<string, typeof tags> = {}
    tags.forEach((t) => {
      map[t.emotion] = map[t.emotion] || []
      map[t.emotion].push(t)
    })
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length)
  }, [tags])

  if (tags.length === 0) {
    return (
      <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Нет эмоций за период</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Всего отметок: <span style={{ color: 'var(--light)', fontWeight: 600 }}>{tags.length}</span>
        </p>
      </div>
      {grouped.map(([emotion, emotionTags]) => {
        const color = plutchikColor(emotion)
        const maxLevel = Math.max(...emotionTags.map((t) => t.level))
        return (
          <div key={emotion} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full flex-none" style={{ background: color }} />
              <span className="flex-1" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>{emotionName(emotion)}</span>
              <span className="px-1.5 rounded" style={{ background: color, color: '#fff', fontSize: 11, fontWeight: 700 }}>{maxLevel}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{emotionTags.length}×</span>
            </div>
            <div className="space-y-2">
              {emotionTags.map((t) => (
                <div key={t.id} className="rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                  <div className="flex flex-wrap gap-1">
                    {t.feelings?.map((f) => <span key={f.name} className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--text)' }}>{f.name} · {f.level}</span>)}
                    {t.sensations?.map((s) => <span key={s.name} className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--text)' }}>{s.name} · {s.level}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── therapy ───

function TherapyTab({ period, rangeFrom, rangeTo, now }: { period: Period; rangeFrom: string; rangeTo: string; now: number }) {
  const [notes] = useLS<TherapyNote[]>('aod4-therapy-notes', [])
  const bounds = usePeriodBounds(period, rangeFrom, rangeTo, now)

  const filtered = useMemo(() => {
    return notes.filter((n) => n.ts >= bounds.from && n.ts < bounds.to)
  }, [notes, bounds])

  const grouped = useMemo(() => {
    const map: Record<string, TherapyNote[]> = {}
    filtered.forEach((n) => {
      map[n.category] = map[n.category] || []
      map[n.category].push(n)
    })
    return Object.entries(map)
  }, [filtered])

  return (
    <div className="space-y-3">
      {filtered.length === 0 && (
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Нет терапевтических заметок за период</p>
        </div>
      )}
      {grouped.map(([category, items]) => {
        const meta = THERAPY_CATEGORIES[category] ?? { label: category || 'Другое', color: 'var(--muted)' }
        return (
          <div key={category} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{meta.label}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{items.length}</span>
            </div>
            {items.map((n, idx) => (
              <div key={n.id} className="px-3 py-2" style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--line)' }}>
                <p style={{ fontSize: 13, color: 'var(--text)' }}>{n.text}</p>
                <p className="mt-1" style={{ fontSize: 11, color: 'var(--muted)' }}>{safeDate(new Date(n.ts).toISOString().slice(0, 10))}</p>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── progress ───

function ProgressTab({ period, rangeFrom, rangeTo, now }: { period: Period; rangeFrom: string; rangeTo: string; now: number }) {
  const bounds = usePeriodBounds(period, rangeFrom, rangeTo, now)

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
  )
}

// ─── path ───

function PathTab() {
  const [level, setLevel] = useLS<number>('aod4-path-level', 1)

  return (
    <section className="space-y-2">
      {LEVELS.map((l) => {
        const active = level === l.id
        const passed = l.id < level
        return (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className="w-full rounded-2xl p-3 text-left"
            style={{ background: 'var(--surface)', border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`, boxShadow: active ? '0 0 0 1px var(--accent)' : 'none' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex-none grid place-items-center rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  background: active || passed ? 'var(--f-metacog)' : 'var(--surface-2)',
                  color: active || passed ? 'var(--bg)' : 'var(--muted)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {passed ? '✓' : l.id}
              </span>
              <span className="flex-1" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>{l.title}</span>
            </div>
            <div className="mt-2 pl-11 space-y-0.5">
              {l.focus.map((f, i) => <p key={i} style={{ fontSize: 12, color: 'var(--muted)' }}>{f}</p>)}
            </div>
          </button>
        )
      })}
    </section>
  )
}
