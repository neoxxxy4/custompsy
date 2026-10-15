import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import { CATEGORIES, formatDateRu, isInverseParam, valueHex } from './mapLogic'

interface SessionRec {
  id: string
  date: string
  summary: string
}

interface WeekTask {
  id: string
  text: string
  done: boolean
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

const SEED_SESSIONS: SessionRec[] = [
  {
    id: 'seed-path-levels',
    date: new Date().toISOString().slice(0, 10),
    summary:
      'Личный путь (уровни): 1) Вход и калибровка — стабилизация, снижение тревоги, формирование наблюдателя; 2) Наблюдатель — осознание механизмов, отделение от реакций, видение паттернов; 3) Антрополог — исследование корней, детские сценарии, глубинные убеждения; 4) Инженер поведения — перепроектирование действий, новые стратегии, закрепление моделей; 5) Архитектор идентичности — сборка новой роли, структура ответственности, профессиональная позиция; 6) Навигация будущего — стратегический масштаб, план 3–5 лет, расширение влияния.',
  },
]

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

type SessionTab = 'session' | 'analysis' | 'diary' | 'done' | 'therapy'
type Period = 'week' | 'sprint' | 'all' | 'range'

const TABS: { id: SessionTab; label: string }[] = [
  { id: 'session', label: 'Сессия' },
  { id: 'analysis', label: 'Анализ' },
  { id: 'diary', label: 'Дневник' },
  { id: 'done', label: 'Выполнение' },
  { id: 'therapy', label: 'Терапия' },
]

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'Неделя' },
  { id: 'sprint', label: 'Спринт' },
  { id: 'all', label: 'Вся' },
  { id: 'range', label: 'Отрезок' },
]

export default function SessionView() {
  const [tab, setTab] = useState<SessionTab>('session')
  const [period, setPeriod] = useState<Period>('week')
  const [rangeFrom, setRangeFrom] = useState(daysAgo(7))
  const [rangeTo, setRangeTo] = useState(todayIso())

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Сессии
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
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? 'var(--on-fill)' : 'var(--muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'session' && tab !== 'analysis' && (
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

      {tab === 'session' && <SessionTab />}
      {tab === 'analysis' && <AnalysisTab />}
      {tab === 'diary' && <DiaryTab period={period} rangeFrom={rangeFrom} rangeTo={rangeTo} />}
      {tab === 'done' && <DoneTab period={period} rangeFrom={rangeFrom} rangeTo={rangeTo} />}
      {tab === 'therapy' && <TherapyTab period={period} rangeFrom={rangeFrom} rangeTo={rangeTo} />}
    </div>
  )
}

// ─── helpers ───

