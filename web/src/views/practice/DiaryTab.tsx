import { useMemo, useState } from 'react'
import { type Diary, todayKey, useLS } from './store'

const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MO = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']

function label(dateKey: string) {
  const d = new Date(dateKey + 'T12:00:00')
  return `${d.getDate()} ${MO[d.getMonth()]} · ${WD[d.getDay()]}`
}

export default function DiaryTab() {
  const [diary, setDiary] = useLS<Diary>('aod2-diary', {})
  const [selected, setSelected] = useState(todayKey())

  // последние 30 дней + все даты с записями
  const days = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
    Object.keys(diary).forEach((k) => set.add(k))
    return [...set].sort().reverse()
  }, [diary])

  const entry = diary[selected] || { text: '', emotion: '', focus: 5, updated: 0 }

  const patch = (p: Partial<typeof entry>) =>
    setDiary((d) => ({ ...d, [selected]: { ...entry, ...p, updated: Date.now() } }))

  const isToday = selected === todayKey()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3" style={{ minHeight: 480 }}>
      {/* dates */}
      <div className="panel rounded-md p-3 lg:max-h-[600px] lg:overflow-y-auto h-fit">
        <p className="mono-label px-2 py-1">Записи · 30 дней</p>
        <div className="flex lg:flex-col gap-1 overflow-x-auto">
          {days.map((dk) => {
            const has = !!diary[dk]?.text || !!diary[dk]?.emotion
            const active = dk === selected
            return (
              <button
                key={dk}
                onClick={() => setSelected(dk)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-left whitespace-nowrap transition-colors"
                style={{
                  background: active ? 'var(--active-bg)' : 'transparent',
                  color: active ? 'var(--light)' : 'var(--text)',
                }}
              >
                <span
                  className="tag-dot"
                  style={{ background: has ? 'var(--accent)' : 'var(--line-strong)' }}
                />
                <span className="text-[12.5px] flex-1">{label(dk)}</span>
                {diary[dk]?.emotion && (
                  <span className="mono-label" style={{ fontSize: 8, color: 'var(--f-emotions)' }}>
                    {diary[dk].emotion}
                  </span>
                )}
                {dk === todayKey() && <span className="mono-label" style={{ fontSize: 8, color: 'var(--accent)' }}>сегодня</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* editor */}
      <div className="panel rounded-md p-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5">
          <h3 className="display" style={{ fontSize: 28 }}>
            {isToday ? 'Сегодня' : label(selected)}
          </h3>
          <span className="mono-label" style={{ fontSize: 8 }}>
            {entry.updated ? `сохранено ${new Date(entry.updated).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'ещё пусто'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <p className="mono-label mb-2">Эмоция дня — одним словом</p>
            <input
              value={entry.emotion}
              onChange={(e) => patch({ emotion: e.target.value })}
              placeholder="Интерес. Тревога. Спокойствие…"
              className="w-full bg-transparent rounded-sm px-3 py-2 text-[13px] outline-none"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--f-emotions)' }}
            />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <p className="mono-label">Фокус дня</p>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{entry.focus}/10</span>
            </div>
            <input
              type="range" min={0} max={10} value={entry.focus}
              onChange={(e) => patch({ focus: Number(e.target.value) })}
              className="force-slider w-full"
              style={{ ['--slider-color' as string]: 'var(--accent)', marginTop: 10 }}
            />
          </div>
        </div>

        <p className="mono-label mb-2">Запись · какая эмоция сегодня украла больше всего фокуса?</p>
        <textarea
          value={entry.text}
          onChange={(e) => patch({ text: e.target.value })}
          placeholder="Что было сегодня? Что почувствовал? Что понял? Это не для самобичевания — чтобы завтра узнать тревогу в лицо…"
          className="w-full bg-transparent rounded-sm px-4 py-3 text-[13.5px] leading-relaxed outline-none resize-y"
          style={{
            border: '1px solid var(--line-strong)',
            color: 'var(--light)',
            minHeight: 260,
            fontFamily: 'var(--font-body)',
          }}
        />
        <p className="mono-label mt-3" style={{ fontSize: 8 }}>сохраняется автоматически · данные живут в этом браузере</p>
      </div>
    </div>
  )
}
