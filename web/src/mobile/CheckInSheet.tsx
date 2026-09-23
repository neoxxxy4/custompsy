import { useEffect, useState } from 'react'
import { CloudRain, Smile, Zap } from 'lucide-react'
import type { CheckIn } from '../views/practice/store'

const ROWS = [
  { key: 'mood' as const, label: 'Настроение', Icon: Smile, color: '#4FAE4E' },
  { key: 'energy' as const, label: 'Энергия', Icon: Zap, color: '#eab308' },
  { key: 'anxiety' as const, label: 'Тревога', Icon: CloudRain, color: '#e05555' },
]

// утренний чек-ин: 3 слайдера + одно слово (≈10 секунд)
export default function CheckInSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: CheckIn | null
  onSave: (ci: CheckIn) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [mood, setMood] = useState(initial?.mood ?? 5)
  const [energy, setEnergy] = useState(initial?.energy ?? 5)
  const [anxiety, setAnxiety] = useState(initial?.anxiety ?? 5)
  const [word, setWord] = useState(initial?.word ?? '')

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = () => {
    setExiting(true)
    window.setTimeout(onClose, 220)
  }

  const open = mounted && !exiting
  const values = { mood, energy, anxiety }
  const setters = { mood: setMood, energy: setEnergy, anxiety: setAnxiety }

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        onClick={close}
        className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)', opacity: open ? 1 : 0, transitionDuration: '220ms' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl px-5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderBottom: 'none',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .22s ease-out',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="grid place-items-center pt-3 pb-1">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>
        <p className="text-center" style={{ fontSize: 20, fontWeight: 700, color: 'var(--light)' }}>
          Как ты сейчас?
        </p>
        <p className="text-center mb-4" style={{ fontSize: 12, color: 'var(--muted)' }}>
          10 секунд
        </p>

        {ROWS.map(({ key, label, Icon, color }) => (
          <div
            key={key}
            className="rounded-xl px-3.5 py-3 mb-2.5"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--light)' }}>
                <Icon size={17} strokeWidth={1.8} style={{ color }} />
                {label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>
                {values[key]}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>1</span>
              <input
                type="range"
                min={1}
                max={10}
                value={values[key]}
                className="force-slider flex-1"
                style={{ ['--slider-color' as string]: color }}
                onChange={(e) => setters[key](Number(e.target.value))}
              />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>10</span>
            </div>
          </div>
        ))}

        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="одним словом… (необязательно)"
          className="w-full bg-transparent outline-none rounded-xl px-3.5 py-2.5 mt-1 mb-3"
          style={{ border: '1px solid var(--line)', fontSize: 14, color: 'var(--light)' }}
        />

        <button
          onClick={() => {
            onSave({ mood, energy, anxiety, word: word.trim() || undefined, ts: Date.now() })
            close()
          }}
          className="w-full py-3.5 rounded-xl"
          style={{ background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600 }}
        >
          Готово · +5 XP
        </button>
      </div>
    </div>
  )
}
