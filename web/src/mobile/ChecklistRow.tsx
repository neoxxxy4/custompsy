import { useRef, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, ListChecks, type LucideIcon } from 'lucide-react'
import { useDragList } from './useDragList'
import { MCheck } from './ui'

// минимальный контракт чек-листа: подходят и DayInstance (шаблоны дня), и BlockList (блоки «Сегодня»)
export interface ChecklistInst {
  title: string
  color?: string
  items: { id: string; text: string; done: boolean; status?: 'plan' | 'work' }[]
}

// длинный текст пункта переносится до 3 строк, дальше — многоточие
const CLAMP3: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
}

// строка чек-листа с аккордеоном: иконка + название + прогресс-бар + счётчик + chevron.
// раскрытие — пункты с чекбоксами (отметки пишутся сразу).
// опционально (мобильное «Сегодня»): readOnly, drag-сортировка пунктов,
// long-press по пункту (action-sheet), инлайн-редактирование,
// удержание пункта над пунктом (onMergeItem — группировка в подблок),
// children — вложенные подблоки внутри раскрытой области.
export default function ChecklistRow({
  inst,
  expanded,
  onToggle,
  onToggleItem,
  onItemDblTap,
  readOnly,
  onItemLongPress,
  editItemId,
  onEditItem,
  onEditItemEnd,
  onReorderItem,
  onMergeItem,
  editTitle,
  onEditTitle,
  onEditTitleEnd,
  children,
  icon,
  stat,
}: {
  inst: ChecklistInst
  expanded: boolean
  onToggle: () => void
  onToggleItem: (itemId: string) => void
  onItemDblTap?: (itemId: string) => void
  readOnly?: boolean
  onItemLongPress?: (itemId: string) => void
  editItemId?: string | null
  onEditItem?: (itemId: string, text: string) => void
  onEditItemEnd?: () => void
  onReorderItem?: (from: number, to: number) => void
  onMergeItem?: (from: number, to: number) => void
  editTitle?: boolean
  onEditTitle?: (text: string) => void
  onEditTitleEnd?: () => void
  children?: ReactNode
  icon?: LucideIcon // другая иконка плитки (например, Target у целей)
  stat?: { done: number; total: number } // внешний счёт: при «Скрыть выполненные» показываем полные n/m
}) {
  const done = stat?.done ?? inst.items.filter((i) => i.done).length
  const total = stat?.total ?? inst.items.length
  const pct = total ? done / total : 0
  const color = inst.color ?? 'var(--ring-checklists)'
  const Icon = icon ?? ListChecks

  const dblTap = useRef<Record<string, number>>({})
  const tapRow = (id: string) => {
    if (!onItemDblTap || readOnly) return
    const now = Date.now()
    if (now - (dblTap.current[id] ?? 0) < 320) {
      dblTap.current[id] = 0
      onItemDblTap(id)
    } else dblTap.current[id] = now
  }

  const drag = useDragList({
    disabled: readOnly || !onReorderItem,
    onReorder: (from, to) => onReorderItem?.(from, to),
    onLongPress: (index) => {
      const it = inst.items[index]
      if (it) onItemLongPress?.(it.id)
    },
    onMerge: onMergeItem,
  })

  return (
    <div>
      <div onClick={onToggle} role="button" className="no-select w-full flex items-center gap-3 py-2.5 text-left">
        <span className="grid place-items-center rounded-lg flex-none" style={{ width: 32, height: 32, background: color }}>
          <Icon size={16} strokeWidth={1.8} style={{ color: 'var(--on-fill)' }} />
        </span>
        <span className="flex-1 min-w-0">
          {editTitle && !readOnly ? (
            <input
              ref={(el) => el?.focus()}
              value={inst.title}
              onChange={(e) => onEditTitle?.(e.target.value)}
              onBlur={onEditTitleEnd}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && onEditTitleEnd?.()}
              onClick={(e) => e.stopPropagation()}
              className="block w-full min-w-0 bg-transparent outline-none"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
            />
          ) : (
            <span className="block truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--light)' }}>
              {inst.title}
            </span>
          )}
          <span className="block mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
            <span
              className="block h-full rounded-full"
              style={{ width: `${pct * 100}%`, background: color, transition: 'width .35s ease' }}
            />
          </span>
        </span>
        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {done}/{total}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          className="flex-none transition-transform"
          style={{ color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows .3s cubic-bezier(0.65,0,0.35,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="pl-11 pr-1 pb-1" {...drag.containerProps}>
            {inst.items.map((it, idx) => {
              const inWork = it.status === 'work' && !it.done
              return (
              <div
                key={it.id}
                {...drag.bindRow(idx)}
                style={{
                  ...drag.rowStyle(idx),
                  // дело «в работе» подсвечено оранжевым
                  ...(inWork ? { background: 'rgba(232,150,60,0.16)', borderRadius: 10 } : {}),
                }}
                className="no-select flex items-center gap-2.5 py-2"
              >
                <button
                  onClick={() => onToggleItem(it.id)}
                  disabled={readOnly}
                  className="flex-none disabled:cursor-default"
                >
                  <MCheck done={it.done} color={color} size={18} />
                </button>
                {editItemId === it.id && !readOnly ? (
                  <input
                    ref={(el) => el?.focus()}
                    value={it.text}
                    onChange={(e) => onEditItem?.(it.id, e.target.value)}
                    onBlur={onEditItemEnd}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && onEditItemEnd?.()}
                    className="flex-1 min-w-0 bg-transparent outline-none"
                    style={{ fontSize: 13, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
                  />
                ) : (
                  <span
                    onClick={() => tapRow(it.id)}
                    className="flex-1 min-w-0"
                    style={{
                      ...CLAMP3,
                      fontSize: 13,
                      color: it.done ? 'var(--muted)' : 'var(--light)',
                      textDecoration: it.done ? 'line-through' : 'none',
                      textDecorationColor: 'var(--line-strong)',
                    }}
                  >
                    {it.text}
                  </span>
                )}
              </div>
              )
            })}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
