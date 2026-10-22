import { Minus, Plus } from 'lucide-react'
import { useLS } from '../views/practice/store'

interface PathLevel {
  pct: number
  title: string
  desc: string
  metrics: string[]
}

// шкала ненормальности: 100 — хаос, 0 — полная нормальность
const LEVELS: PathLevel[] = [
  {
    pct: 90,
    title: 'Точка старта',
    desc: 'Быт хаотичен, реакции неконтролируемы, круг общения узок. Здесь просто начинаем фиксировать.',
    metrics: ['Чек-лист «Быт» создан и заполняется каждый день', 'Дневник эмоций — первая запись'],
  },
  {
    pct: 80,
    title: 'Обслуживаю себя',
    desc: 'Гигиена, еда, сон, порядок в вещах — базовое самообслуживание без усилий и напоминаний.',
    metrics: ['Быт-чеклист выполнен 7 дней подряд', 'Сон по режиму 5 из 7 дней'],
  },
  {
    pct: 70,
    title: 'Наблюдатель',
    desc: 'Замечаю свою реакцию после неё и разбираю: что зацепило, что почувствовал, что сделал.',
    metrics: ['3+ записей эмоций в неделю', 'Разбор 1 срыва в неделю в «Терапии»'],
  },
  {
    pct: 60,
    title: 'Пауза перед реакцией',
    desc: 'Замечаю триггер до взрыва. Пауза перед ответом становится привычкой.',
    metrics: ['Срывы ≤ 1 в неделю', 'Пауза сработала 3+ раза за неделю'],
  },
  {
    pct: 50,
    title: 'Проработка прошлого',
    desc: 'Ключевые сценарии из прошлого названы, описаны и разобраны — они перестают управлять изнутри.',
    metrics: ['5+ записей о прошлом в дневнике/терапии', '1 разбор или сессия в неделю'],
  },
  {
    pct: 40,
    title: 'Круг расширяется',
    desc: '2–3 человека, с которыми регулярный контакт не по необходимости, а по желанию.',
    metrics: ['3 контакта в «Социуме»', '2 встречи или созвона в месяц'],
  },
  {
    pct: 30,
    title: 'Инициирую общение',
    desc: 'Сам начинаю контакт, держу границы, умею говорить «нет» без вины.',
    metrics: ['1 инициированный контакт в неделю', '0 отменённых встреч из-за избегания'],
  },
  {
    pct: 20,
    title: 'Устойчивость',
    desc: 'Срывы редки и коротки — восстановление за часы, а не за дни.',
    metrics: ['Срыв ≤ 1 в месяц', 'Быт-чеклист выполнен на 80%+ за месяц'],
  },
  {
    pct: 10,
    title: 'Интеграция',
    desc: 'Помогаю другим, рутина стабильна, есть планы на месяцы вперёд.',
    metrics: ['Стабильность 3 месяца без откатов', '1 разговор «психологом другу» в месяц'],
  },
  {
    pct: 0,
    title: 'Нормальность',
    desc: 'Быт автоматичен, эмоции распознаю в моменте, есть круг поддержки. Шкала пройдена.',
    metrics: ['Все предыдущие метрики держатся без усилий'],
  },
]

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export default function PathView({ embedded = false }: { embedded?: boolean }) {
  const [pct, setPct] = useLS<number>('aod4-path-pct', 90)

  // LEVELS отсортированы по убыванию (90 → 0): текущий — первый, до которого уже спустились
  const currentLevel = LEVELS.find((l) => l.pct <= pct) ?? LEVELS[LEVELS.length - 1]

  return (
    <div className={embedded ? '' : 'px-4 pt-5 pb-28 min-h-screen'}>
      {!embedded && (
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
          Путь
        </h1>
      )}

      {/* шкала */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Шкала ненормальности</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--light)' }}>{pct}%</span>
        </div>
        <div className="mt-3 h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct > 50 ? 'var(--accent)' : 'var(--done)',
            }}
          />
        </div>
        <div className="mt-1 flex justify-between" style={{ fontSize: 10, color: 'var(--muted)' }}>
          <span>0 · нормальность</span>
          <span>100 · хаос</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => setPct(clamp(pct - 5))}
            className="grid place-items-center rounded-xl"
            style={{ width: 40, height: 40, background: 'var(--surface-2)', color: 'var(--done)' }}
            aria-label="Лучше на 5"
          >
            <Minus size={18} strokeWidth={2} />
          </button>
          <div className="text-center flex-1">
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{currentLevel.title}</p>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>минус — становится лучше</p>
          </div>
          <button
            onClick={() => setPct(clamp(pct + 5))}
            className="grid place-items-center rounded-xl"
            style={{ width: 40, height: 40, background: 'var(--surface-2)', color: 'var(--muted)' }}
            aria-label="Хуже на 5"
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* план по уровням: сверху текущее, внизу цель */}
      <section className="mt-4 space-y-2">
        {LEVELS.map((l) => {
          const isCurrent = l === currentLevel
          const passed = l.pct > pct
          return (
            <button
              key={l.pct}
              onClick={() => setPct(l.pct)}
              className="w-full rounded-2xl p-3 text-left"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${isCurrent ? 'var(--accent)' : 'var(--line)'}`,
                boxShadow: isCurrent ? '0 0 0 1px var(--accent)' : 'none',
                opacity: !isCurrent && !passed ? 0.55 : 1,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex-none grid place-items-center rounded-full"
                  style={{
                    width: 34,
                    height: 34,
                    background: passed ? 'var(--done)' : isCurrent ? 'var(--accent)' : 'var(--surface-2)',
                    color: passed || isCurrent ? 'var(--bg)' : 'var(--muted)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {passed ? '✓' : l.pct}
                </span>
                <span className="flex-1" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
                  {l.title}
                </span>
              </div>
              <p className="mt-1.5 pl-11" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {l.desc}
              </p>
              <div className="mt-1 pl-11 space-y-0.5">
                {l.metrics.map((m, i) => (
                  <p key={i} style={{ fontSize: 11, color: 'var(--muted)' }}>
                    · {m}
                  </p>
                ))}
              </div>
            </button>
          )
        })}
      </section>
    </div>
  )
}
