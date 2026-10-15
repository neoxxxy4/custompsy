import { useMemo, useState } from 'react'
import { Plus, Users, X } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import SocialGraph from './SocialGraph'
import {
  SOCIAL_LAYERS,
  THINKING_TYPES,
  type Person,
  type SocialSet,
  type SocialTag,
  type SocialLayer,
  type ThinkingType,
} from './socialTypes'

const DEFAULT_TAGS: SocialTag[] = [
  { id: 'work', name: 'работа', color: '#ef4444' },
  { id: 'sport', name: 'спорт', color: '#22c55e' },
  { id: 'game', name: 'игра', color: '#f97316' },
]

const DEFAULT_SETS: SocialSet[] = [
  { id: 'family', name: 'Семья', color: '#ec4899' },
  { id: 'team', name: 'Команда', color: '#06b6d4' },
]

const PEOPLE_KEY = 'aod4-social-people'
const SETS_KEY = 'aod4-social-sets'
const TAGS_KEY = 'aod4-social-tags'

type ViewMode = 'graph' | 'list' | 'sets'

export default function SocialView() {
  const [people, setPeople] = useLS<Person[]>(PEOPLE_KEY, [])
  const [sets, setSets] = useLS<SocialSet[]>(SETS_KEY, DEFAULT_SETS)
  const [tags, setTags] = useLS<SocialTag[]>(TAGS_KEY, DEFAULT_TAGS)

  const [view, setView] = useState<ViewMode>('graph')
  const [filterLayer, setFilterLayer] = useState<SocialLayer | 'all'>('all')
  const [filterType, setFilterType] = useState<ThinkingType | 'all'>('all')
  const [filterSet, setFilterSet] = useState<string | 'all'>('all')
  const [personSheet, setPersonSheet] = useState<Person | null>(null)
  const [setSheet, setSetSheet] = useState<SocialSet | null>(null)

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (filterLayer !== 'all' && p.layer !== filterLayer) return false
      if (filterType !== 'all' && p.thinkingType !== filterType) return false
      if (filterSet !== 'all' && !p.setIds.includes(filterSet)) return false
      return true
    })
  }, [people, filterLayer, filterType, filterSet])

  const addPerson = (person: Omit<Person, 'id'>) => {
    setPeople((prev) => [...prev, { ...person, id: uid() }])
  }

  const updatePerson = (id: string, patch: Partial<Person>) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const removePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id))
  }

  const addSet = (name: string, color: string) => {
    setSets((prev) => [...prev, { id: uid(), name, color }])
  }

  const updateSet = (id: string, patch: Partial<SocialSet>) => {
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const removeSet = (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id))
    setPeople((prev) => prev.map((p) => ({ ...p, setIds: p.setIds.filter((sid) => sid !== id) })))
  }

  const addTag = (name: string, color: string) => {
    setTags((prev) => [...prev, { id: uid(), name, color }])
  }

  const removeTag = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id))
    setPeople((prev) => prev.map((p) => ({ ...p, tags: p.tags.filter((tid) => tid !== id) })))
  }

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
          Социум
        </h1>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          <Users size={14} className="inline mr-1" />
          {people.length}
        </span>
      </div>

      <div
        className="flex gap-1 rounded-xl p-1 mt-4 mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        {([
          { id: 'graph', label: 'Граф' },
          { id: 'list', label: 'Список' },
          { id: 'sets', label: 'Множества' },
        ] as { id: ViewMode; label: string }[]).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className="flex-1 rounded-lg py-1.5"
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: view === v.id ? 'var(--accent)' : 'transparent',
              color: view === v.id ? 'var(--on-fill)' : 'var(--muted)',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view !== 'sets' && (
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
          <select
            value={filterLayer}
            onChange={(e) => setFilterLayer(e.target.value as SocialLayer | 'all')}
            className="flex-none rounded-xl px-2 py-1.5 outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}
          >
            <option value="all">Все слои</option>
            {SOCIAL_LAYERS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ThinkingType | 'all')}
            className="flex-none rounded-xl px-2 py-1.5 outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}
          >
            <option value="all">Все типы</option>
            {(Object.keys(THINKING_TYPES) as ThinkingType[]).map((t) => (
              <option key={t} value={t}>{THINKING_TYPES[t].label}</option>
            ))}
          </select>
          <select
            value={filterSet}
            onChange={(e) => setFilterSet(e.target.value)}
            className="flex-none rounded-xl px-2 py-1.5 outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}
          >
            <option value="all">Все множества</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {view === 'graph' && (
        <SocialGraph people={filteredPeople} sets={sets} tags={tags} />
      )}

      {view === 'list' && (
        <PeopleList
          people={filteredPeople}
          tags={tags}
          onEdit={setPersonSheet}
          onDelete={removePerson}
        />
      )}

      {view === 'sets' && (
        <SetsView
          sets={sets}
          tags={tags}
          people={people}
          onAddSet={addSet}
          onUpdateSet={updateSet}
          onRemoveSet={removeSet}
          onAddTag={addTag}
          onRemoveTag={removeTag}
        />
      )}

      <button
        onClick={() =>
          setPersonSheet({
            id: '',
            name: '',
            layer: 'friends',
            thinkingType: 'centrist',
            tags: [],
            setIds: [],
          })
        }
        className="fixed bottom-20 right-4 z-30 grid place-items-center rounded-full shadow-lg"
        style={{ width: 52, height: 52, background: 'var(--accent)', color: 'var(--on-fill)' }}
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {personSheet && (
        <PersonSheet
          person={personSheet}
          sets={sets}
          tags={tags}
          onSave={(p) => {
            if (p.id) updatePerson(p.id, p)
            else addPerson(p)
            setPersonSheet(null)
          }}
          onDelete={() => {
            if (personSheet.id) removePerson(personSheet.id)
            setPersonSheet(null)
          }}
          onClose={() => setPersonSheet(null)}
        />
      )}

      {setSheet && (
        <SetSheet
          set={setSheet}
          onSave={(s) => {
            if (s.id) updateSet(s.id, s)
            setSetSheet(null)
          }}
          onDelete={() => {
            if (setSheet.id) removeSet(setSheet.id)
            setSetSheet(null)
          }}
          onClose={() => setSetSheet(null)}
        />
      )}
    </div>
  )
}

