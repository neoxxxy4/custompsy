import { useRef, useState } from 'react'

// голосовой ввод через Web Speech API (ru-RU): текст пишется в onText по мере распознавания
export function useVoiceInput(onText: (t: string) => void, onError: (msg: string) => void) {
  const [listening, setListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (globalThis.window as any).SpeechRecognition ?? (globalThis.window as any).webkitSpeechRecognition
    if (!SR) {
      onError('голосовой ввод не поддерживается здесь — открой в Chrome на телефоне')
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
  }

  return { listening, startVoice }
}
