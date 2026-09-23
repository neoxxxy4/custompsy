import { ROADMAP } from '../data/system'

const TAG_STYLE: Record<string, { label: string; color: string }> = {
  version: { label: 'версия', color: 'var(--f-metacog)' },
  sprint: { label: 'спринт', color: 'var(--f-discipline)' },
  season: { label: 'сезон', color: 'var(--f-boundaries)' },
  goal: { label: 'цель', color: 'var(--f-neuro)' },
}

export default function RoadmapView() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-28 pb-10">
      <div className="rise">
        <p className="mono-label mb-2">Модуль 05</p>
        <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>Роадмапа</h2>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed" style={{ color: 'var(--text)' }}>
          От контроля сил — к непрерывному жизненному потоку. Каждая версия архитектуры —
          итерация понимания, каждый спринт — четыре недели внедрения.
        </p>
      </div>

      <div className="mt-10 relative">
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px"
          style={{ background: 'linear-gradient(to bottom, var(--f-metacog), var(--accent), var(--line))' }}
        />
        {ROADMAP.map((r, i) => {
          const tag = TAG_STYLE[r.tag]
          const isNow = r.status === 'now'
          const isDone = r.status === 'done'
          return (
            <div
              key={r.title}
              className="rise relative pl-10 pb-8"
              style={{ animationDelay: `${i * 70}ms`, opacity: isDone ? 0.62 : 1 }}
            >
              <span
                className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full"
                style={{
                  background: isDone ? 'var(--surface-2)' : isNow ? 'var(--accent)' : 'var(--bg)',
                  border: `2px solid ${isDone ? 'var(--line-strong)' : isNow ? 'var(--accent)' : tag.color}`,
                  boxShadow: isNow ? '0 0 16px var(--accent)' : 'none',
                }}
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tag.color }}>{r.date}</span>
                <h3 className="display" style={{ fontSize: 24 }}>{r.title}</h3>
                <span
                  className="mono-label px-2 py-0.5 rounded-sm"
                  style={{ border: `1px solid ${tag.color}`, color: tag.color, fontSize: 8 }}
                >
                  {tag.label}
                </span>
                {isNow && (
                  <span className="mono-label px-2 py-0.5 rounded-sm" style={{ background: 'var(--accent)', color: '#fff', fontSize: 8 }}>
                    сейчас
                  </span>
                )}
                {isDone && <span className="mono-label" style={{ fontSize: 8 }}>пройдено</span>}
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed max-w-xl" style={{ color: 'var(--text)' }}>
                {r.desc}
              </p>
            </div>
          )
        })}
      </div>

      <div className="rise panel rounded-md p-6 mt-2" style={{ animationDelay: '620ms' }}>
        <p className="mono-label mb-2">Правило итераций</p>
        <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text)' }}>
          Планировать циклично — по 4 недели, обновляя и дополняя архитектуру по каждому пункту.
          Может, v4.0 некогда и не будет — либо это уже будет полноценный продукт.
        </p>
      </div>
    </div>
  )
}
