import { useEffect, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { formatDateRu } from './mapLogic'

// структура одной большой заметки к пункту:
// вкладка «Структура»: 1) общее  2) сворачиваемые люди/эмоции/мысли/поведение  3) действия
// вкладка «Вопросы»: свободное поле → цепочка «Почему?» (минимум 5, можно добавлять) → свободное поле
export interface ParamNoteParts {
  general?: string
  people?: string
  emotions?: string
  thoughts?: string
  behavior?: string
  actions?: string
  freeTop?: string
  whys?: string[]
  freeBottom?: string
}

const GENERAL = { key: 'general', label: 'Общее', placeholder: 'Что происходит с этим пунктом…' } as const

const COLLAPSIBLE: { key: keyof ParamNoteParts; label: string; placeholder: string }[] = [
  { key: 'people', label: 'Люди', placeholder: 'Кто связан с этим пунктом…' },
  { key: 'emotions', label: 'Эмоции', placeholder: 'Что чувствую…' },
  { key: 'thoughts', label: 'Мысли', placeholder: 'Что крутится в голове…' },
  { key: 'behavior', label: 'Поведение', placeholder: 'Как себя веду, какие реакции…' },
]

const ACTIONS = { key: 'actions', label: 'Действия', placeholder: 'Что делаю или собираюсь сделать…' } as const

// порядок структурных полей для истории
export const NOTE_SECTIONS = [GENERAL, ...COLLAPSIBLE, ACTIONS]

// совместимость: раньше заметка была просто строкой → считаем её общим описанием
export const normalizeNote = (raw: ParamNoteParts | string | undefined): ParamNoteParts =>
  typeof raw === 'string' ? (raw ? { general: raw } : {}) : (raw ?? {})

export const noteHasText = (parts: ParamNoteParts) =>
  NOTE_SECTIONS.some((s) => ((parts[s.key] as string | undefined) ?? '').trim().length > 0) ||
  (parts.freeTop ?? '').trim().length > 0 ||
  (parts.freeBottom ?? '').trim().length > 0 ||
  (parts.whys ?? []).some((w) => w.trim().length > 0)

export interface ParamNoteHistoryItem {
  date: string
  value: number | null
  parts: ParamNoteParts
}

const areaStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--line)',
  color: 'var(--light)',
  fontSize: 13,
} as const

