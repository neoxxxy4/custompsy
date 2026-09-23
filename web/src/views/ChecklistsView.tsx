import { useState } from 'react'
import ChecklistsTab from './practice/ChecklistsTab'
import NotesTab from './practice/NotesTab'
import DiaryTab from './practice/DiaryTab'

type Tab = 'lists' | 'notes' | 'diary'

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'lists', label: 'Чек-листы', desc: 'копии дня из шаблонов' },
  { id: 'notes', label: 'Заметки', desc: 'папки внешней памяти' },
  { id: 'diary', label: 'Дневник', desc: 'рефлексия по датам' },
]

export default function ChecklistsView({ initialTab = 'lists' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-10">
      <div className="rise flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mono-label mb-2">Модуль 03</p>
          <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>Практика</h2>
        </div>
        <p className="mono-label max-w-xs" style={{ lineHeight: 1.8 }}>
          Порядок — это заранее принятые решения. Всё, что не в ОЗУ, — во внешней памяти.
        </p>
      </div>

      {/* tabs */}
      <div className="rise mt-8 mb-6 flex gap-1 glass rounded-md p-1 w-fit" style={{ animationDelay: '60ms' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 rounded-sm text-left transition-all"
            style={{
              background: tab === t.id ? 'var(--active-bg)' : 'transparent',
            }}
          >
            <span
              className="block"
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: tab === t.id ? 'var(--light)' : 'var(--muted)',
              }}
            >
              {t.label}
            </span>
            <span className="mono-label block mt-0.5" style={{ fontSize: 8 }}>{t.desc}</span>
          </button>
        ))}
      </div>

      <div key={tab} className="fadein">
        {tab === 'lists' && <ChecklistsTab />}
        {tab === 'notes' && <NotesTab />}
        {tab === 'diary' && <DiaryTab />}
      </div>
    </div>
  )
}
