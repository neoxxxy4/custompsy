import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  type BlockItem,
  type BlockList,
  type ListRecord,
  moveItem,
  recItemStats,
  toggleNestedListItem,
  uid,
} from '../views/practice/store'
import Immersion from './Immersion'
import ActionSheet from './ActionSheet'
import { useDragList } from './useDragList'
import { MCheck } from './ui'

// редактор записи «Списков» (чек-лист / нумерованный список) в режиме погружения:
// заголовок-инпут, пункты (чекбокс+текст или номер+текст), «+ добавить пункт» —
// свободный ввод; long-press по пункту — action-sheet (переименовать / удалить)
export default function ListRecordEditor({
  rec,
  onBack,
  onHome,
  onMic,
  onPatch,
  onDelete,
  inline,
}: {
  rec: ListRecord
  onBack: () => void
  onHome: () => void
  onMic: () => void
  onPatch: (patch: Partial<ListRecord>) => void
  onDelete: () => void
  inline?: boolean // инлайн-режим: верхняя навигация Записей остаётся видна
}) {
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ itemId: string; title: string } | null>(null)
  const [confirming, setConfirming] = useState(false)

  const patchItem = (itemId: string, patch: Partial<BlockItem>) =>
    onPatch({ items: rec.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) })

  const addItem = () => {
    const it: BlockItem = { id: uid(), text: '', done: false }
    onPatch({ items: [...rec.items, it] })
    setEditItemId(it.id)
  }

  const drag = useDragList({
    onReorder: (from, to) => onPatch({ items: moveItem(rec.items, from, to) }),
    onLongPress: (i) => {
      const it = rec.items[i]
      if (it) setSheet({ itemId: it.id, title: it.text || 'Пункт' })
    },
  })

  return (
    <Immersion
      title={rec.kind === 'checklist' ? 'Чек-лист' : 'Список'}
      onBack={onBack}
      onHome={onHome}
      onMic={onMic}
      inline={inline}
      menu={[{ label: 'Удалить запись', icon: Trash2, onClick: () => setConfirming(true) }]}
    >
      <div className="px-5 py-4">
        <input
          value={rec.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Заголовок"
          className="w-full bg-transparent outline-none"
          style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: 'var(--light)' }}
        />
        <p className="mt-1 mb-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {(() => {
            const { done, total } = recItemStats(rec)
            const sub = rec.lists?.length ? ` · ${rec.lists.length} подблоков` : ''
            return rec.kind === 'checklist'
              ? `чек-лист · ${done}/${total}${sub}`
              : `список · ${total} пунктов${sub}`
          })()}
        </p>

        <div {...drag.containerProps}>
          {rec.items.map((it, idx) => (
            <div
              key={it.id}
              {...drag.bindRow(idx)}
              style={drag.rowStyle(idx)}
              className="no-select flex items-center gap-2.5 py-2"
            >
              {rec.kind === 'checklist' ? (
                <button onClick={() => patchItem(it.id, { done: !it.done })} className="flex-none">
                  <MCheck done={it.done} color="var(--accent)" size={18} />
                </button>
              ) : (
                <span
                  className="flex-none w-5 text-right"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}
                >
                  {idx + 1}.
                </span>
              )}
              {editItemId === it.id ? (
                <input
                  ref={(el) => el?.focus()}
                  value={it.text}
                  onChange={(e) => patchItem(it.id, { text: e.target.value })}
                  onBlur={() => setEditItemId(null)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setEditItemId(null)}
                  placeholder="Новый пункт…"
                  className="flex-1 min-w-0 bg-transparent outline-none"
                  style={{ fontSize: 14, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
                />
              ) : (
                <span
                  className="flex-1 min-w-0"
                  style={{
                    fontSize: 14,
                    color: rec.kind === 'checklist' && it.done ? 'var(--muted)' : 'var(--light)',
                    textDecoration: rec.kind === 'checklist' && it.done ? 'line-through' : 'none',
                    textDecorationColor: 'var(--line-strong)',
                  }}
                >
                  {it.text || <span style={{ color: 'var(--muted)' }}>Пункт…</span>}
                </span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="mt-2 flex items-center gap-2 rounded-xl border border-dashed px-3 py-2"
          style={{ borderColor: 'var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}
        >
          <Plus size={14} strokeWidth={1.8} /> добавить пункт
        </button>

        {/* вложенные подблоки-чек-листы */}
        {rec.lists?.map((l) => (
          <SubListBlock
            key={l.id}
            list={l}
            onToggle={(listId, itemId) =>
              onPatch({ lists: toggleNestedListItem(rec.lists ?? [], listId, itemId) })
            }
          />
        ))}
      </div>

      {/* action-sheet по long-press по пункту */}
      {sheet && (
        <ActionSheet
          title={sheet.title}
          onClose={() => setSheet(null)}
          onRename={() => setEditItemId(sheet.itemId)}
          onDelete={() => onPatch({ items: rec.items.filter((x) => x.id !== sheet.itemId) })}
        />
      )}

      {/* подтверждение удаления записи */}
      {confirming && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setConfirming(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl px-5 pt-3 fadein"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
          >
            <div className="grid place-items-center pb-3">
              <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
            </div>
            <p className="text-center mb-4" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
              Удалить запись?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-3 rounded-xl"
                style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}
              >
                Нет
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-3 rounded-xl"
                style={{ background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600 }}
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}
    </Immersion>
  )
}

// вложенный подблок записи: заголовок с прогрессом + пункты с чекбоксами (рекурсивно)
function SubListBlock({
  list,
  onToggle,
  depth = 0,
}: {
  list: BlockList
  onToggle: (listId: string, itemId: string) => void
  depth?: number
}) {
  const done = list.items.filter((i) => i.done).length
  return (
    <div
      className="mt-4 rounded-2xl p-3.5"
      style={{
        background: depth === 0 ? 'var(--surface)' : 'transparent',
        border: '1px solid var(--line)',
        marginLeft: depth > 0 ? 12 : 0,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
          {list.title || 'Подблок'}
        </span>
        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {done}/{list.items.length}
        </span>
      </div>
      {list.items.map((it) => (
        <div key={it.id} className="flex items-center gap-2.5 py-2">
          <button onClick={() => onToggle(list.id, it.id)} className="flex-none">
            <MCheck done={it.done} color="var(--accent)" size={18} />
          </button>
          <span
            className="flex-1 min-w-0"
            style={{
              fontSize: 14,
              color: it.done ? 'var(--muted)' : 'var(--light)',
              textDecoration: it.done ? 'line-through' : 'none',
              textDecorationColor: 'var(--line-strong)',
            }}
          >
            {it.text || '—'}
          </span>
        </div>
      ))}
      {list.lists?.map((sub) => (
        <SubListBlock key={sub.id} list={sub} onToggle={onToggle} depth={depth + 1} />
      ))}
    </div>
  )
}
