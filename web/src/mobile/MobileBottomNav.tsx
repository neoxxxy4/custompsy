import { Home, SquarePen, type LucideIcon } from 'lucide-react'

export type MTab = 'today' | 'records'

const TABS: { id: MTab; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Сегодня', icon: Home },
  { id: 'records', label: 'Записи', icon: SquarePen },
]

// нижнее меню мобильного приложения — 2 раздела
export default function MobileBottomNav({ tab, go }: { tab: MTab; go: (t: MTab) => void }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex"
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map((t) => {
        const active = tab === t.id
        const Icon = t.icon
        return (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 transition-colors"
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.6} style={{ color: active ? 'var(--accent)' : 'var(--muted)' }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: active ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
