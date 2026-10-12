import { useEffect, useState } from 'react'
import { ChevronDown, EyeOff, LayoutDashboard, ListTree, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import type { BlockDef } from '../views/practice/store'
import { Toggle } from './ui'

function MenuRow({
  icon: Icon,
  label,
  onClick,
  right,
  danger,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  right?: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
      style={{ color: danger ? 'var(--ring-tasks)' : 'var(--light)', fontSize: 15, fontFamily: 'var(--font-body)' }}
    >
      <Icon size={18} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
      <span className="flex-1">{label}</span>
      {right}
    </button>
  )
}

// меню блока экрана «Сегодня»: переименовать / состав (Чек-листы, Списки, Пункты) /
// «Показывать в дашборде» / удалить. Открывается из шторки «Блоки экрана»
// и из кнопки «…» в шапке развёрнутого блока.
export default function BlockMenu({
  def,
  onClose,
  onPatch,
  onDelete,
}: {
  def: BlockDef
  onClose: () => void
  onPatch: (patch: Partial<BlockDef>) => void
  onDelete: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [allowOpen, setAllowOpen] = useState(false)
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

  const allowRows: { key: keyof BlockDef['allow']; label: string }[] = [
    { key: 'checklists', label: 'Чек-листы' },
    { key: 'sub', label: 'Подблоки' },
    { key: 'lists', label: 'Списки' },
    { key: 'items', label: 'Пункты' },
  ]

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

        <div className="px-5 pb-2">
          {renaming ? (
            <input
              ref={(el) => el?.focus()}
              value={def.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setRenaming(false)}
              placeholder="Название блока"
              className="w-full bg-transparent outline-none"
              style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
            />
          ) : (
            <p className="truncate" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {def.title || 'Блок'}
            </p>
          )}
        </div>

        {!confirming ? (
          <div className="px-3 pb-3">
            <MenuRow icon={Pencil} label="Переименовать блок" onClick={() => setRenaming(true)} />
            <MenuRow
              icon={ListTree}
              label="Состав блока"
              onClick={() => setAllowOpen((o) => !o)}
              right={
                <ChevronDown
                  size={16}
                  strokeWidth={1.8}
                  style={{ color: 'var(--muted)', transition: 'transform .2s', transform: allowOpen ? 'rotate(180deg)' : 'none' }}
                />
              }
            />
            {allowOpen && (
              <div className="px-3 pb-1 fadein">
                {allowRows.map((r) => (
                  <div key={r.key} className="flex items-center gap-3 py-2.5 pl-9">
                    <span className="flex-1" style={{ fontSize: 14, color: 'var(--text-2)' }}>
                      {r.label}
                    </span>
                    <Toggle
                      on={def.allow[r.key]}
                      onChange={(v) => onPatch({ allow: { ...def.allow, [r.key]: v } })}
                    />
                  </div>
                ))}
              </div>
            )}
            <MenuRow
              icon={LayoutDashboard}
              label="Показывать в дашборде"
              right={<Toggle on={def.inDashboard} onChange={(v) => onPatch({ inDashboard: v })} />}
            />
            {/* выполненные прячутся из вида, но хранятся и считаются в прогрессе */}
            <MenuRow
              icon={EyeOff}
              label="Скрыть выполненные"
              right={<Toggle on={!!def.hideDone} onChange={(v) => onPatch({ hideDone: v })} />}
            />
            <MenuRow icon={Trash2} label="Удалить блок" danger onClick={() => setConfirming(true)} />
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
              Удалить блок?
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
                onClick={() => { onDelete(); close() }}
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
