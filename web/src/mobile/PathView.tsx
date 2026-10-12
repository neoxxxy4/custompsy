import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  allEmotionTags,
  emotionName,
  plutchikColor,
  seedTodayData,
  type BlockItem,
  type Diary,
  type EmotionTag,
  type ListRecord,
  type Note,
  type TodayData,
  uid,
  useLS,
} from '../views/practice/store'
import { WD } from '../lib/dayStats'
import {
  CATEGORIES,
  formatDateRu,
  isInverseParam,
  valueHex,
} from './mapLogic'

interface PathLevel {
  id: number
  title: string
  focus: string[]
}

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

const LEVELS: PathLevel[] = [
  { id: 1, title: 'Вход и калибровка', focus: ['Стабилизация состояния', 'Снижение тревоги и хаоса', 'Формирование наблюдателя'] },
  { id: 2, title: 'Наблюдатель', focus: ['Осознание механизмов', 'Отделение себя от реакций', 'Видение паттернов'] },
  { id: 3, title: 'Антрополог', focus: ['Исследование корней', 'Детские сценарии', 'Глубинные убеждения'] },
  { id: 4, title: 'Инженер поведения', focus: ['Перепроектирование действий', 'Новые стратегии', 'Закрепление моделей'] },
  { id: 5, title: 'Архитектор идентичности', focus: ['Сборка новой роли', 'Структура ответственности', 'Профессиональная позиция'] },
  { id: 6, title: 'Навигация будущего', focus: ['Стратегический масштаб', 'План 3–5 лет', 'Расширение влияния'] },
]

type PathTab = 'session' | 'analysis' | 'diary' | 'circle' | 'levels'

const TABS: { id: PathTab; label: string }[] = [
  { id: 'session', label: 'Сессия' },
  { id: 'analysis', label: 'Анализ' },
  { id: 'diary', label: 'Дневник' },
  { id: 'circle', label: 'Круг' },
  { id: 'levels', label: 'Уровни' },
]

export default function PathView() {
  const [tab, setTab] = useState<PathTab>('session')

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Путь
      </h1>

      <div
        className="flex gap-1 rounded-xl p-1 mt-4 mb-4 overflow-x-auto"
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

      {tab === 'analysis' && <AnalysisTab />}
      {tab === 'diary' && <DiaryTab />}
      {tab === 'circle' && <CircleTab />}
      {tab === 'session' && <SessionTab />}
      {tab === 'levels' && <LevelsTab />}
    </div>
  )
}

// ─── analysis ───

type AnalysisView = 'plus' | 'minus' | 'strengths' | 'gaps'

