import { useMemo, useState } from 'react'
import {
  type Template,
  type DayInstance,
  instantiate,
  seedDay,
  todayKey,
  uid,
  useLS,
} from './store'
import TemplateManager from './TemplateManager'

function Ring({ pct, color, size = 54 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        style={{ transition: 'stroke-dashoffset .5s cubic-bezier(0.65,0,0.35,1)' }}
      />
    </svg>
  )
}

export default function ChecklistsTab() {
  const [day, setDay] = useLS<DayInstance[]>(`aod2-day-${todayKey()}`, seedDay())
  const [panel, setPanel] = useState<'pick' | 'create' | null>(null)
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({})

  const onDayIds = useMemo(() => new Set(day.map((d) => d.templateId)), [day])

  const total = day.reduce((n, d) => n + d.items.length, 0)
  const done = day.reduce((n, d) => n + d.items.filter((i) => i.done).length, 0)
  const dayPct = total ? done / total : 0

  const patch = (iid: string, fn: (d: DayInstance) => DayInstance) =>
    setDay((ds) => ds.map((d) => (d.iid === iid ? fn(d) : d)))

  const addToDay = (t: Template) => {
    if (onDayIds.has(t.id)) return
    setDay((ds) => [...ds, instantiate(t)])
  }

  const resetMarks = () =>
    setDay((ds) => ds.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i, done: false })) })))

  return (
    <div>
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Ring pct={dayPct} color="var(--accent)" size={64} />
            <span className="absolute inset-0 grid place-items-center"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--light)' }}>
              {Math.round(dayPct * 100)}%
            </span>
          </div>
          <div>
            <p className="mono-label">Прогресс дня</p>
            <p className="display" style={{ fontSize: 22 }}>{done} / {total}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPanel((p) => (p === 'pick' ? null : 'pick'))}
            className="mono-label-bright px-3 py-2 rounded-sm hover:opacity-85 transition-opacity"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            + из шаблона
          </button>
          <button onClick={() => setPanel((p) => (p === 'create' ? null : 'create'))}
            className="mono-label-bright px-3 py-2 rounded-sm glass hover:opacity-80 transition-opacity">
            + новый шаблон
          </button>
          <button onClick={resetMarks}
            className="mono-label px-3 py-2 rounded-sm glass hover:opacity-80 transition-opacity">
            сброс отметок
          </button>
        </div>
      </div>

      {/* добавление чек-листа: из шаблона или новый шаблон */}
      {panel && (
        <div className="mt-4">
          <TemplateManager key={panel} initialMode={panel} onDayIds={onDayIds} onAdd={addToDay} />
        </div>
      )}

      {/* day lists */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {day.length === 0 && (
          <div className="panel rounded-md p-8 text-center md:col-span-2">
            <p className="mono-label" style={{ lineHeight: 2 }}>День пуст. Добавь чек-листы из шаблонов.</p>
          </div>
        )}
        {day.map((inst) => {
          const dDone = inst.items.filter((i) => i.done).length
          return (
            <section key={inst.iid} className="panel rounded-md overflow-hidden">
              <header
                className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
                onClick={() => patch(inst.iid, (d) => ({ ...d, collapsed: !d.collapsed }))}
              >
                <span className="tag-dot" style={{ background: inst.color }} />
                <div className="flex-1 min-w-0">
                  <h3 className="display truncate" style={{ fontSize: 19 }}>{inst.title}</h3>
                  <p className="mono-label" style={{ fontSize: 8 }}>{inst.time}</p>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {dDone}/{inst.items.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDay((ds) => ds.filter((d) => d.iid !== inst.iid))
                  }}
                  className="mono-label hover:opacity-60 px-1.5" title="Убрать из дня (шаблон останется)">✕</button>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{ transform: inst.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform .3s ease' }}>
                  <path d="M2 4L6 8L10 4" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </header>
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: inst.collapsed ? '0fr' : '1fr',
                  transition: 'grid-template-rows .35s cubic-bezier(0.65,0,0.35,1)',
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div className="px-5 pb-4" style={{ borderTop: '1px solid var(--line)' }}>
                    {inst.items.map((it) => (
                      <div key={it.id}
                        className={`check-row group ${it.done ? 'done' : ''}`}
                        style={{ ['--row-color' as string]: inst.color }}
                        onClick={() =>
                          patch(inst.iid, (d) => ({
                            ...d,
                            items: d.items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)),
                          }))
                        }>
                        <span className="box">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5.5L4 8L8.5 2" stroke="#050100" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </span>
                        <span className="flex-1">
                          <span className="label block text-[13.5px] leading-snug" style={{ color: 'var(--light)' }}>{it.text}</span>
                          {it.hint && <span className="block mt-0.5 text-[11.5px]" style={{ color: 'var(--muted)' }}>{it.hint}</span>}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            patch(inst.iid, (d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }))
                          }}
                          className="mono-label opacity-0 group-hover:opacity-100 hover:!opacity-60 transition-opacity px-1"
                          title="Убрать пункт из дня">✕</button>
                      </div>
                    ))}
                    {/* add item */}
                    <div className="flex gap-2 mt-3">
                      <input
                        value={itemDrafts[inst.iid] || ''}
                        onChange={(e) => setItemDrafts((s) => ({ ...s, [inst.iid]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (itemDrafts[inst.iid] || '').trim()) {
                            patch(inst.iid, (d) => ({
                              ...d,
                              items: [...d.items, { id: uid(), text: itemDrafts[inst.iid].trim(), done: false }],
                            }))
                            setItemDrafts((s) => ({ ...s, [inst.iid]: '' }))
                          }
                        }}
                        placeholder="+ пункт только на сегодня"
                        className="flex-1 bg-transparent rounded-sm px-3 py-1.5 text-[12.5px] outline-none"
                        style={{ border: '1px dashed var(--line-strong)', color: 'var(--light)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <p className="mono-label mt-5" style={{ fontSize: 8 }}>
        Отметки и правки живут только в копии дня и обнуляются завтра · шаблоны не меняются
      </p>
    </div>
  )
}
