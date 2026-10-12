import type { AppTabId } from './navConfig'
import { DEFAULT_TABS } from './navConfig'

export type { AppTabId } from './navConfig'

export default function MobileBottomNav({
  tab,
  onTab,
}: {
  tab: AppTabId
  onTab: (t: AppTabId) => void
}) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex select-none"
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        touchAction: 'pan-y',
      }}
    >
      {DEFAULT_TABS.map((t) => {
        const active = tab === t.id
        const Icon = t.icon
        return (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
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
