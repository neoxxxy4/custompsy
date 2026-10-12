import { useEffect, useState } from 'react'
import { Pencil, Trash2, type LucideIcon } from 'lucide-react'

function ActionRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
      style={{ color: 'var(--light)', fontSize: 15, fontFamily: 'var(--font-body)' }}
    >
      <Icon size={18} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
      {label}
    </button>
  )
}

// action-sheet по long-press: Изменить название / доп. действия (extras) / Удалить (с подтверждением Да/Нет)
export default function ActionSheet({
  title,
  onClose,
  onRename,
  onDelete,
  renameLabel = 'Изменить название',
  extras,
}: {
  title: string
  onClose: () => void
  onRename?: () => void
  onDelete?: () => void
  renameLabel?: string
  extras?: { icon: LucideIcon; label: string; onClick: () => void }[]
}) {
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = () => {
    setExiting(true)
    window.setTimeout(onClose, 220)
  }

  const open = mounted && !exiting

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
        <p className="px-5 pb-2 truncate" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {title}
        </p>

        {!confirming ? (
          <div className="px-3 pb-3">
            {onRename && <ActionRow icon={Pencil} label={renameLabel} onClick={() => { onRename(); close() }} />}
            {extras?.map((x) => (
              <ActionRow key={x.label} icon={x.icon} label={x.label} onClick={() => { x.onClick(); close() }} />
            ))}
            {onDelete && <ActionRow icon={Trash2} label="Удалить" onClick={() => setConfirming(true)} />}
            <button
              onClick={close}
              className="mt-1 w-full py-3 rounded-xl"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 14 }}
            >
              Отмена
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <p className="text-center mb-4" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
              Удалить?
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
                onClick={() => { onDelete?.(); close() }}
                className="flex-1 py-3 rounded-xl"
                style={{ background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600 }}
              >
                Да
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
