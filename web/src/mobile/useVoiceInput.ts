import { useRef, useState } from 'react'

// голосовой ввод:
// 1) Web Speech API (Chrome) — распознаёт прямо в браузере, бесплатно
// 2) фолбэк для WebView/APK: запись через MediaRecorder → наш /api/stt (Yandex SpeechKit)
export function useVoiceInput(onText: (t: string) => void, onError: (msg: string) => void) {
  const [listening, setListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)
  const mediaRef = useRef<{ rec: MediaRecorder; chunks: Blob[] } | null>(null)

  const startVoice = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (globalThis.window as any).SpeechRecognition ?? (globalThis.window as any).webkitSpeechRecognition
    if (SR) {
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
        onText(text)
      }
      rec.onend = () => setListening(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (e: any) => {
        setListening(false)
        onError(`голосовой ввод не сработал (${e?.error ?? 'ошибка'}) — проверь микрофон и интернет`)
      }
      recRef.current = rec
      setListening(true)
      rec.start()
      return
    }

    // ─── фолбэк: MediaRecorder → SpeechKit ───
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError('голосовой ввод не поддерживается здесь — открой в Chrome на телефоне')
      return
    }
    if (listening) {
      mediaRef.current?.rec.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks: Blob[] = []
      mediaRef.current = { rec, chunks }
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setListening(false)
        mediaRef.current = null
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
        if (blob.size < 500) { onError('ничего не записалось — говори после включения микрофона'); return }
        try {
          const r = await fetch('/api/stt', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob })
          const data = await r.json().catch(() => null)
          if (!r.ok) throw new Error(data?.error ?? `статус ${r.status}`)
          const text = String(data?.text ?? '').trim()
          if (text) onText(text)
          else onError('не расслышал — попробуй ещё раз')
        } catch (e) {
          onError(`распознавание не сработало (${e instanceof Error ? e.message : 'ошибка'})`)
        }
      }
      rec.onerror = () => {
        setListening(false)
        onError('не смог записать звук с микрофона')
      }
      rec.start()
      setListening(true)
    } catch {
      onError('нет доступа к микрофону — разреши в настройках приложения')
    }
  }

  return { listening, startVoice }
}
