import { useLS } from '../views/practice/store'

interface PathLevel {
  id: number
  title: string
  focus: string[]
}

const LEVELS: PathLevel[] = [
  { id: 1, title: 'Вход и калибровка', focus: ['Стабилизация состояния', 'Снижение тревоги и хаоса', 'Формирование наблюдателя'] },
  { id: 2, title: 'Наблюдатель', focus: ['Осознание механизмов', 'Отделение себя от реакций', 'Видение паттернов'] },
  { id: 3, title: 'Антрополог', focus: ['Исследование корней', 'Детские сценарии', 'Глубинные убеждения'] },
  { id: 4, title: 'Инженер поведения', focus: ['Перепроектирование действий', 'Новые стратегии', 'Закрепление моделей'] },
  { id: 5, title: 'Архитектор идентичности', focus: ['Сборка новой роли', 'Структура ответственности', 'Профессиональная позиция'] },
  { id: 6, title: 'Навигация будущего', focus: ['Стратегический масштаб', 'План 3–5 лет', 'Расширение влияния'] },
]

export default function PathView() {
  const [level, setLevel] = useLS<number>('aod4-path-level', 1)

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Путь
      </h1>

      <section className="mt-4 space-y-2">
        {LEVELS.map((l) => {
          const active = level === l.id
          const passed = l.id < level
          return (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className="w-full rounded-2xl p-3 text-left"
              style={{ background: 'var(--surface)', border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`, boxShadow: active ? '0 0 0 1px var(--accent)' : 'none' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex-none grid place-items-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    background: active || passed ? 'var(--f-metacog)' : 'var(--surface-2)',
                    color: active || passed ? 'var(--bg)' : 'var(--muted)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {passed ? '✓' : l.id}
                </span>
                <span className="flex-1" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
                  {l.title}
                </span>
              </div>
              <div className="mt-2 pl-11 space-y-0.5">
                {l.focus.map((f, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--muted)' }}>{f}</p>
                ))}
              </div>
            </button>
          )
        })}
      </section>
    </div>
  )
}
