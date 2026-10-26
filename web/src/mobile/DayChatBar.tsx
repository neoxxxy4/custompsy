import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Mic, MicOff, Send, Trash2 } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import { buildDayContext } from './aiContext'
import { runAiActions, type AiActionResult } from './aiActions'
import { useVoiceInput } from './useVoiceInput'

// мини-чат дня: свой диалог (aod4-day-chat) и свой контекст (блоки дня + путь).
// отличается от инструмента «ИИ-чат» — тот про терапию и все данные

interface DayMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  actions?: AiActionResult[]
}

const HISTORY_LIMIT = 14

export default function DayChatBar() {
  const [messages, setMessages] = useLS<DayMsg[]>('aod4-day-chat', [])
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { listening, startVoice } = useVoiceInput((t) => { setDraft(t); setOpen(true) }, setError)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, busy, open])

  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setError(null)
    setOpen(true)
    const mine: DayMsg = { id: uid(), role: 'user', content: text, ts: Date.now() }
    const history = [...messages, mine]
    setMessages(history)
    setDraft('')
    setBusy(true)
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-HISTORY_LIMIT).map((m) => ({ role: m.role, content: m.content })),
          context: buildDayContext(),
        }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) throw new Error(data?.error ?? `статус ${r.status}`)
      const { clean, results } = runAiActions(String(data.reply ?? '…'))
      setMessages((ms) => [
        ...ms,
        { id: uid(), role: 'assistant', content: clean || 'Готово.', ts: Date.now(), actions: results.length ? results : undefined },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'нет связи')
    } finally {
      setBusy(false)
    }
  }

  const inputRow = (
    <div className="flex gap-2 items-center">
      {open && messages.length > 0 && (
        <button
          onClick={() => setMessages([])}
          className="flex-none grid place-items-center rounded-xl"
          style={{ width: 36, height: 36, background: 'var(--surface-2)', color: 'var(--muted)' }}
          aria-label="Очистить чат дня"
        >
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') send() }}
        placeholder={listening ? 'Говорите…' : 'Спросить ИИ про день…'}
        className="flex-1 min-w-0 rounded-xl px-3 outline-none"
        style={{
          height: 36,
          background: 'var(--surface-2)',
          border: `1px solid ${listening ? '#ef4444' : 'var(--line)'}`,
          color: 'var(--light)',
          fontSize: 13,
        }}
      />
      <button
        onClick={startVoice}
        className="flex-none grid place-items-center rounded-xl"
        style={{ width: 36, height: 36, background: listening ? '#ef4444' : 'var(--surface-2)', color: listening ? '#fff' : 'var(--muted)' }}
        aria-label="Голосовой ввод"
      >
        {listening ? <MicOff size={15} strokeWidth={2} /> : <Mic size={15} strokeWidth={2} />}
      </button>
      <button
        onClick={send}
        disabled={busy}
        className="flex-none grid place-items-center rounded-xl"
        style={{ width: 36, height: 36, background: 'var(--accent)', color: 'var(--on-fill)', opacity: busy ? 0.5 : 1 }}
        aria-label="Отправить"
      >
        <Send size={15} strokeWidth={2} />
      </button>
    </div>
  )

  return (
    <div className="fixed inset-x-3 bottom-[76px] z-30">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
        {open && (
          <>
            <div className="flex items-center gap-2 px-3 pt-2">
              <span className="flex-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                Чат дня — видит дела на сегодня
              </span>
              <button onClick={() => setOpen(false)} className="grid place-items-center rounded-lg" style={{ width: 24, height: 24, color: 'var(--muted)' }} aria-label="Свернуть">
                <ChevronDown size={15} strokeWidth={2} />
              </button>
            </div>
            <div className="px-3 py-2 space-y-2 overflow-y-auto" style={{ maxHeight: '38vh' }}>
              {messages.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Могу добавить задачу, собрать план на вечер или сказать, что осталось
                </p>
              )}
              {messages.slice(-20).map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="rounded-2xl px-3 py-1.5"
                    style={{
                      maxWidth: '88%',
                      background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                      color: m.role === 'user' ? 'var(--on-fill)' : 'var(--text)',
                      fontSize: 12.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {m.content}
                    {m.actions && (
                      <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--line)' }}>
                        {m.actions.map((a, i) => (
                          <p key={i} style={{ fontSize: 11, color: a.ok ? 'var(--accent)' : '#ef4444' }}>
                            {a.ok ? '✓ ' : '✗ '}{a.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3 py-1.5" style={{ background: 'var(--surface-2)', fontSize: 12.5, color: 'var(--muted)' }}>
                    печатает…
                  </div>
                </div>
              )}
              {error && (
                <p className="text-center" style={{ fontSize: 11, color: '#ef4444' }}>
                  Ошибка: {error}
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          </>
        )}
        <div className="p-2">{inputRow}</div>
      </div>
    </div>
  )
}
