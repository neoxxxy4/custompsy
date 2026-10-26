import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff, Send, Trash2 } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import { buildAiContext } from './aiContext'
import { runAiActions, type AiActionResult } from './aiActions'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  actions?: AiActionResult[]
}

const HISTORY_LIMIT = 14

export default function TherapyChat() {
  const [messages, setMessages] = useLS<ChatMsg[]>('aod4-therapy-chat', [])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  // сколько разделов данных сейчас уйдёт вместе с сообщением
  const ctxSections = useMemo(() => (buildAiContext().match(/\[/g) ?? []).length, [messages.length])

  // ─── голосовой ввод (Web Speech API) ───
  const [listening, setListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (globalThis.window as any).SpeechRecognition ?? (globalThis.window as any).webkitSpeechRecognition
    if (!SR) {
      setError('голосовой ввод не поддерживается здесь — открой в Chrome на телефоне')
      return
    }
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new SR()
    rec.lang = 'ru-RU'
    rec.interimResults = true
    rec.continuous = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      setDraft(text)
    }
    rec.onend = () => setListening(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      setListening(false)
      setError(`голосовой ввод не сработал (${e?.error ?? 'ошибка'}) — проверь микрофон и интернет`)
    }
    recRef.current = rec
    setListening(true)
    setError(null)
    rec.start()
  }

  // вход по долгому нажатию из «Дня» — сразу слушаем
  useEffect(() => {
    if (globalThis.window.sessionStorage.getItem('aod-aichat-voice') === '1') {
      globalThis.window.sessionStorage.removeItem('aod-aichat-voice')
      startVoice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, busy])

  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setError(null)
    const mine: ChatMsg = { id: uid(), role: 'user', content: text, ts: Date.now() }
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
          context: buildAiContext(),
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

  return (
    <div className="flex flex-col" style={{ minHeight: '60vh' }}>
      <p className="mb-2" style={{ fontSize: 11, color: 'var(--muted)' }}>
        ИИ-помощник (GigaChat) видит данные твоих инструментов. Не заменяет психотерапевта.
        <br />
        {ctxSections > 0 ? (
          <span style={{ color: 'var(--accent)' }}>Данные подключены: разделов {ctxSections}</span>
        ) : (
          <span>Данных в инструментах пока нет — чат без контекста</span>
        )}
      </p>

      <div className="flex-1 space-y-2">
        {messages.length === 0 && (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Расскажите, что произошло или что чувствуете — помогу разобрать
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="rounded-2xl px-3 py-2"
              style={{
                maxWidth: '85%',
                background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                color: m.role === 'user' ? 'var(--on-fill)' : 'var(--text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--line)',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
              {m.actions && (
                <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid var(--line)' }}>
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
            <div className="rounded-2xl px-3 py-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--muted)' }}>
              печатает…
            </div>
          </div>
        )}
        {error && (
          <p className="text-center" style={{ fontSize: 12, color: '#ef4444' }}>
            Ошибка: {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-3 items-center">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex-none grid place-items-center rounded-xl"
            style={{ width: 40, height: 40, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}
            aria-label="Очистить чат"
          >
            <Trash2 size={16} strokeWidth={1.8} />
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder={listening ? 'Говорите…' : 'Написать...'}
          className="flex-1 min-w-0 rounded-xl px-3 outline-none"
          style={{ height: 40, background: 'var(--surface)', border: `1px solid ${listening ? '#ef4444' : 'var(--line)'}`, color: 'var(--light)', fontSize: 13 }}
        />
        <button
          onClick={startVoice}
          className="flex-none grid place-items-center rounded-xl"
          style={{
            width: 40,
            height: 40,
            background: listening ? '#ef4444' : 'var(--surface)',
            border: '1px solid var(--line)',
            color: listening ? '#fff' : 'var(--muted)',
          }}
          aria-label="Голосовой ввод"
        >
          {listening ? <MicOff size={17} strokeWidth={2} /> : <Mic size={17} strokeWidth={2} />}
        </button>
        <button
          onClick={send}
          disabled={busy}
          className="flex-none grid place-items-center rounded-xl"
          style={{ width: 40, height: 40, background: 'var(--accent)', color: 'var(--on-fill)', opacity: busy ? 0.5 : 1 }}
          aria-label="Отправить"
        >
          <Send size={17} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
