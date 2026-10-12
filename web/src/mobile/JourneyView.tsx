import { Settings } from 'lucide-react'
import type { MTab } from './navConfig'

export default function JourneyView({ go }: { go: (t: MTab) => void }) {
  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <div className="flex items-start justify-between gap-3">
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
          Путь
        </h1>
        <button
          onClick={() => go('settings')}
          className="p-2 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}
        >
          <Settings size={18} strokeWidth={1.8} />
        </button>
      </div>
      <div className="mt-6 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Здесь будет новый вид пути.
        </p>
      </div>
    </div>
  )
}
