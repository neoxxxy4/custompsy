import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { formatDateRu } from './mapLogic'

// структура одной большой заметки к пункту: подблоки
export interface ParamNoteParts {
  general?: string
  thoughts?: string
  actions?: string
  people?: string
  emotions?: string
}

export const NOTE_SECTIONS: { key: keyof ParamNoteParts; label: string; placeholder: string }[] = [
  { key: 'general', label: 'Общее описание', placeholder: 'Что происходит с этим пунктом…' },
  { key: 'thoughts', label: 'Мысли', placeholder: 'Что крутится в голове…' },
  { key: 'actions', label: 'Действия', placeholder: 'Что делаю или собираюсь сделать…' },
  { key: 'people', label: 'Люди', placeholder: 'Кто связан с этим пунктом…' },
  { key: 'emotions', label: 'Эмоции', placeholder: 'Что чувствую…' },
]

// совместимость: раньше заметка была просто строкой → считаем её общим описанием
export const normalizeNote = (raw: ParamNoteParts | string | undefined): ParamNoteParts =>
  typeof raw === 'string' ? (raw ? { general: raw } : {}) : (raw ?? {})

export const noteHasText = (parts: ParamNoteParts) =>
  NOTE_SECTIONS.some((s) => (parts[s.key] ?? '').trim().length > 0)

export interface ParamNoteHistoryItem {
  date: string
  value: number | null
  parts: ParamNoteParts
}

// bottom-sheet заметки к пункту карты самооценки:
// одна заметка на пункт за снимок с подблоками, редактируется в любое время,
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
  onSave: (part: keyof ParamNoteParts, text: string) => void
  onPickDate?: (date: string) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = () => {
    setExiting(true)
    window.setTimeout(onClose, 220)
  }

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

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
          {/* подблоки большой заметки */}
          <div className="space-y-2.5">
            {NOTE_SECTIONS.map((s) => (
              <div key={s.key}>
                <p className="pb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                  {s.label}
                </p>
                <textarea
                  value={note[s.key] ?? ''}
                  onChange={(e) => onSave(s.key, e.target.value)}
                  placeholder={s.placeholder}
                  rows={2}
                  aria-label={s.label}
                  className="w-full rounded-xl px-3 py-2 outline-none resize-none"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--light)',
                    fontSize: 13,
                  }}
                />
              </div>
            ))}
          </div>

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
                    {NOTE_SECTIONS.filter((s) => (h.parts[s.key] ?? '').trim()).map((s) => (
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
