import type { CSSProperties, ReactNode, Ref } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useLongPress } from './useLongPress'

// строка с long-press: движение/ранний отпуск — отмена, после срабатывания клик подавляется
export function LongPressRow({
  onLongPress,
  disabled,
  onClick,
  className,
  style,
  children,
}: {
  onLongPress: () => void
  disabled?: boolean
  onClick?: () => void
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const lp = useLongPress(onLongPress, { disabled })
  return (
    <div
      {...lp}
      onClick={onClick}
      className={`no-select${className ? ` ${className}` : ''}`}
      style={{ WebkitTouchCallout: 'none', ...style }}
    >
      {children}
    </div>
  )
}

export function ScreenHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)', lineHeight: 1.1 }}>
          {title}
        </h1>
        {sub && <p className="mt-0.5" style={{ fontSize: 13, color: 'var(--muted)' }}>{sub}</p>}
      </div>
      {right && <div className="flex-none pt-1">{right}</div>}
    </header>
  )
}

export function Card({
  title,
  right,
  children,
  ref,
  flash,
}: {
  title: string
  right?: ReactNode
  children: ReactNode
  ref?: Ref<HTMLElement>
  flash?: boolean
}) {
  const style: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    transition: 'box-shadow .3s ease, border-color .3s ease',
    ...(flash
      ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' }
      : {}),
  }
  return (
    <section ref={ref} className="rounded-2xl p-4" style={style}>
      <div className="flex items-center justify-between mb-2.5">
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  )
}

// цветная плитка-иконка (как в макетах)
export function Tile({ icon: Icon, color, size = 40 }: { icon: LucideIcon; color: string; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-xl flex-none"
      style={{ width: size, height: size, background: color }}
    >
      <Icon size={size * 0.5} strokeWidth={1.8} style={{ color: 'var(--on-fill)' }} />
    </span>
  )
}

// чекбокс мобильных списков
export function MCheck({ done, color, size = 20 }: { done: boolean; color: string; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-md flex-none transition-all"
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${done ? color : 'var(--line-strong)'}`,
        background: done ? color : 'transparent',
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 10 10" fill="none"
        style={{ opacity: done ? 1 : 0, transition: 'opacity .15s ease' }}>
        <path d="M1.5 5.5L4 8L8.5 2" stroke="var(--on-fill)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  )
}

// переключатель (iOS-стиль) для настроек блоков
export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex-none rounded-full transition-colors disabled:opacity-50"
      style={{
        width: 44,
        height: 26,
        padding: 2,
        background: on ? 'var(--accent)' : 'var(--line-strong)',
      }}
    >
      <span
        className="block rounded-full"
        style={{
          width: 22,
          height: 22,
          background: '#fff',
          transform: on ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform .2s ease',
        }}
      />
    </button>
  )
}
