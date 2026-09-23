import { useMemo, useState } from 'react'
import { type Template, allTemplates, uid, useLS, PALETTE, PALETTE_HEX } from './store'

type Mode = 'pick' | 'create'

interface Props {
  onDayIds: Set<string>
  onAdd: (t: Template) => void
  initialMode?: Mode
}

// панель «+ чек-лист»: выбор существующего шаблона (копией) или создание нового.
// используется в «Практике» и на странице «День»
export default function TemplateManager({ onDayIds, onAdd, initialMode = 'pick' }: Props) {
  const [customTpls, setCustomTpls] = useLS<Template[]>('aod2-templates', [])
  const [mode, setMode] = useState<Mode>(initialMode)

  const [fTitle, setFTitle] = useState('')
  const [fTime, setFTime] = useState('')
  const [fColor, setFColor] = useState(PALETTE[0])
  const [fItems, setFItems] = useState('')

  const templates = useMemo(() => allTemplates(customTpls), [customTpls])

  const saveTemplate = () => {
    const items = fItems.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!fTitle.trim() || items.length === 0) return
    const t: Template = {
      id: `custom-${uid()}`,
      title: fTitle.trim(),
      time: fTime.trim() || 'свой ритуал',
      color: fColor,
      items: items.map((text) => ({ id: uid(), text })),
      custom: true,
    }
    setCustomTpls((ts) => [...ts, t])
    setFTitle(''); setFTime(''); setFItems('')
    setMode('pick')
  }

  return (
    <div className="fadein panel rounded-md p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setMode('pick')}
          className="mono-label-bright px-3 py-1.5 rounded-sm transition-opacity hover:opacity-85"
          style={{
            background: mode === 'pick' ? 'var(--accent)' : 'transparent',
            color: mode === 'pick' ? '#fff' : 'var(--text)',
            border: `1px solid ${mode === 'pick' ? 'var(--accent)' : 'var(--line-strong)'}`,
          }}
        >
          из шаблона
        </button>
        <button
          onClick={() => setMode('create')}
          className="mono-label-bright px-3 py-1.5 rounded-sm transition-opacity hover:opacity-85"
          style={{
            background: mode === 'create' ? 'var(--accent)' : 'transparent',
            color: mode === 'create' ? '#fff' : 'var(--text)',
            border: `1px solid ${mode === 'create' ? 'var(--accent)' : 'var(--line-strong)'}`,
          }}
        >
          новый шаблон
        </button>
        <span className="mono-label ml-1" style={{ fontSize: 8 }}>
          {mode === 'pick' ? 'добавляются копией, шаблон не меняется' : 'останется в заготовках навсегда'}
        </span>
      </div>

      {mode === 'pick' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {templates.map((t) => {
            const added = onDayIds.has(t.id)
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-sm px-3 py-2.5"
                style={{ border: '1px solid var(--line)', opacity: added ? 0.45 : 1 }}>
                <span className="tag-dot" style={{ background: t.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate" style={{ color: 'var(--light)' }}>{t.title}</p>
                  <p className="mono-label" style={{ fontSize: 8 }}>{t.items.length} пунктов{t.custom ? ' · свой' : ''}</p>
                </div>
                {added ? (
                  <span className="mono-label" style={{ fontSize: 8 }}>в дне</span>
                ) : (
                  <button onClick={() => onAdd(t)}
                    className="mono-label-bright px-2 py-1 rounded-sm hover:opacity-80"
                    style={{ border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 9 }}>
                    + в день
                  </button>
                )}
                {t.custom && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Удалить шаблон «${t.title}»? Списки дня не пострадают.`))
                        setCustomTpls((ts) => ts.filter((x) => x.id !== t.id))
                    }}
                    className="mono-label hover:opacity-60 px-1" title="Удалить шаблон">✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {mode === 'create' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Название · например, Тренировка"
              className="w-full bg-transparent rounded-sm px-3 py-2 text-[13px] outline-none mb-2"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--light)' }} />
            <input value={fTime} onChange={(e) => setFTime(e.target.value)} placeholder="Подпись · например, 3 раза в неделю"
              className="w-full bg-transparent rounded-sm px-3 py-2 text-[13px] outline-none mb-3"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--light)' }} />
            <p className="mono-label mb-2">Цвет</p>
            <div className="flex gap-2">
              {PALETTE.map((c) => (
                <button key={c} onClick={() => setFColor(c)}
                  className="w-6 h-6 rounded-full transition-transform"
                  style={{
                    background: PALETTE_HEX[c],
                    transform: fColor === c ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: fColor === c ? `0 0 0 2px var(--bg), 0 0 0 3px ${PALETTE_HEX[c]}` : 'none',
                  }} />
              ))}
            </div>
          </div>
          <div>
            <textarea value={fItems} onChange={(e) => setFItems(e.target.value)}
              placeholder={'Пункты — каждый с новой строки:\nРазминка 10 мин\nОсновная часть\nЗаминка и растяжка'}
              rows={5}
              className="w-full bg-transparent rounded-sm px-3 py-2 text-[13px] outline-none resize-y"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--light)', fontFamily: 'var(--font-body)' }} />
            <button onClick={saveTemplate}
              className="mt-2 mono-label-bright px-4 py-2 rounded-sm hover:opacity-85 transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Сохранить шаблон
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
