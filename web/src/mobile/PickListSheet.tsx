import { useEffect, useState } from 'react'
import { ListOrdered, ListTodo, Plus } from 'lucide-react'
import type { ListRecord } from '../views/practice/store'
import { recItemStats } from '../views/practice/store'

// шторка выбора при добавлении под-списка в блок:
// «Новый» или готовый из «Записей» (aod3-listrecs)
export default function PickListSheet({
  kind,
  records,
  onNew,
  onPick,
  onClose,
}: {
  kind: ListRecord['kind']
  records: ListRecord[]
  onNew: () => void
  onPick: (rec: ListRecord) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = () => {
    setExiting(true)
    window.setTimeout(onClose, 220)
  }

  const open = mounted && !exiting
  const noun = kind === 'checklist' ? 'чек-лист' : 'список'
  const KindIcon = kind === 'checklist' ? ListTodo : ListOrdered

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        onClick={close}
        className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)', opacity: open ? 1 : 0, transitionDuration: '220ms' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderBottom: 'none',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .22s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="grid place-items-center pt-3 pb-2">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>
        <p className="px-5 pb-2" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Добавить {noun}
        </p>

        <div className="px-3 pb-3">
          <button
            onClick={() => { onNew(); close() }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
            style={{ color: 'var(--light)', fontSize: 15, fontFamily: 'var(--font-body)' }}
          >
            <Plus size={18} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
            Новый {noun}
          </button>

          {records.length > 0 && (
            <p className="px-3 pt-2 pb-1" style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Из записей
            </p>
          )}
          {records.map((r) => (
            <button
              key={r.id}
              onClick={() => { onPick(r); close() }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
              style={{ color: 'var(--light)', fontSize: 15, fontFamily: 'var(--font-body)' }}
            >
              <KindIcon size={18} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
              <span className="flex-1 truncate">{r.title || (kind === 'checklist' ? 'Чек-лист' : 'Список')}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{recItemStats(r).total}</span>
            </button>
          ))}

          <button
            onClick={close}
            className="mt-1 w-full py-3 rounded-xl"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 14 }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
