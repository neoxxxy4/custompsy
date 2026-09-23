import { useRef, useState, type ReactNode } from 'react'

// ─── toast ───

export function useToast(): { show: (msg: string) => void; node: ReactNode } {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = (m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 1800)
  }
  const node = msg && (
    <div
      className="fixed left-1/2 bottom-24 z-[70] px-4 py-2 rounded-full fadein"
      style={{
        transform: 'translateX(-50%)',
        background: 'var(--surface-2)',
        border: '1px solid var(--line)',
        color: 'var(--light)',
        fontSize: 12,
        fontFamily: 'var(--font-body)',
      }}
    >
      {msg}
    </div>
  )
  return { show, node }
}

// ─── dates ───

const MO_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
export const MO_FULL = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

export function fmtWhen(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const yest = new Date(now); yest.setDate(now.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return 'Вчера'
  return `${d.getDate()} ${MO_SHORT[d.getMonth()]}`
}