function usePeriodBounds(period: Period, rangeFrom: string, rangeTo: string) {
  return useMemo(() => {
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
}

// ─── session ───

function SessionTab() {
  const [sessions, setSessions] = useLS<SessionRec[]>('aod4-sessions', SEED_SESSIONS)
  const [weekTasks, setWeekTasks] = useLS<WeekTask[]>('aod4-week-tasks', [])
  const [taskDraft, setTaskDraft] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newSummary, setNewSummary] = useState('')

  const addSession = () => {
    const text = newSummary.trim()
    if (!text) return
    setSessions((ss) => [{ id: uid(), date: new Date().toISOString().slice(0, 10), summary: text }, ...ss])
    setNewSummary('')
    setShowNew(false)
  }

  const deleteSession = (id: string) => setSessions((ss) => ss.filter((s) => s.id !== id))

  const addTask = () => {
    const text = taskDraft.trim()
    if (!text) return
    setWeekTasks((ts) => [{ id: uid(), text, done: false }, ...ts])
    setTaskDraft('')
  }

  const toggleTask = (id: string) => setWeekTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const deleteTask = (id: string) => setWeekTasks((ts) => ts.filter((t) => t.id !== id))

  const pushTasksToWeek = () => {
    const pending = weekTasks.filter((t) => !t.done)
    if (!pending.length) return
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const stored = readLS<TodayData>(`aod4-today-data-${key}`)
      const data = stored || seedTodayData(key, WD[d.getDay()])
      const newItems: BlockItem[] = pending.map((t) => ({ id: uid(), text: t.text, done: false }))
      const next: TodayData = { ...data, tasks: { ...data.tasks, items: [...data.tasks.items, ...newItems] } }
      localStorage.setItem(`aod4-today-data-${key}`, JSON.stringify(next))
    }
    setWeekTasks((ts) => ts.map((t) => ({ ...t, done: true })))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Сессии</h2>
        {sessions.length === 0 && <p className="mt-2" style={{ fontSize: 12, color: 'var(--muted)' }}>—</p>}
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-2 mt-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <span className="flex-1 text-left" style={{ fontSize: 12, color: 'var(--text)' }}>{safeDate(s.date)} · {s.summary || '—'}</span>
            <button onClick={() => deleteSession(s.id)} className="p-1"><Trash2 size={14} strokeWidth={1.8} style={{ color: 'var(--muted)' }} /></button>
          </div>
        ))}

        {!showNew ? (
          <button onClick={() => setShowNew(true)} className="mt-3 w-full py-2 rounded-xl" style={{ border: '1px dashed var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}>+ Новая сессия</button>
        ) : (
          <div className="mt-3 space-y-2">
            <textarea
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Краткий итог сессии..."
              rows={3}
              className="w-full rounded-xl px-3 py-2 outline-none resize-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-xl" style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}>Отмена</button>
              <button onClick={addSession} className="flex-1 py-2 rounded-xl" style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 13, fontWeight: 600 }}>Сохранить</button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Задания на неделю</h2>
        <div className="flex gap-2 mt-2">
          <input
            value={taskDraft}
            onChange={(e) => setTaskDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
            placeholder="Новое задание..."
            className="flex-1 min-w-0 rounded-xl px-3 outline-none"
            style={{ height: 36, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button onClick={addTask} className="flex-none grid place-items-center rounded-xl" style={{ width: 36, height: 36, background: 'var(--accent)', color: 'var(--on-fill)' }}>
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-2 space-y-1.5">
          {weekTasks.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>—</p>}
          {weekTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <button onClick={() => toggleTask(t.id)} className="flex-none" style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${t.done ? 'var(--done)' : 'var(--line-strong)'}`, background: t.done ? 'var(--done)' : 'transparent' }} />
              <span className="flex-1" style={{ fontSize: 13, color: t.done ? 'var(--muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
              <button onClick={() => deleteTask(t.id)} className="p-1"><Trash2 size={14} strokeWidth={1.8} style={{ color: 'var(--muted)' }} /></button>
            </div>
          ))}
        </div>
        {weekTasks.some((t) => !t.done) && (
          <button onClick={pushTasksToWeek} className="mt-3 w-full py-2.5 rounded-xl" style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 13, fontWeight: 600 }}>
            Разнести на неделю
          </button>
        )}
      </div>
    </div>
  )
}

// ─── analysis ───

type AnalysisView = 'plus' | 'minus' | 'strengths' | 'gaps'

function AnalysisTab() {
  const [stored] = useLS<{ snapshots: Record<string, number[][]> }>('aod4-selfmap-v1', { snapshots: {} })
  const [view, setView] = useState<AnalysisView>('plus')
  const snapshots = stored?.snapshots ?? {}
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

// ─── diary ───

function DiaryTab({ period, rangeFrom, rangeTo }: { period: Period; rangeFrom: string; rangeTo: string }) {
  const [notes] = useLS<Note[]>('aod4-notes', [])
  const [listrecs] = useLS<ListRecord[]>('aod4-listrecs', [])
  const [diary] = useLS<Diary>('aod4-diary', {})
  const bounds = usePeriodBounds(period, rangeFrom, rangeTo)

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

// ─── done ───

function DoneTab({ period, rangeFrom, rangeTo }: { period: Period; rangeFrom: string; rangeTo: string }) {
  const bounds = usePeriodBounds(period, rangeFrom, rangeTo)

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

// ─── therapy ───

function TherapyTab({ period, rangeFrom, rangeTo }: { period: Period; rangeFrom: string; rangeTo: string }) {
  const [sessions] = useLS<SessionRec[]>('aod4-sessions', SEED_SESSIONS)
  const [level, setLevel] = useLS<number>('aod4-path-level', 1)
  const bounds = usePeriodBounds(period, rangeFrom, rangeTo)

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const ts = parseDate(s.date)
      return ts >= bounds.from && ts < bounds.to
    })
  }, [sessions, bounds])

  return (
    <div className="space-y-3">
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
                <span className="flex-none grid place-items-center rounded-full" style={{ width: 32, height: 32, background: active || passed ? 'var(--f-metacog)' : 'var(--surface-2)', color: active || passed ? 'var(--bg)' : 'var(--muted)', fontSize: 13, fontWeight: 700 }}>
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

      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Сессии за период</h2>
        {filtered.length === 0 ? (
          <p className="py-3 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>Нет сессий</p>
        ) : (
          <div className="mt-3 space-y-2">
            {filtered.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <span className="w-3 h-3 rounded-full flex-none" style={{ background: 'var(--f-metacog)' }} />
                <span className="flex-1 text-left" style={{ fontSize: 13, color: 'var(--text)' }}>{safeDate(s.date)} · {s.summary || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
