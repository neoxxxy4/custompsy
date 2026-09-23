import { useMemo } from 'react'
import { FORCES, SPHERES } from '../data/system'
import { useLS } from './practice/store'

const N = 6
const CX = 220
const CY = 200
const R = 140

function point(i: number, v: number) {
  const ang = (Math.PI * 2 * i) / N - Math.PI / 2
  const r = (v / 10) * R
  return [CX + r * Math.cos(ang), CY + r * Math.sin(ang)] as const
}

export default function BalanceView() {
  const [values, setValues] = useLS<number[]>('aod-balance', [6, 7, 5, 4, 6, 5])

  const poly = useMemo(
    () => values.map((v, i) => point(i, v).join(',')).join(' '),
    [values]
  )

  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min
  const weakest = FORCES[values.indexOf(min)]
  const verdict =
    spread <= 2
      ? 'Система сбалансирована. Можно углублять, а не латать.'
      : spread <= 4
        ? `Лёгкий перекос: проседает «${weakest.name}». Дай ей один микро-шаг в день.`
        : `Сильный перекос: «${weakest.name}» тянет систему вниз. Фокус недели — на ней.`

  return (
    <div className="max-w-5xl mx-auto px-6 pt-28 pb-10">
      <div className="rise">
        <p className="mono-label mb-2">Модуль 04</p>
        <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>Баланс сил</h2>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed" style={{ color: 'var(--text)' }}>
          Шесть сил — одна система. Оцени честно каждую от 0 до 10: сила без контроля — хаос,
          а перекос в одной силе крадёт ресурс у остальных.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3">
        {/* radar */}
        <div className="rise panel rounded-md p-4 grid place-items-center" style={{ animationDelay: '80ms' }}>
          <svg viewBox="0 0 440 400" className="w-full max-w-[480px] h-auto">
            {[2, 4, 6, 8, 10].map((lvl) => (
              <polygon
                key={lvl}
                points={Array.from({ length: N }, (_, i) => point(i, lvl).join(',')).join(' ')}
                fill="none"
                stroke="var(--line)"
                strokeDasharray={lvl === 10 ? 'none' : '3 4'}
              />
            ))}
            {Array.from({ length: N }, (_, i) => {
              const [x, y] = point(i, 10)
              return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--line)" />
            })}
            <polygon
              points={poly}
              fill="var(--accent-soft)"
              stroke="var(--accent)"
              strokeWidth="1.6"
              style={{ transition: 'all .3s ease' }}
            />
            {values.map((v, i) => {
              const [x, y] = point(i, v)
              const [lx, ly] = point(i, 12.6)
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="5" fill={FORCES[i].color} stroke="var(--bg)" strokeWidth="2" style={{ transition: 'all .3s ease' }} />
                  <text
                    x={lx}
                    y={ly + 4}
                    textAnchor="middle"
                    fill="var(--light)"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  >
                    {FORCES[i].name}
                  </text>
                  <text
                    x={lx}
                    y={ly + 18}
                    textAnchor="middle"
                    fill={FORCES[i].color}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}
                  >
                    {v}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* sliders */}
        <div className="rise panel rounded-md p-6" style={{ animationDelay: '160ms' }}>
          <p className="mono-label mb-4">Настройка оценки</p>
          {FORCES.map((f, i) => (
            <div key={f.id} className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--light)' }}>
                  <span className="tag-dot" style={{ background: f.color }} />
                  {f.name}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: f.color }}>{values[i]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={values[i]}
                className="force-slider"
                style={{ ['--slider-color' as string]: f.color }}
                onChange={(e) =>
                  setValues((vs) => vs.map((v, j) => (j === i ? Number(e.target.value) : v)))
                }
              />
            </div>
          ))}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="mono-label mb-2">Диагноз системы</p>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--light)' }}>{verdict}</p>
          </div>
        </div>
      </div>

      {/* spheres */}
      <div className="rise mt-3 grid grid-cols-1 md:grid-cols-3 gap-3" style={{ animationDelay: '240ms' }}>
        {SPHERES.map((s) => (
          <div key={s.name} className="panel rounded-md p-5">
            <p className="mono-label mb-3">{s.name}</p>
            <ul className="space-y-2">
              {s.parts.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-[13px]" style={{ color: 'var(--text)' }}>
                  <span className="w-3 h-px" style={{ background: 'var(--line-strong)' }} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="rise mono-label mt-6" style={{ animationDelay: '300ms' }}>
        Структура дел: основа · интеллект и продуктивность · потребности — из поста #freestyle_thoughts 1
      </p>
    </div>
  )
}
