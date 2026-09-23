import { useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, Plus } from 'lucide-react'
import type { BlockItem } from '../views/practice/store'
import ActionSheet from './ActionSheet'
import { MCheck } from './ui'

export type KanbanCol = 'plan' | 'work' | 'done'

// плоская запись: пункт блока или пункт чек-листа
export interface KanbanEntry {
  blockId: string
  listId?: string
  item: BlockItem
  badge: string // имя контейнера: блок или конкретный чек-лист
  color: string
}

// контейнер доски: блок (свои пункты) или один чек-лист
export interface KanbanGroupRef {
  blockId: string
  listId?: string
  from: KanbanCol
}

export interface KanbanBlockOpt {
  id: string
  title: string
}

const COLS: { id: KanbanCol; title: string; color: string }[] = [
  { id: 'plan', title: 'План', color: 'var(--accent)' },
  { id: 'work', title: 'В работе', color: '#e8963c' },
  { id: 'done', title: 'Готово', color: 'var(--done)' },
]

export const colOf = (it: BlockItem): KanbanCol =>
  it.done ? 'done' : it.status === 'work' ? 'work' : 'plan'

const keyOf = (e: KanbanEntry) => `${e.blockId}:${e.listId ?? ''}:${e.item.id}`
// контейнер = чек-лист отдельно, иначе блок
const groupIdOf = (e: KanbanEntry) => (e.listId ? `list:${e.listId}` : `block:${e.blockId}`)

interface DragState {
  kind: 'item' | 'block'
  entry?: KanbanEntry
  group?: KanbanGroupRef
  fromCol: KanbanCol
  label: string
  color: string
  x: number
  y: number
}

const NO_SELECT: React.CSSProperties = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
}