// bottom-sheet заметки к пункту карты самооценки:
// одна заметка на пункт за снимок, редактируется в любое время,
// ниже — все записи этого пункта по всем снимкам
export default function ParamNoteSheet({
  paramName,
  date,
  dates,
  note,
  history,
  onSave,
  onPickDate,
  onClose,
}: {
  paramName: string
  date: string
  dates?: string[]
  note: ParamNoteParts
  history: ParamNoteHistoryItem[]
  onSave: (part: keyof ParamNoteParts, value: string | string[]) => void
  onPickDate?: (date: string) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [noteTab, setNoteTab] = useState<'questions' | 'structure'>('questions')
  // раскрытые подблоки структуры: по умолчанию те, где уже есть текст
  const [openParts, setOpenParts] = useState<Set<string>>(() =>
    new Set(COLLAPSIBLE.filter((s) => (note[s.key] ?? '').trim()).map((s) => s.key)),
  )

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // смена даты/пункта: переоткрыть блоки с текстом
  useEffect(() => {
    setOpenParts(new Set(COLLAPSIBLE.filter((s) => (note[s.key] ?? '').trim()).map((s) => s.key)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramName, date])

  const close = () => {
    setExiting(true)
    window.setTimeout(onClose, 220)
  }

  const togglePart = (key: string) =>
    setOpenParts((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // цепочка «почему?»: минимум 5 блоков, можно добавлять
  const whys = note.whys ?? []
  const whyCount = Math.max(5, whys.length)
  const setWhy = (i: number, text: string) => {
    const next = Array.from({ length: whyCount }, (_, j) => whys[j] ?? '')
    next[i] = text
    onSave('whys', next)
  }
  const addWhy = () => onSave('whys', [...Array.from({ length: whyCount }, (_, j) => whys[j] ?? ''), ''])

  const open = mounted && !exiting

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        onClick={close}
        className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)', opacity: open ? 1 : 0, transitionDuration: '220ms' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderBottom: 'none',
          maxHeight: '85vh',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .22s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="grid place-items-center pt-3 pb-1 flex-none">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>
        <div className="flex items-center gap-2 px-4 pb-2 flex-none">
          <p className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
            {paramName}
          </p>
          {dates && dates.length > 1 ? (
            <div className="flex-none flex rounded-lg p-0.5" style={{ background: 'var(--surface-2)' }}>
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => onPickDate?.(d)}
                  className="rounded-md px-2 py-0.5 transition-colors"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    background: d === date ? 'var(--active-bg)' : 'transparent',
                    color: d === date ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  {formatDateRu(d)}
                </button>
              ))}
            </div>
          ) : (
            <span className="flex-none" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {formatDateRu(date)}
            </span>
          )}
          <button
            onClick={close}
            aria-label="Закрыть"
            className="flex-none grid place-items-center rounded-lg"
            style={{ width: 28, height: 28, color: 'var(--muted)' }}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* вкладки заметки */}
        <div className="px-4 pb-2 flex-none">
          <div className="grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
            {(
              [
                { id: 'questions', label: 'Вопросы' },
                { id: 'structure', label: 'Структура' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setNoteTab(t.id)}
                className="rounded-lg py-1.5 transition-colors"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: noteTab === t.id ? 'var(--accent)' : 'transparent',
                  color: noteTab === t.id ? 'var(--on-fill)' : 'var(--muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
          {noteTab === 'questions' ? (
            <>
              {/* свободное поле в начале */}
              <textarea
                value={note.freeTop ?? ''}
                onChange={(e) => onSave('freeTop', e.target.value)}
                placeholder="Свободная запись…"
                rows={2}
                aria-label="Свободная запись в начале"
                className="w-full rounded-xl px-3 py-2 outline-none resize-none"
                style={areaStyle}
              />

              {/* цепочка «почему?» */}
              <div className="mt-2.5 space-y-2">
                {Array.from({ length: whyCount }, (_, i) => (
                  <div key={i}>
                    <p className="pb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                      Почему? {i + 1}
                    </p>
                    <textarea
                      value={whys[i] ?? ''}
                      onChange={(e) => setWhy(i, e.target.value)}
                      placeholder="Потому что…"
                      rows={2}
                      aria-label={`Почему? ${i + 1}`}
                      className="w-full rounded-xl px-3 py-2 outline-none resize-none"
                      style={areaStyle}
                    />
                  </div>
                ))}
                <button
                  onClick={addWhy}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}
                >
                  <Plus size={14} strokeWidth={2} />
                  Ещё почему
                </button>
              </div>

              {/* свободное поле в конце */}
              <textarea
                value={note.freeBottom ?? ''}
                onChange={(e) => onSave('freeBottom', e.target.value)}
                placeholder="Свободная запись…"
                rows={2}
                aria-label="Свободная запись в конце"
                className="w-full mt-2.5 rounded-xl px-3 py-2 outline-none resize-none"
                style={areaStyle}
              />
            </>
          ) : (
            <>
              {/* 1) общее */}
              <p className="pb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                {GENERAL.label}
              </p>
              <textarea
                value={note.general ?? ''}
                onChange={(e) => onSave(GENERAL.key, e.target.value)}
                placeholder={GENERAL.placeholder}
                rows={3}
                aria-label={GENERAL.label}
                className="w-full rounded-xl px-3 py-2 outline-none resize-none"
                style={areaStyle}
              />

              {/* 2) сворачиваемые подблоки */}
              <div className="mt-2.5 space-y-1.5">
                {COLLAPSIBLE.map((s) => {
                  const isOpen = openParts.has(s.key)
                  const filled = ((note[s.key] as string | undefined) ?? '').trim().length > 0
                  return (
                    <div key={s.key} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                      <button
                        onClick={() => togglePart(s.key)}
                        className="w-full flex items-center gap-2 px-3 py-2"
                        style={{ background: 'var(--surface-2)' }}
                      >
                        <ChevronDown
                          size={13}
                          strokeWidth={1.8}
                          className="flex-none transition-transform"
                          style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                        />
                        <span className="flex-1 text-left" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                          {s.label}
                        </span>
                        {filled && <span className="flex-none w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                      </button>
                      {isOpen && (
                        <textarea
                          value={note[s.key] ?? ''}
                          onChange={(e) => onSave(s.key, e.target.value)}
                          placeholder={s.placeholder}
                          rows={2}
                          aria-label={s.label}
                          className="w-full px-3 py-2 outline-none resize-none"
                          style={{ ...areaStyle, border: 'none', borderTop: '1px solid var(--line)', borderRadius: 0 }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 3) действия */}
              <p className="pt-2.5 pb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                {ACTIONS.label}
              </p>
              <textarea
                value={note.actions ?? ''}
                onChange={(e) => onSave(ACTIONS.key, e.target.value)}
                placeholder={ACTIONS.placeholder}
                rows={2}
                aria-label={ACTIONS.label}
                className="w-full rounded-xl px-3 py-2 outline-none resize-none"
                style={areaStyle}
              />
            </>
          )}

          {history.length > 0 && (
            <>
              <p className="pt-3 pb-2" style={{ fontSize: 11, color: 'var(--muted)' }}>
                Все записи пункта
              </p>
              <div className="space-y-1.5">
                {history.map((h) => (
                  <div
                    key={h.date}
                    className="rounded-xl px-3 py-2"
                    style={{
                      background: 'var(--surface-2)',
                      border: `1px solid ${h.date === date ? 'var(--accent)' : 'var(--line)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                        {formatDateRu(h.date)}
                      </span>
                      {h.value !== null && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                          {h.value}
                        </span>
                      )}
                    </div>
                    {(h.parts.freeTop ?? '').trim() && (
                      <p className="mt-1 whitespace-pre-wrap" style={{ fontSize: 12, color: 'var(--text)' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>Запись: </span>
                        {h.parts.freeTop}
                      </p>
                    )}
                    {(h.parts.whys ?? []).map((w, i) =>
                      w.trim() ? (
                        <p key={i} className="mt-1 whitespace-pre-wrap" style={{ fontSize: 12, color: 'var(--text)' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>Почему? {i + 1}: </span>
                          {w}
                        </p>
                      ) : null,
                    )}
                    {(h.parts.freeBottom ?? '').trim() && (
                      <p className="mt-1 whitespace-pre-wrap" style={{ fontSize: 12, color: 'var(--text)' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>Запись · финал: </span>
                        {h.parts.freeBottom}
                      </p>
                    )}
                    {NOTE_SECTIONS.filter((s) => ((h.parts[s.key] as string | undefined) ?? '').trim()).map((s) => (
                      <p key={s.key} className="mt-1 whitespace-pre-wrap" style={{ fontSize: 12, color: 'var(--text)' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>{s.label}: </span>
                        {h.parts[s.key]}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
