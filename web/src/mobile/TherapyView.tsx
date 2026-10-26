import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import ActionSheet from './ActionSheet'

const CATEGORIES = [
  { id: 'trauma', label: 'Травма', color: '#ef4444' },
  { id: 'offense', label: 'Обида', color: '#f97316' },
  { id: 'shame', label: 'Стыд', color: '#eab308' },
  { id: 'guilt', label: 'Вина', color: '#8b5cf6' },
  { id: 'fear', label: 'Страх', color: '#06b6d4' },
  { id: 'anger', label: 'Гнев', color: '#ec4899' },
  { id: 'other', label: 'Другое', color: 'var(--muted)' },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

interface TherapyNote {
  id: string
  text: string
  category: CategoryId
  ts: number
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const safeDate = (d?: string | null): string => {
  if (!d || !DATE_RE.test(d)) return '—'
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

export default function TherapyView() {
  const [notes, setNotes] = useLS<TherapyNote[]>('aod4-therapy-notes', [])
  const [noteSheet, setNoteSheet] = useState<TherapyNote | null>(null)
  const [draft, setDraft] = useState('')
  const [category, setCategory] = useState<CategoryId>('other')

  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    setNotes((ns) => [{ id: uid(), text, category, ts: Date.now() }, ...ns])
    setDraft('')
    setCategory('other')
  }

  const deleteNote = (id: string) => setNotes((ns) => ns.filter((n) => n.id !== id))

  const dateStr = (ts: number) => safeDate(new Date(ts).toISOString().slice(0, 10))

  const grouped = useMemo(() => {
    const map: Record<CategoryId, TherapyNote[]> = {
      trauma: [], offense: [], shame: [], guilt: [], fear: [], anger: [], other: [],
    }
    notes.forEach((n) => { map[n.category].push(n) })
    return CATEGORIES.map((c) => ({ ...c, items: map[c.id] })).filter((g) => g.items.length > 0)
  }, [notes])

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Терапия
      </h1>
      <p className="mt-1" style={{ fontSize: 13, color: 'var(--muted)' }}>
        Травмирующие ситуации, обиды, стыд, вина и другие темы
      </p>

      <section className="mt-4 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex gap-1 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="flex-none rounded-full px-3 py-1"
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: category === c.id ? c.color : 'var(--surface-2)',
                color: category === c.id ? '#fff' : 'var(--text)',
                border: '1px solid var(--line)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNote() }}
            placeholder="Новая ситуация..."
            className="flex-1 min-w-0 rounded-xl px-3 outline-none"
            style={{ height: 40, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button
            onClick={addNote}
            className="flex-none grid place-items-center rounded-xl"
            style={{ width: 40, height: 40, background: 'var(--accent)', color: 'var(--on-fill)' }}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>
      </section>

      <div className="mt-3 space-y-3">
        {notes.length === 0 && (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Пока нет записей</p>
          </div>
        )}
        {grouped.map((g) => (
          <div key={g.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{g.label}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.items.length}</span>
            </div>
            {g.items.map((n, idx) => (
              <button
                key={n.id}
                onClick={() => setNoteSheet(n)}
                className="w-full text-left px-3 py-2.5"
                style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--line)' }}
              >
                <span className="block" style={{ fontSize: 13, color: 'var(--text)' }}>{n.text}</span>
                <span className="block mt-1" style={{ fontSize: 11, color: 'var(--muted)' }}>{dateStr(n.ts)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {noteSheet && (
        <ActionSheet
          title={noteSheet.text || 'Заметка'}
          onClose={() => setNoteSheet(null)}
          onDelete={() => { deleteNote(noteSheet.id); setNoteSheet(null) }}
        />
      )}
    </div>
  )
}