// доска «План / В работе / Готово»:
// — контейнеры = блоки и отдельные чек-листы; дело всегда живёт в своём контейнере;
// — зажал дело и потащил → перенос (в целевой колонке встраивается в контейнер
//   своего блока или создаёт его урезанную копию); зажал и отпустил на месте → меню;
// — зажал шапку контейнера → переезжают только дела этого контейнера;
// — двойной тап по шапке — свернуть; по делу — «В работе»/обратно; галочка — «Готово».
export default function KanbanBoard({
  entries,
  blocks,
  readOnly,
  onMove,
  onMoveGroup,
  onToggle,
  onRename,
  onAdd,
  checklistBlocks = [],
  onAddChecklist,
}: {
  entries: KanbanEntry[]
  blocks: KanbanBlockOpt[]
  readOnly: boolean
  onMove: (e: KanbanEntry, col: KanbanCol) => void
  onMoveGroup: (g: KanbanGroupRef, to: KanbanCol) => void
  onToggle: (e: KanbanEntry) => void
  onRename: (e: KanbanEntry, text: string) => void // пустая строка = удалить
  onAdd: (blockId: string) => string
  checklistBlocks?: KanbanBlockOpt[]
  onAddChecklist?: (blockId: string) => void
}) {
  const [editKey, setEditKey] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoverCol, setHoverCol] = useState<KanbanCol | null>(null)
  const [sheet, setSheet] = useState<KanbanEntry | null>(null)

  const boardRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag
  const hoverRef = useRef<KanbanCol | null>(null)
  hoverRef.current = hoverCol
  const suppressClick = useRef(false)
  const lpTimer = useRef<number | null>(null)
  const lpStart = useRef<{ x: number; y: number } | null>(null)
  const lastTap = useRef<Record<string, number>>({})

  // группировка: колонка → контейнеры (блок/чек-лист) → дела
  const grouped = useMemo(() => {
    const out: Record<
      KanbanCol,
      { gid: string; blockId: string; listId?: string; badge: string; color: string; items: KanbanEntry[] }[]
    > = { plan: [], work: [], done: [] }
    for (const e of entries) {
      if (!e.item.text.trim() && keyOf(e) !== editKey) continue
      const col = colOf(e.item)
      const gid = groupIdOf(e)
      let g = out[col].find((x) => x.gid === gid)
      if (!g) {
        g = { gid, blockId: e.blockId, listId: e.listId, badge: e.badge, color: e.color, items: [] }
        out[col].push(g)
      }
      g.items.push(e)
    }
    return out
  }, [entries, editKey])

  // колонка по горизонтали: доска делится на три равные зоны,
  // по вертикали — вся высота доски с запасом (пустые колонки низкие)
  const colAt = (x: number, y: number): KanbanCol | null => {
    const r = boardRef.current?.getBoundingClientRect()
    if (!r) return null
    if (y < r.top - 60 || y > r.bottom + 160) return null
    if (x < r.left - 24 || x > r.right + 24) return null
    const i = Math.max(0, Math.min(2, Math.floor(((x - r.left) / r.width) * 3)))
    return COLS[i].id
  }

  // пока идёт драг — слушаем окно
  useEffect(() => {
    if (!drag) return
    const move = (ev: PointerEvent) => {
      ev.preventDefault()
      setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY } : d))
      setHoverCol(colAt(ev.clientX, ev.clientY))
    }
    const up = (ev: PointerEvent) => {
      const d = dragRef.current
      const col = colAt(ev.clientX, ev.clientY) ?? hoverRef.current
      if (d && col && col !== d.fromCol) {
        // перенос: дело или контейнер (только его текущие дела)
        if (d.kind === 'item' && d.entry) onMove(d.entry, col)
        else if (d.kind === 'block' && d.group) onMoveGroup(d.group, col)
      } else if (d && d.kind === 'item' && d.entry) {
        // зажал и отпустил на месте — старое меню дела
        setSheet(d.entry)
      }
      suppressClick.current = true
      window.setTimeout(() => (suppressClick.current = false), 60)
      setDrag(null)
      setHoverCol(null)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null])

  // long-press → старт драга; движение до срабатывания — отмена (это скролл)
  const bindLp = (start: (x: number, y: number) => void) => ({
    onPointerDown: (ev: React.PointerEvent) => {
      if (readOnly) return
      lpStart.current = { x: ev.clientX, y: ev.clientY }
      lpTimer.current = window.setTimeout(() => start(ev.clientX, ev.clientY), 350)
    },
    onPointerMove: (ev: React.PointerEvent) => {
      const s = lpStart.current
      if (!s || !lpTimer.current) return
      if (Math.hypot(ev.clientX - s.x, ev.clientY - s.y) > 12) {
        window.clearTimeout(lpTimer.current)
        lpTimer.current = null
      }
    },
    onPointerUp: () => {
      if (lpTimer.current) window.clearTimeout(lpTimer.current)
      lpTimer.current = null
      lpStart.current = null
    },
  })

  const startItemDrag = (e: KanbanEntry) => (x: number, y: number) =>
    setDrag({ kind: 'item', entry: e, fromCol: colOf(e.item), label: e.item.text || 'Пункт', color: e.color, x, y })
  const startGroupDrag = (
    g: { gid: string; blockId: string; listId?: string; badge: string; color: string },
    fromCol: KanbanCol,
  ) => (x: number, y: number) =>
    setDrag({
      kind: 'block',
      group: { blockId: g.blockId, listId: g.listId, from: fromCol },
      fromCol,
      label: g.badge,
      color: g.color,
      x,
      y,
    })

  // двойной тап по шапке — свернуть именно этот контейнер (ключ = колонка+контейнер)
  const dblTap = (key: string) => {
    const now = Date.now()
    if (now - (lastTap.current[key] ?? 0) < 320)
      setCollapsed((c) => ({ ...c, [key]: !c[key] }))
    lastTap.current[key] = now
  }

  // двойной тап по делу — «В работе»/обратно в «План»; одиночный тап ничего не выделяет
  const tapItem = (e: KanbanEntry) => {
    if (suppressClick.current || readOnly) return
    const k = keyOf(e)
    const now = Date.now()
    if (now - (lastTap.current[k] ?? 0) < 320) {
      lastTap.current[k] = 0
      const col = colOf(e.item)
      onMove(e, col === 'work' ? 'plan' : 'work') // done → тоже в работу
      return
    }
    lastTap.current[k] = now
  }

  const addItem = (blockId: string) => {
    const id = onAdd(blockId)
    setEditKey(`${blockId}::${id}`)
    setCollapsed((c) => ({ ...c, [`plan:block:${blockId}`]: false }))
  }

  return (
    <section
      className="rounded-2xl p-3 mb-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)', ...NO_SELECT }}
    >
      <div ref={boardRef} className="grid grid-cols-3 gap-2">
        {COLS.map((col) => {
          const groups = grouped[col.id]
          const count = groups.reduce((n, g) => n + g.items.length, 0)
          return (
            <div
              key={col.id}
              className="min-w-0 rounded-xl transition-colors"
              style={{
                background: hoverCol === col.id ? 'var(--surface-2)' : 'transparent',
                outline: hoverCol === col.id ? `1px dashed ${col.color}` : 'none',
                outlineOffset: -2,
              }}
            >
              <div
                className="mb-2 pb-1 px-0.5 flex items-baseline justify-between"
                style={{ borderBottom: `2px solid ${col.color}` }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: col.color }}>
                  {col.title.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{count}</span>
              </div>
              <div style={{ maxHeight: '56dvh', overflowY: 'auto' }}>
                {groups.map((g) => {
                  const cKey = `${col.id}:${g.gid}`
                  const isCollapsed = !!collapsed[cKey]
                  const doneN = g.items.filter((e) => e.item.done).length
                  return (
                    <div
                      key={g.gid}
                      className="rounded-xl mb-2 overflow-hidden"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
                    >
                      {/* шапка контейнера: long-press — тащить контейнер, двойной тап — свернуть */}
                      <div
                        {...bindLp(startGroupDrag(g, col.id))}
                        onClick={() => !suppressClick.current && dblTap(cKey)}
                        className="no-select flex items-center gap-1.5 px-2 py-1.5"
                        style={{ touchAction: 'pan-y', cursor: 'grab' }}
                        title="Зажми — тащить блок, двойной тап — свернуть"
                      >
                        <span
                          className="inline-block max-w-full rounded-md px-1.5 py-0.5"
                          style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.25, color: 'var(--on-fill)', background: g.color }}
                        >
                          {g.badge}
                        </span>
                        <span className="flex-1" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                          {doneN}/{g.items.length}
                        </span>
                        <GripVertical size={12} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
                      </div>
                      {!isCollapsed &&
                        g.items.map((e) => {
                          const k = keyOf(e)
                          const done = e.item.done
                          const editing = editKey === k && !readOnly
                          const inWork = colOf(e.item) === 'work'
                          return (
                            <div
                              key={k}
                              {...bindLp(startItemDrag(e))}
                              className="no-select flex items-center gap-2 px-2 py-1.5 rounded-lg"
                              style={{
                                touchAction: 'pan-y',
                                opacity: drag?.kind === 'item' && drag.entry && keyOf(drag.entry) === k ? 0.35 : 1,
                                // дело «в работе» подсвечено оранжевым
                                ...(inWork ? { background: 'rgba(232,150,60,0.16)' } : {}),
                              }}
                            >
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  if (!suppressClick.current && !readOnly) onToggle(e)
                                }}
                                onPointerDown={(ev) => ev.stopPropagation()}
                                disabled={readOnly}
                                className="flex-none disabled:cursor-default"
                              >
                                <MCheck done={done} color="var(--done)" size={16} />
                              </button>
                              {editing ? (
                                <input
                                  ref={(el) => el?.focus()}
                                  value={e.item.text}
                                  onChange={(ev) => onRename(e, ev.target.value)}
                                  onBlur={() => {
                                    setEditKey(null)
                                    if (!e.item.text.trim()) onRename(e, '')
                                  }}
                                  onKeyDown={(ev) => {
                                    if (ev.key === 'Enter' || ev.key === 'Escape') {
                                      setEditKey(null)
                                      if (!e.item.text.trim()) onRename(e, '')
                                    }
                                  }}
                                  onPointerDown={(ev) => ev.stopPropagation()}
                                  placeholder="Пункт…"
                                  className="flex-1 min-w-0 bg-transparent outline-none"
                                  style={{ fontSize: 12, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
                                />
                              ) : (
                                <span
                                  onClick={(ev) => {
                                    ev.stopPropagation()
                                    tapItem(e)
                                  }}
                                  className="flex-1 min-w-0"
                                  style={{
                                    ...NO_SELECT,
                                    fontSize: 12,
                                    lineHeight: 1.35,
                                    color: done ? 'var(--muted)' : 'var(--light)',
                                    textDecoration: done ? 'line-through' : 'none',
                                    textDecorationColor: 'var(--line-strong)',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {e.item.text || '…'}
                                </span>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )
                })}
              </div>
              {!readOnly && col.id === 'plan' && (blocks.length > 0 || checklistBlocks.length > 0) && (
                <button
                  onClick={() =>
                    blocks.length === 1 && checklistBlocks.length === 0 ? addItem(blocks[0].id) : setPicker(true)
                  }
                  className="w-full rounded-xl border border-dashed px-2 py-2 flex items-center justify-center gap-1"
                  style={{ borderColor: 'var(--line-strong)', color: 'var(--muted)', fontSize: 11 }}
                >
                  <Plus size={12} strokeWidth={1.8} /> добавить
                </button>
              )}
              {groups.length === 0 && col.id !== 'plan' && (
                <p className="text-center py-2" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  пусто
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* призрак перетаскиваемого */}
      {drag && (
        <div
          className="fixed z-[70] pointer-events-none rounded-xl px-2.5 py-2"
          style={{
            left: drag.x - 60,
            top: drag.y - 18,
            width: 132,
            background: 'var(--surface-2)',
            border: `1px solid ${drag.color}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            transform: 'rotate(3deg)',
          }}
        >
          <span
            className="inline-block rounded-md px-1.5 py-0.5 mb-1"
            style={{ fontSize: 9, fontWeight: 600, color: 'var(--on-fill)', background: drag.color }}
          >
            {drag.kind === 'block' ? 'блок' : 'дело'}
          </span>
          <span className="block truncate" style={{ fontSize: 12, color: 'var(--light)' }}>
            {drag.label}
          </span>
        </div>
      )}

      {/* зажал дело и отпустил на месте — старое меню */}
      {sheet && (
        <ActionSheet
          title={sheet.item.text || 'Пункт'}
          onClose={() => setSheet(null)}
          onRename={() => setEditKey(keyOf(sheet))}
          onDelete={() => onRename(sheet, '')}
        />
      )}

      {/* выбор блока для нового пункта / чек-листа */}
      {picker && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setPicker(false)} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4 fadein"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <div className="grid place-items-center pb-3">
              <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
            </div>
            {blocks.length > 0 && (
              <p className="px-1 pb-1" style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Пункт
              </p>
            )}
            {blocks.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setPicker(false)
                  addItem(b.id)
                }}
                className="w-full text-left rounded-xl px-3 py-3 mb-1"
                style={{ background: 'var(--surface-2)', color: 'var(--light)', fontSize: 14 }}
              >
                {b.title}
              </button>
            ))}
            {checklistBlocks.length > 0 && onAddChecklist && (
              <p className="px-1 pt-2 pb-1" style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Чек-лист (новый или из записей)
              </p>
            )}
            {onAddChecklist &&
              checklistBlocks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setPicker(false)
                    onAddChecklist(b.id)
                  }}
                  className="w-full text-left rounded-xl px-3 py-3 mb-1"
                  style={{ background: 'var(--surface-2)', color: 'var(--light)', fontSize: 14 }}
                >
                  {b.title}
                </button>
              ))}
            <button
              onClick={() => setPicker(false)}
              className="mt-2 w-full py-2.5 rounded-xl"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