function PeopleList({
  people,
  tags,
  onEdit,
  onDelete,
}: {
  people: Person[]
  tags: SocialTag[]
  onEdit: (p: Person) => void
  onDelete: (id: string) => void
}) {
  const byLayer = useMemo(() => {
    const map: Record<SocialLayer, Person[]> = {
      core: [], close: [], friends: [], mates: [], known: [], contacts: [], crowd: [],
    }
    people.forEach((p) => map[p.layer].push(p))
    return map
  }, [people])

  return (
    <div className="space-y-4">
      {SOCIAL_LAYERS.map((layer) => {
        const list = byLayer[layer.id]
        if (list.length === 0) return null
        return (
          <div key={layer.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{layer.label}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{list.length}/{layer.limit}</span>
            </div>
            {list.map((p, idx) => (
              <div
                key={p.id}
                className="px-3 py-2 flex items-center gap-2"
                style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--line)' }}
              >
                <button onClick={() => onEdit(p)} className="flex-1 text-left">
                  <span style={{ fontSize: 14, color: 'var(--light)' }}>{p.name}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span
                      className="px-1.5 py-0.5 rounded-full"
                      style={{ fontSize: 10, background: THINKING_TYPES[p.thinkingType].color, color: '#fff' }}
                    >
                      {THINKING_TYPES[p.thinkingType].label}
                    </span>
                    {p.tags.map((tid) => {
                      const tag = tags.find((t) => t.id === tid)
                      if (!tag) return null
                      return (
                        <span key={tid} className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, background: tag.color, color: '#fff' }}>
                          {tag.name}
                        </span>
                      )
                    })}
                  </div>
                </button>
                <button onClick={() => onDelete(p.id)} style={{ color: 'var(--muted)' }}>
                  <X size={16} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )
      })}
      {people.length === 0 && (
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Пока никого не добавлено</p>
        </div>
      )}
    </div>
  )
}

function SetsView({
  sets,
  tags,
  people,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onAddTag,
  onRemoveTag,
}: {
  sets: SocialSet[]
  tags: SocialTag[]
  people: Person[]
  onAddSet: (name: string, color: string) => void
  onUpdateSet: (id: string, patch: Partial<SocialSet>) => void
  onRemoveSet: (id: string) => void
  onAddTag: (name: string, color: string) => void
  onRemoveTag: (id: string) => void
}) {
  const [newSetName, setNewSetName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 className="mb-3" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Множества</h2>
        <div className="space-y-2">
          {sets.map((s) => {
            const count = people.filter((p) => p.setIds.includes(s.id)).length
            return (
              <div key={s.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <input
                  value={s.name}
                  onChange={(e) => onUpdateSet(s.id, { name: e.target.value })}
                  className="flex-1 min-w-0 rounded-lg px-2 py-1 outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{count}</span>
                <button onClick={() => onRemoveSet(s.id)} style={{ color: 'var(--muted)' }}>
                  <X size={14} strokeWidth={1.8} />
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="Новое множество..."
            className="flex-1 min-w-0 rounded-xl px-3 py-1.5 outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button
            onClick={() => {
              if (!newSetName.trim()) return
              onAddSet(newSetName.trim(), colors[sets.length % colors.length])
              setNewSetName('')
            }}
            className="px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)' }}
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 className="mb-3" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Ярлыки</h2>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
              style={{ background: t.color, color: '#fff', fontSize: 12 }}
            >
              {t.name}
              <button onClick={() => onRemoveTag(t.id)} style={{ color: '#fff' }}>
                <X size={12} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Новый ярлык..."
            className="flex-1 min-w-0 rounded-xl px-3 py-1.5 outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button
            onClick={() => {
              if (!newTagName.trim()) return
              onAddTag(newTagName.trim(), colors[tags.length % colors.length])
              setNewTagName('')
            }}
            className="px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)' }}
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

function PersonSheet({
  person,
  sets,
  tags,
  onSave,
  onDelete,
  onClose,
}: {
  person: Person
  sets: SocialSet[]
  tags: SocialTag[]
  onSave: (p: Person) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Person>({ ...person })

  const toggleTag = (id: string) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(id) ? d.tags.filter((tid) => tid !== id) : [...d.tags, id],
    }))
  }

  const toggleSet = (id: string) => {
    setDraft((d) => ({
      ...d,
      setIds: d.setIds.includes(id) ? d.setIds.filter((sid) => sid !== id) : [...d.setIds, id],
    }))
  }

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderBottom: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid place-items-center pb-3">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>

        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Имя"
          className="w-full rounded-xl px-3 py-2 mb-3 outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 15 }}
        />

        <p className="mb-1" style={{ fontSize: 12, color: 'var(--muted)' }}>Слой Данбара</p>
        <div className="grid grid-cols-2 gap-1 mb-3">
          {SOCIAL_LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setDraft((d) => ({ ...d, layer: l.id }))}
              className="rounded-lg py-1.5"
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: draft.layer === l.id ? 'var(--accent)' : 'var(--surface-2)',
                color: draft.layer === l.id ? 'var(--on-fill)' : 'var(--muted)',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <p className="mb-1" style={{ fontSize: 12, color: 'var(--muted)' }}>Тип мышления</p>
        <div className="flex gap-1 mb-3">
          {(Object.keys(THINKING_TYPES) as ThinkingType[]).map((t) => (
            <button
              key={t}
              onClick={() => setDraft((d) => ({ ...d, thinkingType: t }))}
              className="flex-1 rounded-lg py-1.5"
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: draft.thinkingType === t ? THINKING_TYPES[t].color : 'var(--surface-2)',
                color: draft.thinkingType === t ? '#fff' : 'var(--muted)',
              }}
            >
              {THINKING_TYPES[t].label}
            </button>
          ))}
        </div>

        <p className="mb-1" style={{ fontSize: 12, color: 'var(--muted)' }}>Множества</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {sets.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleSet(s.id)}
              className="px-2 py-1 rounded-full"
              style={{
                fontSize: 11,
                background: draft.setIds.includes(s.id) ? s.color : 'var(--surface-2)',
                color: draft.setIds.includes(s.id) ? '#fff' : 'var(--muted)',
                border: '1px solid var(--line)',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        <p className="mb-1" style={{ fontSize: 12, color: 'var(--muted)' }}>Ярлыки</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTag(t.id)}
              className="px-2 py-1 rounded-full"
              style={{
                fontSize: 11,
                background: draft.tags.includes(t.id) ? t.color : 'var(--surface-2)',
                color: draft.tags.includes(t.id) ? '#fff' : 'var(--muted)',
                border: '1px solid var(--line)',
              }}
            >
              {t.name}
            </button>
          ))}
        </div>

        <p className="mb-1" style={{ fontSize: 12, color: 'var(--muted)' }}>Последний контакт</p>
        <input
          type="date"
          value={draft.lastContact ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, lastContact: e.target.value || undefined }))}
          className="w-full rounded-xl px-3 py-2 mb-3 outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 14 }}
        />

        <textarea
          value={draft.note ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
          placeholder="Заметка"
          rows={3}
          className="w-full rounded-xl px-3 py-2 mb-4 outline-none resize-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 14 }}
        />

        <button
          onClick={() => onSave(draft)}
          className="w-full py-3 rounded-xl mb-2"
          style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 14, fontWeight: 600 }}
        >
          Сохранить
        </button>

        {person.id && (
          <button
            onClick={onDelete}
            className="w-full py-3 rounded-xl"
            style={{ background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 600 }}
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  )
}

function SetSheet({
  set,
  onSave,
  onDelete,
  onClose,
}: {
  set: SocialSet
  onSave: (s: SocialSet) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<SocialSet>({ ...set })
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderBottom: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid place-items-center pb-3">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>

        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Название множества"
          className="w-full rounded-xl px-3 py-2 mb-3 outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 15 }}
        />

        <p className="mb-2" style={{ fontSize: 12, color: 'var(--muted)' }}>Цвет</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setDraft((d) => ({ ...d, color: c }))}
              className="rounded-full"
              style={{
                width: 28,
                height: 28,
                background: c,
                boxShadow: draft.color === c ? '0 0 0 2px var(--light)' : 'none',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => onSave(draft)}
          className="w-full py-3 rounded-xl mb-2"
          style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 14, fontWeight: 600 }}
        >
          Сохранить
        </button>

        {set.id && (
          <button
            onClick={onDelete}
            className="w-full py-3 rounded-xl"
            style={{ background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 600 }}
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  )
}
