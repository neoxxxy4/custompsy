import { MODULES, FORCES } from '../data/system'
import type { ViewId } from '../App'

const SPRINT_START = new Date('2026-09-16T00:00:00')
const SEASON_DEADLINE = new Date('2026-12-01T00:00:00')

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export default function Dashboard({ go }: { go: (v: ViewId) => void }) {
  const now = new Date()
  const sprintDay = daysBetween(SPRINT_START, now)
  const toDeadline = daysBetween(now, SEASON_DEADLINE)

  return (
    <div className="max-w-5xl mx-auto px-6 pt-32 pb-16">
      {/* hero */}
      <div className="rise" style={{ animationDelay: '0ms' }}>
        <p className="mono-label mb-4">Личная операционная система · серия постов #0–#6</p>
        <h1 className="display" style={{ fontSize: 'clamp(44px, 8vw, 96px)' }}>
          Архитектор<br />
          <span style={{ WebkitTextStroke: '1px var(--line-strong)', color: 'transparent' }}>
            осознанного
          </span>{' '}
          доверия
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--text)' }}>
          В силе нет смысла, если нет за ней контроля. Шесть сил, три источника влияния,
          циклы по четыре недели — и путь от тревоги к состоянию потока.
        </p>
      </div>

      {/* status strip */}
      <div
        className="rise mt-12 panel rounded-md grid grid-cols-2 md:grid-cols-4"
        style={{ animationDelay: '90ms' }}
      >
        {[
          { label: 'Версия архитектуры', value: 'v3.0', sub: '«Проводник»' },
          { label: 'Sprint 0', value: sprintDay < 0 ? `старт через ${-sprintDay} дн.` : `день ${sprintDay + 1}`, sub: 'Состояние → Путь → Организация' },
          { label: 'Цель сезона', value: 'v3.1', sub: `осталось ${toDeadline} дн.` },
          { label: 'Ритм', value: '4 нед', sub: 'длина цикла' },
        ].map((s, i) => (
          <div
            key={s.label}
            className="px-5 py-4"
            style={{ borderLeft: i > 0 ? '1px solid var(--line)' : 'none' }}
          >
            <p className="mono-label">{s.label}</p>
            <p className="display mt-2" style={{ fontSize: 26, color: 'var(--light)' }}>{s.value}</p>
            <p className="mono-label mt-1" style={{ fontSize: 9 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* module cards */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-3">
        {MODULES.map((m, i) => (
          <button
            key={m.id}
            className="module-card rise text-left"
            style={{ ['--card-color' as string]: m.color, animationDelay: `${150 + i * 60}ms` }}
            onClick={() => go(m.id as ViewId)}
          >
            <span className="ghost-num">{m.num}</span>
            <div className="flex items-center justify-between">
              <span className="mono-label" style={{ color: m.color }}>{m.num} / модуль</span>
              <svg className="arrow" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 12L12 2M12 2H4M12 2V10" stroke={m.color} strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="display mt-4" style={{ fontSize: 34 }}>{m.name}</h3>
            <p className="mt-2 text-[13px] leading-snug max-w-[85%]" style={{ color: 'var(--muted)' }}>
              {m.tagline}
            </p>
          </button>
        ))}
      </div>

      {/* forces strip */}
      <div className="rise mt-14" style={{ animationDelay: '560ms' }}>
        <p className="mono-label mb-3">Шесть сил · фундамент / стены / крыша</p>
        <div className="grid grid-cols-2 md:grid-cols-6 panel rounded-md">
          {FORCES.map((f, i) => (
            <div
              key={f.id}
              className="px-4 py-4"
              style={{ borderLeft: i > 0 ? '1px solid var(--line)' : 'none' }}
            >
              <span className="tag-dot inline-block mb-2" style={{ background: f.color }} />
              <p className="text-[12px] font-medium leading-tight" style={{ color: 'var(--light)' }}>{f.name}</p>
              <p className="mono-label mt-1" style={{ fontSize: 8 }}>{f.layer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
