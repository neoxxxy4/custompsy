import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import {
  DEFAULT_FEELINGS,
  DEFAULT_SENSATIONS,
  EMOTION_WHEEL,
  emotionName,
  plutchikColor,
  PLUTCHIK_EMOTIONS,
  todayKey,
  type Diary,
  type EmotionRecordSource,
  type EmotionSubItem,
  type EmotionTag,
  type ListRecord,
  type Note,
  uid,
} from '../views/practice/store'
import { valueHex } from './mapLogic'

type SheetMode = 'create' | 'edit'

export interface SheetState {
  open: boolean
  mode: SheetMode
  initial?: Partial<EmotionTag>
  sourceId?: string
  sourceType?: EmotionRecordSource
  tagId?: string
}

const LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: 'базовая',
  2: 'смешанная',
  3: 'интенсивная',
}

export default function EmotionTagSheet({
  state,
  notes,
  listrecs,
  diary,
  allTags,
  onClose,
  onSave,
  onDelete,
}: {
  state: SheetState
  notes: Note[]
  listrecs: ListRecord[]
  diary: Diary
  allTags: EmotionTag[]
  onClose: () => void
  onSave: (tag: EmotionTag, sourceType?: EmotionRecordSource, sourceId?: string) => void
  onDelete?: () => void
}) {
  const [emotion, setEmotion] = useState<EmotionTag['emotion']>(state.initial?.emotion ?? 'joy')
  const [level, setLevel] = useState<1 | 2 | 3>((state.initial?.level as 1 | 2 | 3) ?? 1)
  const [feelings, setFeelings] = useState<EmotionSubItem[]>(state.initial?.feelings ?? [])
  const [sensations, setSensations] = useState<EmotionSubItem[]>(state.initial?.sensations ?? [])
  const [sourceType, setSourceType] = useState<EmotionRecordSource>(state.sourceType ?? 'diary')
  const [sourceId, setSourceId] = useState<string>(state.sourceId ?? todayKey())
  const [date, setDate] = useState(() => {
    const ts = state.initial?.created
    if (!ts) return todayKey()
    return new Date(ts).toISOString().slice(0, 10)
  })

  const mergeOptions = (defaults: string[], userValues: (string | undefined)[]): string[] => {
    const userSet = new Set(userValues.filter(Boolean) as string[])
    const result: string[] = []
    defaults.forEach((d) => {
      if (!result.includes(d)) result.push(d)
    })
    Array.from(userSet)
      .filter((u) => !result.includes(u))
      .sort((a, b) => a.localeCompare(b))
      .forEach((u) => result.push(u))
    return result
  }

  const feelingOptions = useMemo(
    () => mergeOptions(EMOTION_WHEEL[emotion]?.feelings ?? DEFAULT_FEELINGS, allTags.filter((t) => t.emotion === emotion).flatMap((t) => t.feelings?.map((f) => f.name) ?? [])),
    [emotion, allTags],
  )
  const sensationOptions = useMemo(
    () => mergeOptions(EMOTION_WHEEL[emotion]?.sensations ?? DEFAULT_SENSATIONS, allTags.filter((t) => t.emotion === emotion).flatMap((t) => t.sensations?.map((s) => s.name) ?? [])),
    [emotion, allTags],
  )

  const recentRecords = useMemo(() => {
    const items: { type: EmotionRecordSource; id: string; label: string }[] = []
    notes
      .slice()
      .sort((a, b) => b.updated - a.updated)
      .slice(0, 10)
      .forEach((n) => items.push({ type: 'note', id: n.id, label: `Заметка: ${n.title || 'Без названия'}` }))
    listrecs
      .slice()
      .sort((a, b) => b.updated - a.updated)
      .slice(0, 10)
      .forEach((r) => items.push({ type: 'listrec', id: r.id, label: `${r.kind === 'checklist' ? 'Чек-лист' : 'Список'}: ${r.title || 'Без названия'}` }))
    Object.entries(diary)
      .filter(([, d]) => d.text || d.emotion)
      .sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0))
      .slice(0, 10)
      .forEach(([date]) => items.push({ type: 'diary', id: date, label: `Дневник: ${date}` }))
    return items
  }, [notes, listrecs, diary])

  const resetForm = () => {
    setEmotion('joy')
    setLevel(1)
    setFeelings([])
    setSensations([])
  }

  const handleSave = () => {
    const tag: EmotionTag = {
      id: state.tagId ?? uid(),
      emotion,
      level,
      feelings: feelings.length ? feelings : undefined,
      sensations: sensations.length ? sensations : undefined,
      created: new Date(date + 'T00:00:00').getTime(),
    }
    onSave(tag, sourceType, sourceId)
    if (state.mode === 'edit') {
      onClose()
    } else {
      resetForm()
      setDate(todayKey())
    }
  }

  const isDark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'tg-dark'

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl overflow-hidden fadein"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderBottom: 'none', maxHeight: '85dvh', overflowY: 'auto', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      >
        <div className="sticky top-0 z-10 px-4 pt-3 pb-2" style={{ background: 'var(--surface)' }}>
          <div className="grid place-items-center pb-2">
            <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
          </div>
          <div className="flex items-center justify-between">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--light)' }}>
              {state.mode === 'edit' ? 'Редактировать эмоцию' : 'Новая эмоция'}
            </h2>
            <button onClick={onClose} className="p-1">
              <X size={18} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
            </button>
          </div>
        </div>

        <div className="px-4 space-y-4">
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
              Запись-источник
            </label>
            <select
              value={`${sourceType}:${sourceId}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split(':') as [EmotionRecordSource, string]
                setSourceType(type)
                setSourceId(id)
              }}
              className="w-full rounded-xl px-3 py-2 outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
            >
              <option value={`diary:${todayKey()}`}>Дневник на сегодня</option>
              {recentRecords.map((r) => (
                <option key={`${r.type}:${r.id}`} value={`${r.type}:${r.id}`}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
              Дата
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2 outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
            />
          </div>

          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
              Эмоция
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PLUTCHIK_EMOTIONS.map((e) => {
                const active = emotion === e
                const color = plutchikColor(e, isDark)
                return (
                  <button
                    key={e}
                    onClick={() => setEmotion(e)}
                    className="rounded-xl py-2 text-center"
                    style={{
                      background: active ? color : 'var(--surface-2)',
                      border: `1.5px solid ${active ? color : 'var(--line)'}`,
                      color: active ? (e === 'joy' || e === 'surprise' ? '#000' : '#fff') : 'var(--text)',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {emotionName(e)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
              Уровень
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className="rounded-xl py-2"
                  style={{
                    background: level === l ? 'var(--accent)' : 'var(--surface-2)',
                    color: level === l ? 'var(--on-fill)' : 'var(--muted)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: level === l ? '1px solid var(--accent)' : '1px solid var(--line)',
                  }}
                >
                  {l} · {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <SubItemInput
            label="Чувства"
            values={feelings}
            onChange={setFeelings}
            options={feelingOptions}
            placeholder="Какое чувство?"
          />

          <SubItemInput
            label="Ощущения в теле"
            values={sensations}
            onChange={setSensations}
            options={sensationOptions}
            placeholder="Где и что чувствуешь?"
          />

          <div className="flex gap-2 pt-2">
            {state.mode === 'edit' && onDelete && (
              <button
                onClick={() => {
                  if (window.confirm('Удалить тег?')) {
                    onDelete()
                    onClose()
                  }
                }}
                className="flex-none px-4 py-2.5 rounded-xl"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
              >
                <Trash2 size={18} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}
            >
              {state.mode === 'edit' ? 'Отмена' : 'Готово'}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl"
              style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 14, fontWeight: 600 }}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const buildLevelGradient = () => {
  const stops: string[] = []
  for (let i = 0; i <= 12; i++) {
    const color = valueHex(false, i)
    const start = i === 0 ? 0 : ((i - 0.5) / 12) * 100
    const end = i === 12 ? 100 : ((i + 0.5) / 12) * 100
    stops.push(`${color} ${start.toFixed(2)}%`)
    stops.push(`${color} ${end.toFixed(2)}%`)
  }
  return `linear-gradient(to right, ${stops.join(', ')})`
}

function LevelSlider({ value, onChange, aria }: { value: number; onChange: (v: number) => void; aria: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const trackBg = useMemo(() => buildLevelGradient(), [])
  const color = valueHex(false, value)

  const updateFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = Math.max(0, Math.min(12, Math.round(((clientX - rect.left) / rect.width) * 12)))
    if (next !== value) onChange(next)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
    updateFromClientX(e.clientX)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (dragging) updateFromClientX(e.clientX)
  }
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={aria}
      aria-valuemin={0}
      aria-valuemax={12}
      aria-valuenow={value}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="relative select-none rounded-md overflow-hidden"
      style={{
        height: 14,
        background: trackBg,
        cursor: 'pointer',
        touchAction: 'none',
      }}
    >
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: 0,
          width: `${(value / 12) * 100}%`,
          background: 'rgba(255,255,255,0.25)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: 1,
          width: 12,
          height: 12,
          left: `${(value / 12) * 100}%`,
          transform: 'translateX(-50%)',
          background: color,
          border: '2px solid var(--surface)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}

function SubItemInput({
  label,
  values,
  onChange,
  options,
  placeholder,
}: {
  label: string
  values: EmotionSubItem[]
  onChange: (v: EmotionSubItem[]) => void
  options: string[]
  placeholder: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)

  const add = (v: string) => {
    const trimmed = v.trim()
    if (!trimmed) return
    if (!values.some((x) => x.name === trimmed)) onChange([...values, { name: trimmed, level: 6 }])
    setInput('')
  }

  const remove = (name: string) => onChange(values.filter((x) => x.name !== name))
  const setLevel = (name: string, level: number) =>
    onChange(values.map((x) => (x.name === name ? { ...x, level: Math.max(0, Math.min(12, level)) } : x)))

  const names = useMemo(() => values.map((v) => v.name), [values])
  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (!q) return options.slice(0, 16)
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 16)
  }, [input, options])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
        {label}
      </label>
      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] rounded-xl px-3 py-2"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
      >
        {values.map((v) => (
          <span
            key={v.name}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 12, color: 'var(--text)' }}
          >
            {v.name} · {v.level}
            <button onClick={() => remove(v.name)} className="leading-none" style={{ color: 'var(--muted)' }}>
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(input)
            }
          }}
          placeholder={values.length ? '' : placeholder}
          className="flex-1 min-w-[80px] bg-transparent outline-none"
          style={{ color: 'var(--light)', fontSize: 13 }}
        />
      </div>

      {values.length > 0 && (
        <div className="space-y-3 mt-2">
          {values.map((v) => (
            <div key={`level-${v.name}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="flex-1 min-w-0 truncate" style={{ fontSize: 12, color: 'var(--text)' }}>
                  {v.name}
                </span>
                <span
                  className="flex-none px-1.5 rounded"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: valueHex(false, v.level),
                    color: '#fff',
                  }}
                >
                  {v.level}
                </span>
              </div>
              <LevelSlider value={v.level} onChange={(l) => setLevel(v.name, l)} aria={v.name} />
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl overflow-hidden"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
        >
          {filtered.length > 0 ? (
            <div className="p-2 flex flex-wrap gap-1.5">
              {filtered.map((o) => {
                const selected = names.includes(o)
                return (
                  <button
                    key={o}
                    onClick={() => add(o)}
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      background: selected ? 'var(--accent)' : 'var(--surface)',
                      border: selected ? '1px solid var(--accent)' : '1px solid var(--line)',
                      fontSize: 12,
                      color: selected ? 'var(--on-fill)' : 'var(--text)',
                      opacity: selected ? 0.85 : 1,
                    }}
                  >
                    {selected ? '✓ ' : ''}{o}
                  </button>
                )
              })}
            </div>
          ) : input.trim() ? (
            <button
              onClick={() => add(input)}
              className="w-full px-3 py-2 text-left"
              style={{ fontSize: 13, color: 'var(--text)' }}
            >
              Добавить «{input.trim()}»
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