function AnalysisTab() {
  const [stored] = useLS<{ snapshots: Record<string, number[][]> }>('aod3-selfmap-v1', { snapshots: {} })
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

function DiaryTab() {
  const [notes] = useLS<Note[]>('aod3-notes', [])
  const [listrecs] = useLS<ListRecord[]>('aod3-listrecs', [])
  const [diary] = useLS<Diary>('aod3-diary', {})
  const [selected, setSelected] = useState<EmotionTag | null>(null)

  const tags = useMemo(() => {
    const now = Date.now()
    const start = now - 7 * 86400000
    return allEmotionTags(notes, listrecs, diary).filter((t) => t.created >= start && t.created < now).sort((a, b) => b.created - a.created)
  }, [notes, listrecs, diary])

  return (
    <div className="space-y-3">
      {tags.length === 0 && (
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Нет эмоций за неделю</p>
        </div>
      )}
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => setSelected(tag)}
          className="w-full rounded-2xl p-3 text-left"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full flex-none" style={{ background: plutchikColor(tag.emotion) }} />
            <span className="flex-1" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>{emotionName(tag.emotion)}</span>
            <span className="px-1.5 rounded" style={{ background: plutchikColor(tag.emotion), color: '#fff', fontSize: 10, fontWeight: 700 }}>{tag.level}</span>
          </div>
          <div className="flex flex-wrap gap-1 pl-5">
            {tag.feelings?.map((f) => <span key={f.name} className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--text)' }}>{f.name} · {f.level}</span>)}
            {tag.sensations?.map((s) => <span key={s.name} className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--text)' }}>{s.name} · {s.level}</span>)}
          </div>
        </button>
      ))}

      {selected && <EmotionDetail tag={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function EmotionDetail({ tag, onClose }: { tag: EmotionTag; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderBottom: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid place-items-center pb-3">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>
        <h2 className="mb-3" style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, color: 'var(--light)' }}>
          {emotionName(tag.emotion)} · уровень {tag.level}
        </h2>
        {tag.feelings && tag.feelings.length > 0 && (
          <div className="mb-3">
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Чувства</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {tag.feelings.map((f) => <span key={f.name} className="px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--text)' }}>{f.name} · {f.level}</span>)}
            </div>
          </div>
        )}
        {tag.sensations && tag.sensations.length > 0 && (
          <div className="mb-4">
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Ощущения</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {tag.sensations.map((s) => <span key={s.name} className="px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--text)' }}>{s.name} · {s.level}</span>)}
            </div>
          </div>
        )}
        <button onClick={onClose} className="w-full py-3 rounded-xl" style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 14, fontWeight: 600 }}>Закрыть</button>
      </div>
    </div>
  )
}

// ─── circle ───

function CircleTab() {
  const [sessions] = useLS<SessionRec[]>('aod3-sessions', [])

  return (
    <section className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Круг терапии</h2>
      {sessions.length === 0 ? (
        <p className="py-4 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>Нет сессий</p>
      ) : (
        <div className="mt-3 space-y-2">
          {sessions.slice(0, 12).map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <span className="w-3 h-3 rounded-full flex-none" style={{ background: 'var(--f-metacog)' }} />
              <span className="flex-1 text-left" style={{ fontSize: 13, color: 'var(--text)' }}>{safeDate(s.date)} · {s.summary || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── session ───

type SessionMiniTab = 'summary' | 'tasks'

function SessionTab() {
  const [mini, setMini] = useState<SessionMiniTab>('summary')
  const [sessions, setSessions] = useLS<SessionRec[]>('aod3-sessions', [])
  const [weekTasks, setWeekTasks] = useLS<WeekTask[]>('aod3-week-tasks', [])
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
      const stored = readLS<TodayData>(`aod3-today-data-${key}`)
      const data = stored || seedTodayData(key, WD[d.getDay()])
      const newItems: BlockItem[] = pending.map((t) => ({ id: uid(), text: t.text, done: false }))
      const next: TodayData = { ...data, tasks: { ...data.tasks, items: [...data.tasks.items, ...newItems] } }
      localStorage.setItem(`aod3-today-data-${key}`, JSON.stringify(next))
    }
    setWeekTasks((ts) => ts.map((t) => ({ ...t, done: true })))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        {([
          { id: 'summary', label: 'Сводка' },
          { id: 'tasks', label: 'Задания' },
        ] as { id: SessionMiniTab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setMini(t.id)}
            className="rounded-lg py-1.5"
            style={{ fontSize: 12, fontWeight: 600, background: mini === t.id ? 'var(--accent)' : 'transparent', color: mini === t.id ? 'var(--on-fill)' : 'var(--muted)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mini === 'summary' && (
        <div className="space-y-3">
          <SummaryView />
          <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>Сессии</h3>
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
        </div>
      )}

      {mini === 'tasks' && (
        <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>Задания на следующую неделю</h3>
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
      )}
    </div>
  )
}

function SummaryView() {
  const [level] = useLS<number>('aod3-path-level', 1)
  const [stored] = useLS<{ snapshots: Record<string, number[][]> }>('aod3-selfmap-v1', { snapshots: {} })
  const [dNotes] = useLS<Note[]>('aod3-notes', [])
  const [dListrecs] = useLS<ListRecord[]>('aod3-listrecs', [])
  const [dDiary] = useLS<Diary>('aod3-diary', {})

  const snapshots = stored?.snapshots ?? {}
  const analysisItems = useMemo(() => {
    const dates = Object.keys(snapshots).sort()
    if (dates.length < 2) return []
    const d1 = dates[dates.length - 2]
    const d2 = dates[dates.length - 1]
    const s1 = snapshots[d1]
    const s2 = snapshots[d2]
    if (!Array.isArray(s1) || !Array.isArray(s2)) return []
    const result: { paramName: string; diff: number }[] = []
    CATEGORIES.forEach((cat, ci) => {
      const row1 = s1[ci]
      const row2 = s2[ci]
      if (!Array.isArray(row1) || !Array.isArray(row2)) return
      cat.params.forEach((paramName, pi) => {
        const v1 = row1[pi]
        const v2 = row2[pi]
        if (typeof v1 !== 'number' || typeof v2 !== 'number') return
        const inverse = isInverseParam(ci, pi)
        const n1 = inverse ? 12 - v1 : v1
        const n2 = inverse ? 12 - v2 : v2
        result.push({ paramName, diff: n2 - n1 })
      })
    })
    return result
  }, [snapshots])

  const emotions = useMemo(() => {
    const now = Date.now()
    const start = now - 7 * 86400000
    return allEmotionTags(dNotes, dListrecs, dDiary).filter((t) => t.created >= start && t.created < now)
  }, [dNotes, dListrecs, dDiary])

  const topPlus = analysisItems.filter((i) => i.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 3)
  const topMinus = analysisItems.filter((i) => i.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 3)
  const emotionFreq = useMemo(() => {
    const map: Record<string, number> = {}
    emotions.forEach((t) => { map[t.emotion] = (map[t.emotion] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [emotions])

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>Текущий уровень</h3>
        <p className="mt-1" style={{ fontSize: 14, color: 'var(--text)' }}>{LEVELS.find((l) => l.id === level)?.title}</p>
      </div>

      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>Карта самооценки</h3>
        {topPlus.length > 0 && (
          <div className="mt-2">
            <p style={{ fontSize: 11, color: 'var(--done)' }}>Улучшилось</p>
            {topPlus.map((i) => <p key={i.paramName} style={{ fontSize: 12, color: 'var(--text)' }}>• {i.paramName} (+{Math.round(i.diff * 10) / 10})</p>)}
          </div>
        )}
        {topMinus.length > 0 && (
          <div className="mt-2">
            <p style={{ fontSize: 11, color: '#ef4444' }}>Ухудшилось</p>
            {topMinus.map((i) => <p key={i.paramName} style={{ fontSize: 12, color: 'var(--text)' }}>• {i.paramName} ({Math.round(i.diff * 10) / 10})</p>)}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>Эмоции за неделю</h3>
        {emotionFreq.length === 0 ? <p className="mt-1" style={{ fontSize: 12, color: 'var(--muted)' }}>—</p> : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {emotionFreq.map(([emotion, count]) => (
              <span key={emotion} className="px-2 py-0.5 rounded-full" style={{ background: plutchikColor(emotion) + '22', border: `1px solid ${plutchikColor(emotion)}`, fontSize: 12, color: 'var(--text)' }}>
                {emotionName(emotion)} · {count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── levels ───

function LevelsTab() {
  const [level, setLevel] = useLS<number>('aod3-path-level', 1)

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
  )
}

// ─── helpers ───

const readLS = <T,>(key: string): T | null => {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const safeDate = (d?: string | null): string => {
  if (!d || !DATE_RE.test(d)) return '—'
  return formatDateRu(d)
}
