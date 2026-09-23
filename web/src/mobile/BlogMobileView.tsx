import { useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, PenLine, Plus, Rocket, type LucideIcon } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import { ScreenHeader, Tile } from './ui'
import { fmtWhen } from './utils'

// та же форма, что в десктопном BlogView (+ опциональный draft)
interface BlogPost {
  id: string
  ts: number
  title: string
  text: string
  draft?: boolean
}

const TILES: { icon: LucideIcon; color: string }[] = [
  { icon: PenLine, color: 'var(--f-metacog)' },
  { icon: Rocket, color: 'var(--f-emotions)' },
  { icon: BookOpen, color: 'var(--f-neuro)' },
]

export default function BlogMobileView() {
  const [posts, setPosts] = useLS<BlogPost[]>('aod2-blog', [])
  // null — список; 'new' или id поста — редактор
  const [editing, setEditing] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [isNew, setIsNew] = useState(true)

  const published = useMemo(() => posts.filter((p) => !p.draft), [posts])
  const drafts = useMemo(() => posts.filter((p) => p.draft), [posts])

  const openEditor = (p?: BlogPost) => {
    setIsNew(!p)
    setEditing(p ? p.id : 'new')
    setDraftTitle(p?.title ?? '')
    setDraftText(p?.text ?? '')
  }

  const save = (asDraft: boolean) => {
    if (!draftText.trim()) return
    if (isNew) {
      setPosts((ps) => [{ id: uid(), ts: Date.now(), title: draftTitle.trim(), text: draftText.trim(), draft: asDraft }, ...ps])
    } else {
      setPosts((ps) => ps.map((p) => (p.id === editing ? { ...p, title: draftTitle.trim(), text: draftText.trim(), draft: asDraft } : p)))
    }
    setEditing(null)
  }

  const remove = () => {
    if (isNew || !window.confirm('Удалить пост?')) return
    setPosts((ps) => ps.filter((p) => p.id !== editing))
    setEditing(null)
  }

  // ─── редактор (полноэкранный) ───
  if (editing !== null) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col fadein" style={{ background: 'var(--bg)' }}>
        <header
          className="flex-none flex items-center gap-2 px-2 h-14"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <button onClick={() => setEditing(null)} className="p-2" title="Назад">
            <ArrowLeft size={22} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
          </button>
          <span className="flex-1 text-center" style={{ fontSize: 16, fontWeight: 600, color: 'var(--light)' }}>
            {isNew ? 'Новый пост' : 'Редактирование'}
          </span>
          {!isNew && (
            <button onClick={remove} className="px-2" style={{ fontSize: 13, color: 'var(--muted)' }}>
              Удалить
            </button>
          )}
          <button
            onClick={() => save(false)}
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', opacity: draftText.trim() ? 1 : 0.4 }}
          >
            {isNew ? 'Опубликовать' : 'Сохранить'}
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Заголовок (необязательно)"
            className="w-full bg-transparent outline-none"
            style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: 'var(--light)' }}
          />
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={'Текст поста…\n\nАбзацы сохранятся. #теги подсветятся в десктопной версии.'}
            className="w-full bg-transparent outline-none resize-none mt-4"
            style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)', minHeight: 320 }}
          />
          {isNew && (
            <button
              onClick={() => save(true)}
              className="mt-2 px-4 py-2 rounded-full"
              style={{ border: '1px solid var(--line-strong)', fontSize: 13, color: 'var(--muted)', opacity: draftText.trim() ? 1 : 0.4 }}
            >
              В черновики
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── список ───
  return (
    <div className="px-4 pt-5 pb-36 min-h-screen">
      <ScreenHeader
        title="Блог"
        right={
          <button onClick={() => openEditor()} className="p-1" title="Новый пост">
            <PenLine size={20} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
          </button>
        }
      />

      {/* статус-тайлы */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {[
          [String(published.length), 'постов'],
          ['—', 'просмотров'],
          [String(drafts.length), drafts.length === 1 ? 'черновик' : 'черновика'],
        ].map(([n, label]) => (
          <div
            key={label}
            className="rounded-2xl py-4 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{n}</p>
            <p className="mt-0.5" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <p className="mono-label mb-3">Публикации</p>

      <div className="space-y-2.5">
        {posts.length === 0 && (
          <p className="py-10 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
            Пока пусто — напиши первый пост через +
          </p>
        )}
        {posts.map((p, i) => {
          const tile = TILES[i % TILES.length]
          return (
            <button
              key={p.id}
              onClick={() => openEditor(p)}
              className="w-full rounded-2xl p-3.5 text-left"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            >
              <span className="flex items-start gap-3">
                <Tile icon={tile.icon} color={tile.color} size={44} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className="truncate" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
                      {p.title || 'Без названия'}
                    </span>
                    {p.draft && (
                      <span
                        className="flex-none px-2 py-0.5 rounded-md"
                        style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                      >
                        ЧЕРНОВИК
                      </span>
                    )}
                  </span>
                  <span className="block mt-1 line-clamp-2" style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--muted)' }}>
                    {p.text}
                  </span>
                </span>
              </span>
              <span className="block text-right mt-2" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {fmtWhen(p.ts)}
              </span>
            </button>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => openEditor()}
        className="fixed right-4 z-40 grid place-items-center rounded-full"
        style={{
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          width: 56, height: 56,
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
        title="Новый пост"
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </div>
  )
}
