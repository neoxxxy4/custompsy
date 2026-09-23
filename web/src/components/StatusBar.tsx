import { useMemo } from 'react'
import { VIEW_TITLES, type ViewId } from '../App'
import { getDayStats } from '../lib/dayStats'
import { useLSTick } from '../lib/sync'
import type { ThemeId } from '../lib/theme'
import MiniRing from './MiniRing'
import ThemeToggle from './ThemeToggle'

interface Props {
  view: ViewId
  go: (v: ViewId) => void
  theme: ThemeId
  onToggleTheme: () => void
}

export default function StatusBar({ view, go, theme, onToggleTheme }: Props) {
  const tick = useLSTick()
  const stats = useMemo(() => getDayStats(), [tick, view])

  return (
    <header
      className="hidden lg:flex fixed top-0 left-[232px] right-0 z-40 h-11 items-center justify-between px-6"
      style={{
        background: 'var(--chrome-soft)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <span className="mono-label" style={{ fontSize: 9 }}>
        Главная / {VIEW_TITLES[view]}
      </span>
      <span className="flex items-center gap-3">
        <button
          onClick={() => go('day')}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          title="Открыть «День»"
        >
          <MiniRing pct={stats.pct} size={18} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--light)', whiteSpace: 'nowrap' }}>
            {stats.pct}%{stats.blockLabel ? ` · ${stats.blockLabel}` : ''} · цели {stats.gDone}/{stats.gTotal} · v3.0
          </span>
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </span>
    </header>
  )
}
