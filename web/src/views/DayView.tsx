import { useMemo, useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import type { ViewId } from '../App'
import { CAL_EVENTS, type CalEvent } from '../data/system'
import { WD } from '../lib/dayStats'
import {
  type DayInstance,
  type Goal,
  type Note,
  type SchedBlock,
  type Template,
  SEED_NOTES,
  instantiate,
  seedDay,
  seedSchedBlocks,
  todayKey,
  uid,
  useLS,
} from './practice/store'
import TemplateManager from './practice/TemplateManager'

const MO = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const WD_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']

const EMPTY_GOALS: Goal[] = Array.from({ length: 4 }, () => ({ text: '', done: false }))

function Ring({ pct, color, size = 76 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        style={{ transition: 'stroke-dashoffset .5s cubic-bezier(0.65,0,0.35,1)' }}
      />
    </svg>
  )
}

function Tick({ done, color, size = 16 }: { done: boolean; color: string; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-sm flex-none transition-all"
      style={{
        width: size, height: size,
        border: `1px solid ${done ? color : 'var(--line-strong)'}`,
        background: done ? color : 'transparent',
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 10 10" fill="none"
        style={{ opacity: done ? 1 : 0, transition: 'opacity .15s ease' }}>
        <path d="M1.5 5.5L4 8L8.5 2" stroke="#050100" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function PanelHeader({ title, right }: { title: string; right?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="mono-label flex items-center gap-2">
        {title}
        {right && <span style={{ color: 'var(--text)' }}>{right}</span>}
      </p>
      <Pencil size={12} strokeWidth={1.5} style={{ color: 'var(--muted)' }} aria-hidden />
    </div>
  )
}

export default function DayView({ go }: { go: (v: ViewId) => void }) {
  const now = new Date()
  const tk = todayKey()
  const wdName = WD[now.getDay()]
  const dateLabel = `СЕГОДНЯ · ${now.getDate()} ${MO[now.getMonth()]} · ${WD_FULL[now.getDay()]}`

  const [dayLists, setDayLists] = useLS<DayInstance[]>(`aod2-day-${tk}`, seedDay())
  const [goals, setGoals] = useLS<Goal[]>(`aod2-goals-${tk}`, EMPTY_GOALS)
  const [blocks, setBlocks] = useLS<SchedBlock[]>(`aod2-schedblocks-${tk}`, seedSchedBlocks(tk, wdName))
  const [customEvents] = useLS<CalEvent[]>('aod-cal', [])
  const [notes, setNotes] = useLS<Note[]>('aod2-notes', SEED_NOTES)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({})
  const [noteDraft, setNoteDraft] = useState('')

  // события из «Календаря» на сегодня (только чтение)
  const eventsToday = useMemo(
    () => [...CAL_EVENTS, ...customEvents].filter((e) => e.date === tk),
    [customEvents, tk]
  )

  const onDayIds = useMemo(() => new Set(dayLists.map((d) => d.templateId)), [dayLists])

  // прогресс дня: цели + блоки расписания + пункты чек-листов
  const stats = useMemo(() => {
    const gDone = goals.filter((g) => g.done).length
    const sDone = blocks.filter((b) => b.done).length
    const cTotal = dayLists.reduce((n, d) => n + d.items.length, 0)
    const cDone = dayLists.reduce((n, d) => n + d.items.filter((i) => i.done).length, 0)
    const total = goals.length + blocks.length + cTotal
    const done = gDone + sDone + cDone
    return {
      gDone, gTotal: goals.length,
      sDone, sTotal: blocks.length,
      cDone, cTotal,
      total, done, pct: total ? done / total : 0,
    }
  }, [goals, blocks, dayLists])

  const inboxNotes = useMemo(
    () => notes.filter((n) => n.folderId === 'inbox').sort((a, b) => b.updated - a.updated).slice(0, 3),
    [notes]
  )

  // ─── goals ───
  const toggleGoal = (i: number) =>
    setGoals((gs) => gs.map((g, j) => (j === i ? { ...g, done: !g.done } : g)))
  const setGoalText = (i: number, text: string) =>
    setGoals((gs) => gs.map((g, j) => (j === i ? { ...g, text } : g)))

  // ─── schedule ───
  const patchBlock = (id: string, patch: Partial<SchedBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  // ─── checklists ───
  const patchList = (iid: string, fn: (d: DayInstance) => DayInstance) =>
    setDayLists((ds) => ds.map((d) => (d.iid === iid ? fn(d) : d)))

  const addToDay = (t: Template) => {
    if (onDayIds.has(t.id)) return
    setDayLists((ds) => [...ds, instantiate(t)])
  }

  // ─── quick notes ───
  const addQuickNote = () => {
    if (!noteDraft.trim()) return
    setNotes((ns) => [
      { id: uid(), folderId: 'inbox', title: noteDraft.trim(), body: '', updated: Date.now() },
      ...ns,
    ])
    setNoteDraft('')
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 lg:pt-16 pb-10">
      {/* compact header */}
      <p className="rise mono-label mb-5" style={{ letterSpacing: '0.22em' }}>{dateLabel}</p>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3 items-start">
        {/* ─── main column ─── */}
        <div className="space-y-3 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {/* goals */}
            <section className="rise panel rounded-md p-5" style={{ animationDelay: '60ms' }}>
              <PanelHeader title="Цели дня" right={`${stats.gDone}/${stats.gTotal}`} />
              {goals.map((g, i) => (
                <div key={i} className="group flex items-center gap-3 py-2.5"
                  style={{ borderBottom: i < goals.length - 1 ? '1px dashed var(--line)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: g.done ? 'var(--accent)' : 'var(--muted)', width: 20 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <button onClick={() => toggleGoal(i)} className="flex-none">
                    <Tick done={g.done} color="var(--done)" size={15} />
                  </button>
                  <input
                    value={g.text}
                    onChange={(e) => setGoalText(i, e.target.value)}
                    placeholder={`Цель №${i + 1}`}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[13px]"
                    style={{
                      color: g.done ? 'var(--muted)' : 'var(--light)',
                      textDecoration: g.done ? 'line-through' : 'none',
                      textDecorationColor: 'var(--line-strong)',
                    }}
                  />
                  <button
                    onClick={() => setGoals((gs) => gs.filter((_, j) => j !== i))}
                    className="opacity-0 group-hover:opacity-100 hover:!opacity-60 transition-opacity flex-none"
                    title="Удалить цель"
                  >
                    <X size={12} strokeWidth={1.5} style={{ color: 'var(--muted)' }} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setGoals((gs) => [...gs, { text: '', done: false }])}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-sm transition-colors hover:opacity-80"
                style={{ border: '1px dashed var(--line-strong)', color: 'var(--accent)' }}
              >
                <Plus size={12} strokeWidth={1.5} />
                <span className="mono-label-bright" style={{ color: 'var(--accent)', fontSize: 9 }}>добавить цель</span>
              </button>
            </section>

            {/* schedule */}
            <section className="rise panel rounded-md p-5" style={{ animationDelay: '120ms' }}>
              <PanelHeader title="Расписание" right={`${stats.sDone}/${stats.sTotal}`} />
              <div className="relative pl-5">
                <div className="absolute left-[5px] top-2 bottom-2 w-px" style={{ background: 'var(--line)' }} />
                {blocks.map((b) => {
                  const color = b.color ?? 'var(--accent)'
                  return (
                    <div key={b.id} className="group relative flex items-center gap-2.5 py-2">
                      <span className="absolute -left-5 top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full transition-all"
                        style={{
                          background: b.done ? color : 'var(--bg)',
                          border: `2px solid ${b.color ?? 'var(--line-strong)'}`,
                        }} />
                      <input
                        value={b.time}
                        onChange={(e) => patchBlock(b.id, { time: e.target.value })}
                        className="w-[44px] flex-none bg-transparent outline-none"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: b.done ? 'var(--muted)' : color }}
                        title="Время (HH:MM)"
                      />
                      <button onClick={() => patchBlock(b.id, { done: !b.done })} className="flex-none">
                        <Tick done={b.done} color={b.color ?? 'var(--done)'} size={14} />
                      </button>
                      <input
                        value={b.what}
                        onChange={(e) => patchBlock(b.id, { what: e.target.value })}
                        placeholder="Событие"
                        className="flex-1 min-w-0 bg-transparent outline-none text-[12.5px]"
                        style={{
                          color: b.done ? 'var(--muted)' : 'var(--light)',
                          textDecoration: b.done ? 'line-through' : 'none',
                          textDecorationColor: 'var(--line-strong)',
                        }}
                      />
                      <button
                        onClick={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}
                        className="opacity-0 group-hover:opacity-100 hover:!opacity-60 transition-opacity flex-none"
                        title="Удалить событие"
                      >
                        <X size={12} strokeWidth={1.5} style={{ color: 'var(--muted)' }} />
                      </button>
                    </div>
                  )
                })}

                {/* события календаря на сегодня — только чтение */}
                {eventsToday.length > 0 && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px dashed var(--line)' }}>
                    {eventsToday.map((e, i) => (
                      <div key={i} className="relative flex items-center gap-2.5 py-2">
                        <span className="absolute -left-5 top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full"
                          style={{ background: 'var(--bg)', border: `2px dashed ${e.color}` }} />
                        <span className="w-[44px] flex-none" />
                        <span className="tag-dot" style={{ background: e.color }} />
                        <span className="flex-1 min-w-0 truncate text-[12.5px]" style={{ color: 'var(--text)' }}>
                          {e.title}
                        </span>
                        <span className="mono-label flex-none" style={{ fontSize: 7.5 }}>из календаря</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setBlocks((bs) => [...bs, { id: uid(), time: '12:00', what: '', done: false }])}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-sm transition-colors hover:opacity-80"
                style={{ border: '1px dashed var(--line-strong)', color: 'var(--accent)' }}
              >
                <Plus size={12} strokeWidth={1.5} />
                <span className="mono-label-bright" style={{ color: 'var(--accent)', fontSize: 9 }}>добавить событие</span>
              </button>
            </section>
          </div>

          {/* checklists of the day */}
          <section className="rise panel rounded-md p-5" style={{ animationDelay: '180ms' }}>
            <PanelHeader title="Чек-листы дня" right={stats.cTotal ? `${stats.cDone}/${stats.cTotal}` : undefined} />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
              {dayLists.map((inst) => {
                const dDone = inst.items.filter((i) => i.done).length
                return (
                  <section key={inst.iid} className="rounded-sm overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                    <header
                      className="group flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none"
                      onClick={() => patchList(inst.iid, (d) => ({ ...d, collapsed: !d.collapsed }))}
                    >
                      <span className="tag-dot" style={{ background: inst.color }} />
                      <h3 className="display flex-1 truncate" style={{ fontSize: 14 }}>{inst.title}</h3>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                        {dDone}/{inst.items.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDayLists((ds) => ds.filter((d) => d.iid !== inst.iid))
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:!opacity-60 transition-opacity"
                        title="Убрать из дня (шаблон останется)"
                      >
                        <X size={11} strokeWidth={1.5} style={{ color: 'var(--muted)' }} />
                      </button>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
                        style={{ transform: inst.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .3s ease' }}>
                        <path d="M2 4L6 8L10 4" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </header>
                    <div style={{
                      display: 'grid',
                      gridTemplateRows: inst.collapsed ? '0fr' : '1fr',
                      transition: 'grid-template-rows .35s cubic-bezier(0.65,0,0.35,1)',
                    }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div className="px-3.5 pb-3" style={{ borderTop: '1px solid var(--line)' }}>
                          {inst.items.map((it) => (
                            <div key={it.id}
                              className="group flex items-start gap-2.5 py-2 cursor-pointer"
                              style={{ borderBottom: '1px dashed var(--line)' }}
                              onClick={() =>
                                patchList(inst.iid, (d) => ({
                                  ...d,
                                  items: d.items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)),
                                }))
                              }>
                              <Tick done={it.done} color={inst.color} size={13} />
                              <span className="flex-1 text-[12px] leading-snug"
                                style={{
                                  color: it.done ? 'var(--muted)' : 'var(--light)',
                                  textDecoration: it.done ? 'line-through' : 'none',
                                  textDecorationColor: 'var(--line-strong)',
                                }}>
                                {it.text}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  patchList(inst.iid, (d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }))
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:!opacity-60 transition-opacity flex-none"
                                title="Убрать пункт из дня"
                              >
                                <X size={10} strokeWidth={1.5} style={{ color: 'var(--muted)' }} />
                              </button>
                            </div>
                          ))}
                          <input
                            value={itemDrafts[inst.iid] || ''}
                            onChange={(e) => setItemDrafts((s) => ({ ...s, [inst.iid]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (itemDrafts[inst.iid] || '').trim()) {
                                patchList(inst.iid, (d) => ({
                                  ...d,
                                  items: [...d.items, { id: uid(), text: itemDrafts[inst.iid].trim(), done: false }],
                                }))
                                setItemDrafts((s) => ({ ...s, [inst.iid]: '' }))
                              }
                            }}
                            placeholder="+ пункт на сегодня"
                            className="mt-2.5 w-full bg-transparent rounded-sm px-2.5 py-1.5 text-[11.5px] outline-none"
                            style={{ border: '1px dashed var(--line-strong)', color: 'var(--light)' }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )
              })}

              {/* add checklist card */}
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className="rounded-sm min-h-[120px] flex flex-col items-center justify-center gap-2.5 transition-colors hover:opacity-80"
                style={{ border: '1px dashed var(--line-strong)' }}
              >
                <span className="grid place-items-center w-9 h-9 rounded-full"
                  style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                  <Plus size={15} strokeWidth={1.5} />
                </span>
                <span className="mono-label-bright text-center" style={{ color: 'var(--accent)', fontSize: 9, lineHeight: 1.9 }}>
                  Добавить чек-лист<br />
                  <span style={{ color: 'var(--muted)' }}>из шаблона или новый</span>
                </span>
              </button>
            </div>

            {pickerOpen && (
              <div className="mt-3">
                <TemplateManager onDayIds={onDayIds} onAdd={addToDay} />
              </div>
            )}
          </section>
        </div>

        {/* ─── right column ─── */}
        <aside className="space-y-3">
          {/* progress */}
          <section className="rise panel rounded-md p-5" style={{ animationDelay: '240ms' }}>
            <PanelHeader title="Прогресс дня" />
            <div className="flex flex-col items-center py-3">
              <div className="relative">
                <Ring pct={stats.pct} color="var(--accent)" size={170} />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <p className="display" style={{ fontSize: 38 }}>
                      {Math.round(stats.pct * 100)}
                      <span style={{ fontSize: 18, color: 'var(--muted)' }}>%</span>
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                      {stats.done}/{stats.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              {([
                ['Цели', stats.gDone, stats.gTotal],
                ['Расписание', stats.sDone, stats.sTotal],
                ['Чек-листы', stats.cDone, stats.cTotal],
              ] as const).map(([label, d, t]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="mono-label" style={{ fontSize: 8 }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text)' }}>{d}/{t}</span>
                </div>
              ))}
            </div>
          </section>

          {/* quick notes */}
          <section className="rise panel rounded-md p-5" style={{ animationDelay: '300ms' }}>
            <PanelHeader title="Быстрые заметки" />
            {inboxNotes.length === 0 && (
              <p className="mono-label py-2" style={{ fontSize: 8, lineHeight: 1.9 }}>Входящие пусты</p>
            )}
            <div className="space-y-2">
              {inboxNotes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go('notes')}
                  className="w-full text-left rounded-sm px-3 py-2.5 transition-colors hover:opacity-80"
                  style={{ border: '1px solid var(--line)' }}
                >
                  <p className="flex items-start gap-2">
                    <span className="tag-dot mt-1.5" style={{ background: 'var(--accent)' }} />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px]" style={{ color: 'var(--light)' }}>
                        {n.title || 'Без названия'}
                      </span>
                      {n.body && (
                        <span className="block truncate text-[10.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                          {n.body.split('\n')[0]}
                        </span>
                      )}
                    </span>
                  </p>
                </button>
              ))}
            </div>
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addQuickNote()}
              placeholder="+ новая заметка"
              className="mt-3 w-full bg-transparent rounded-sm px-3 py-2.5 text-[12px] outline-none"
              style={{ border: '1px dashed var(--line-strong)', color: 'var(--accent)' }}
            />
          </section>
        </aside>
      </div>
    </div>
  )
}
