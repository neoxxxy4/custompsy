import { SPRINT0, WEEK_TEMPLATE, PLAN_PRINCIPLES } from '../data/system'

export default function PlanningView() {
  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-10">
      <div className="rise">
        <p className="mono-label mb-2">Модуль 06 · цикл 4 недели</p>
        <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>Планирование</h2>
      </div>

      {/* sprint cycle */}
      <div className="rise mt-8" style={{ animationDelay: '80ms' }}>
        <p className="mono-label mb-3">Sprint 0 · четыре недели</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {SPRINT0.map((w, i) => (
            <div key={w.week} className="panel rounded-md p-5 relative overflow-hidden">
              <span
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: w.color }}
              />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: w.color }}>
                Неделя {i + 1}
              </p>
              <p className="mono-label mt-1">{w.week}</p>
              <h3 className="display mt-3" style={{ fontSize: 24 }}>{w.theme}</h3>
              <ul className="mt-3 space-y-1.5">
                {w.topics.map((t) => (
                  <li key={t} className="text-[12.5px]" style={{ color: 'var(--text)' }}>
                    · {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* week template */}
      <div className="rise mt-12" style={{ animationDelay: '160ms' }}>
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <p className="mono-label">Шаблон недели · жёсткий каркас, мягкое наполнение</p>
          <p className="mono-label">учёба: будни 2 ч · выходные 6 ч · блоки ≤ 1.5 ч</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {WEEK_TEMPLATE.map((d) => (
            <div key={d.day} className="panel rounded-md p-4">
              <p className="display mb-3" style={{ fontSize: 20 }}>{d.day}</p>
              <div className="space-y-3">
                {d.blocks.map((b, bi) => (
                  <div key={bi}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                      {b.time}
                    </p>
                    <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: b.color ?? 'var(--light)' }}>
                      {b.what}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* principles */}
      <div className="rise mt-12 grid grid-cols-1 md:grid-cols-2 gap-3" style={{ animationDelay: '240ms' }}>
        {PLAN_PRINCIPLES.map((p, i) => (
          <div key={p.title} className="panel rounded-md p-5 flex gap-4 items-start">
            <span className="display" style={{ fontSize: 28, color: 'var(--accent)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h4 className="display" style={{ fontSize: 19 }}>{p.title}</h4>
              <p className="text-[12.5px] mt-1 leading-snug" style={{ color: 'var(--text)' }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
