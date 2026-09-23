import { useMemo } from 'react'
import type { ViewId } from '../App'
import { getSystemStatus, type SysStatus } from '../lib/dayStats'
import { useLSTick } from '../lib/sync'
import { HUB_ITEM, NAV_ITEMS, type NavDef } from './navItems'

const STATUS: Record<ViewId, (s: SysStatus) => string> = {
  day: (s) => `${s.day.pct}%`,
  calendar: (s) => (s.calToday ? `${s.calToday} соб.` : '—'),
  checklists: (s) => (s.day.cTotal ? `${s.day.cDone}/${s.day.cTotal}` : '—'),
  notes: (s) => `${s.notesCount}`,
  diary: (s) => (s.diaryToday ? 'записано' : 'не записано'),
  blog: (s) => (s.blogCount ? `${s.blogCount}` : 'черновик'),
  graph: () => 'v3.0',
  balance: (s) => (s.balancePct !== null ? `${s.balancePct}%` : '—'),
  roadmap: (s) => `${s.roadDone}/${s.roadTotal}`,
  planning: () => '4 нед',
  hub: () => '',
}

function NavButton({
  item,
  active,
  status,
  onClick,
}: {
  item: NavDef
  active: boolean
  status: string
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className="relative w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors"
      style={{ background: active ? 'var(--active-bg)' : 'transparent' }}
    >
      <Icon size={14} strokeWidth={1.5} style={{ color: active ? 'var(--accent)' : 'var(--muted)', flex: 'none' }} />
      <span
        className="tracking-wide"
        style={{
          color: active ? 'var(--light)' : 'var(--text)',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          fontSize: 10.5,
          letterSpacing: '0.14em',
        }}
      >
        {item.label}
      </span>
      <span className="mono-label ml-auto" style={{ fontSize: 8 }}>
        {status}
      </span>
      {active && (
        <span className="absolute left-5 right-5 bottom-1 h-px" style={{ background: 'var(--accent)' }} />
      )}
    </button>
  )
}

export default function SideNav({ view, go }: { view: ViewId; go: (v: ViewId) => void }) {
  const tick = useLSTick()
  const status = useMemo(() => getSystemStatus(), [tick, view])

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-[232px]"
      style={{ borderRight: '1px solid var(--line)', background: 'var(--chrome)' }}
    >
      {/* logo */}
      <button onClick={() => go('hub')} className="flex items-center gap-3 px-5 pt-5 pb-4 text-left flex-none">
        <span
          className="grid place-items-center w-9 h-9 rounded-sm flex-none"
          style={{ border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}
        >
          А
        </span>
        <span className="leading-none">
          <span className="display block" style={{ fontSize: 14 }}>Архитектор</span>
          <span className="mono-label block mt-1" style={{ fontSize: 7.5, letterSpacing: '0.22em' }}>
            осознанного доверия
          </span>
        </span>
      </button>

      {/* nav */}
      <nav className="flex-1 py-3 overflow-y-auto" style={{ borderTop: '1px solid var(--line)' }}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.view}
            item={item}
            active={view === item.view}
            status={STATUS[item.view](status)}
            onClick={() => go(item.view)}
          />
        ))}
      </nav>

      {/* bottom */}
      <div className="flex-none py-3" style={{ borderTop: '1px solid var(--line)' }}>
        <NavButton
          item={HUB_ITEM}
          active={view === 'hub'}
          status=""
          onClick={() => go('hub')}
        />
        <p className="mono-label px-5 pt-3" style={{ fontSize: 8 }}>
          v3.0 «Проводник»
        </p>
      </div>
    </aside>
  )
}
