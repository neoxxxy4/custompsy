import { useState } from 'react'
import { uid, useLS } from './practice/store'

interface Post {
  id: string
  ts: number
  title: string
  text: string
}

const SEED: Post[] = [
  {
    id: 'seed-0',
    ts: Date.now(),
    title: 'Нулевой пост',
    text: 'Это блог внутри системы — как канал, только для себя.\n\nПиши посты с датой, разбивай мысли на абзацы, ставь #теги. Черновики архитектуры, фристайл-мысли, разборы — всё сюда.\n\nДанные хранятся в этом браузере.',
  },
]

function fmtDate(ts: number) {
  const d = new Date(ts)
  return `${d.toLocaleDateString('ru-RU')} · ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
}

// подсветка #тегов
function RichText({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/gu)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('#') ? (
          <span key={i} style={{ color: 'var(--accent)' }}>{p}</span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

export default function BlogView() {
  const [posts, setPosts] = useLS<Post[]>('aod2-blog', SEED)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)

  const publish = () => {
    if (!text.trim()) return
    setPosts((ps) => [{ id: uid(), ts: Date.now(), title: title.trim(), text: text.trim() }, ...ps])
    setTitle('')
    setText('')
    setComposerOpen(false)
  }

  const remove = (id: string) => {
    if (window.confirm('Удалить пост?')) setPosts((ps) => ps.filter((p) => p.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-28 pb-10">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label mb-2">Модуль 08 · примитивный блог</p>
          <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>Блог</h2>
        </div>
        <button
          onClick={() => setComposerOpen((v) => !v)}
          className="mono-label-bright px-4 py-2.5 rounded-sm hover:opacity-85 transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {composerOpen ? 'закрыть' : '+ новый пост'}
        </button>
      </div>

      {/* composer */}
      {composerOpen && (
        <div className="fadein panel rounded-md p-6 mt-8">
          <p className="mono-label mb-3">Новый пост · дата проставится автоматически</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок (необязательно) · например, #7 Название"
            className="w-full bg-transparent rounded-sm px-3 py-2.5 text-[14px] outline-none mb-3"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--light)' }}
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Текст поста…\n\nАбзацы сохранятся. #теги подсветятся.'}
            rows={8}
            className="w-full bg-transparent rounded-sm px-3 py-2.5 text-[13.5px] leading-relaxed outline-none resize-y"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--light)', fontFamily: 'var(--font-body)' }}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="mono-label" style={{ fontSize: 8 }}>{text.length} символов</span>
            <button
              onClick={publish}
              className="mono-label-bright px-4 py-2 rounded-sm hover:opacity-85 transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff', opacity: text.trim() ? 1 : 0.4 }}
            >
              Опубликовать
            </button>
          </div>
        </div>
      )}

      {/* feed */}
      <div className="mt-10">
        {posts.length === 0 && (
          <div className="panel rounded-md p-10 text-center rise">
            <p className="mono-label" style={{ lineHeight: 2 }}>Пока пусто. Напиши первый пост.</p>
          </div>
        )}
        {posts.map((p, i) => (
          <article
            key={p.id}
            className="rise panel rounded-md p-7 mb-3"
            style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="mono-label">{fmtDate(p.ts)}</span>
              <button onClick={() => remove(p.id)} className="mono-label hover:opacity-60 transition-opacity">
                удалить
              </button>
            </div>
            {p.title && (
              <h3 className="display mb-3" style={{ fontSize: 26 }}>{p.title}</h3>
            )}
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}
            >
              <RichText text={p.text} />
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
