import { useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import { ALL_BELIEFS } from './beliefsData'
import { allNeeds } from './needsData'
import { ROLES, ROLES_KEY, roleById, type RoleEpisode, type RoleId } from './rolesData'

// Инструмент «Роли»: треугольник Карпмана. Фиксируем эпизоды — в какую роль втянуло,
// какая потребность задета, какое убеждение сработало, и договор: как выйти из треугольника.
// Размер узла = сколько раз роль включалась (по эпизодам).

const SIZE = 460
const POS: Record<RoleId, { x: number; y: number }> = {
  persecutor: { x: SIZE / 2, y: 90 },
  rescuer: { x: SIZE - 95, y: SIZE - 105 },
  victim: { x: 95, y: SIZE - 105 },
}

export default function RolesView() {
  const [episodes, setEpisodes] = useLS<RoleEpisode[]>(ROLES_KEY, [])
  const [customNeeds] = useLS<Record<number, string[]>>('aod4-needs-custom', {})
  const [tab, setTab] = useState<'triangle' | 'episodes'>('triangle')
  const [selRole, setSelRole] = useState<RoleId | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // форма нового эпизода
  const [fText, setFText] = useState('')
  const [fRole, setFRole] = useState<RoleId>('victim')
  const [fNeed, setFNeed] = useState('')
  const [fBelief, setFBelief] = useState('')
  const [fAction, setFAction] = useState('')

  const needs = useMemo(() => allNeeds(customNeeds), [customNeeds])
  const countOf = (id: RoleId) => episodes.filter((e) => e.myRole === id).length

  const needText = (id?: string) => needs.find((n) => n.id === id)?.text
  const beliefText = (id?: string) => ALL_BELIEFS.find((b) => b.id === id)?.belief.text

  const saveEpisode = () => {
    const text = fText.trim()
    if (!text) return
    const ep: RoleEpisode = {
      id: uid(),
      ts: Date.now(),
      text,
      myRole: fRole,
      needId: fNeed || undefined,
      beliefId: fBelief || undefined,
      action: fAction.trim() || undefined,
    }
    setEpisodes((es) => [ep, ...es])
    setFText(''); setFNeed(''); setFBelief(''); setFAction('')
    setAddOpen(false)
    setTab('episodes')
  }

  const selectStyle = {
    width: '100%',
    height: 34,
    background: 'var(--surface-2)',
    border: '1px solid var(--line)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 12,
    padding: '0 8px',
    outline: 'none',
  } as const

  // ─── треугольник ───
  const renderTriangle = () => {
    const sel = selRole ? roleById(selRole) : null
    const lastOfSel = selRole ? episodes.find((e) => e.myRole === selRole) : null
    return (
      <>
        <section className="rounded-2xl p-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto block">
            {/* стороны треугольника */}
            {(['victim', 'rescuer', 'persecutor'] as RoleId[]).map((a, i) => {
              const b = (['victim', 'rescuer', 'persecutor'] as RoleId[])[(i + 1) % 3]
              return (
                <line
                  key={a}
                  x1={POS[a].x} y1={POS[a].y} x2={POS[b].x} y2={POS[b].y}
                  stroke="var(--line)" strokeWidth={1.5} strokeDasharray="5 5"
                />
              )
            })}
            {/* подпись в центре */}
            <text x={SIZE / 2} y={SIZE / 2 - 6} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: 'var(--muted)' }}>
              {episodes.length ? `${episodes.length} эпизодов` : 'треугольник'}
            </text>
            <text x={SIZE / 2} y={SIZE / 2 + 12} textAnchor="middle" style={{ fontSize: 9.5, fill: 'var(--muted)', opacity: 0.7 }}>
              роли текучие: из жертвы в преследователя и обратно
            </text>
            {/* узлы ролей */}
            {ROLES.map((r) => {
              const p = POS[r.id]
              const n = countOf(r.id)
              const rad = 30 + Math.min(n, 10) * 2.4
              const isSel = selRole === r.id
              return (
                <g key={r.id} onClick={() => setSelRole(isSel ? null : r.id)} style={{ cursor: 'pointer' }}>
                  <circle cx={p.x} cy={p.y} r={rad + 12} fill="transparent" />
                  <circle
                    cx={p.x} cy={p.y} r={rad}
                    fill={r.color} opacity={n ? 0.9 : 0.35}
                    stroke={isSel ? 'var(--light)' : 'var(--bg)'} strokeWidth={isSel ? 2.5 : 2}
                  />
                  <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                    style={{ fontSize: 16, fontWeight: 700, fill: 'var(--bg)', fontFamily: 'var(--font-mono)' }}>
                    {n || ''}
                  </text>
                  <text x={p.x} y={p.y + rad + 15} textAnchor="middle" pointerEvents="none"
                    style={{ fontSize: 13, fontWeight: 700, fill: r.color }}>
                    {r.name}
                  </text>
                </g>
              )
            })}
          </svg>
        </section>

        {/* карточка роли */}
        {sel && (
          <section className="rounded-2xl mt-2 px-3 py-2.5" style={{ background: 'var(--surface)', border: `1px solid ${sel.color}55` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: sel.color }}>{sel.name}</p>
            <p className="mt-0.5" style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>{sel.motto}</p>
            <div className="mt-2 rounded-lg px-2 py-1.5" style={{ background: 'var(--surface-2)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3 }}>
                ВЫХОД → {sel.exit.toUpperCase()}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text)' }}>{sel.exitText}</p>
            </div>
            {lastOfSel && (
              <p className="mt-2" style={{ fontSize: 11, color: 'var(--muted)' }}>
                последний раз: «{lastOfSel.text.length > 80 ? lastOfSel.text.slice(0, 80) + '…' : lastOfSel.text}»
              </p>
            )}
          </section>
        )}
      </>
    )
  }

  // ─── список эпизодов ───
  const renderEpisodes = () => (
    <div>
      {episodes.length === 0 && (
        <p className="text-center mt-8" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Пока пусто. Поймал себя в треугольнике — жми «+ Эпизод»
        </p>
      )}
      {episodes.map((e) => {
        const r = roleById(e.myRole)
        const nt = needText(e.needId)
        const bt = beliefText(e.beliefId)
        return (
          <section key={e.id} className="rounded-2xl mb-2 px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2">
              <span className="flex-none rounded-md px-1.5 py-0.5" style={{ fontSize: 10.5, fontWeight: 700, background: `${r.color}22`, color: r.color }}>
                {r.name}
              </span>
              <span className="flex-1" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                {new Date(e.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
              <button
                onClick={() => setEpisodes((es) => es.filter((x) => x.id !== e.id))}
                className="flex-none grid place-items-center rounded-lg"
                style={{ width: 26, height: 26, color: 'var(--muted)' }}
                aria-label="Удалить эпизод"
              >
                <Trash2 size={13} strokeWidth={1.8} />
              </button>
            </div>
            <p className="mt-1" style={{ fontSize: 12.5, color: 'var(--text)' }}>{e.text}</p>
            {(nt || bt) && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {nt && (
                  <span className="rounded-md px-1.5 py-0.5" style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--muted)' }}>
                    потребность: {nt}
                  </span>
                )}
                {bt && (
                  <span className="rounded-md px-1.5 py-0.5" style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--muted)' }}>
                    убеждение: {bt.length > 40 ? bt.slice(0, 40) + '…' : bt}
                  </span>
                )}
              </div>
            )}
            {e.action && (
              <p className="mt-1.5" style={{ fontSize: 11.5, color: 'var(--accent)' }}>
                → выход: {e.action}
              </p>
            )}
          </section>
        )
      })}
    </div>
  )

  return (
    <div className="px-4 pt-5 pb-24">
      <div className="grid grid-cols-2 gap-1 rounded-xl p-1 mb-3" style={{ background: 'var(--surface-2)' }}>
        {([{ id: 'triangle', label: 'Треугольник' }, { id: 'episodes', label: 'Эпизоды' }] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg py-1.5 transition-colors"
            style={{
              fontSize: 12, fontWeight: 600,
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? 'var(--on-fill)' : 'var(--muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'triangle' ? renderTriangle() : renderEpisodes()}

      {/* добавить эпизод */}
      {!addOpen ? (
        <button
          onClick={() => setAddOpen(true)}
          className="w-full rounded-2xl mt-2 py-3 flex items-center justify-center gap-1.5"
          style={{ background: 'var(--surface)', border: '1px dashed var(--line)', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}
        >
          <Plus size={15} strokeWidth={2.2} /> Эпизод
        </button>
      ) : (
        <section className="rounded-2xl mt-2 px-3 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--accent)' }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--light)' }}>Эпизод в треугольнике</p>
            <button onClick={() => setAddOpen(false)} className="grid place-items-center rounded-lg" style={{ width: 26, height: 26, color: 'var(--muted)' }} aria-label="Закрыть">
              <X size={14} strokeWidth={2} />
            </button>
          </div>
          <textarea
            value={fText}
            onChange={(e) => setFText(e.target.value)}
            placeholder="Что случилось? Кто что сказал, что я почувствовал…"
            className="w-full rounded-xl px-2.5 py-2 outline-none"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12.5, minHeight: 64, resize: 'vertical' }}
          />
          <p className="mt-2 mb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>В какую роль меня втянуло</p>
          <div className="grid grid-cols-3 gap-1">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setFRole(r.id)}
                className="rounded-lg py-1.5"
                style={{
                  fontSize: 11.5, fontWeight: 600,
                  background: fRole === r.id ? r.color : 'var(--surface-2)',
                  color: fRole === r.id ? 'var(--bg)' : 'var(--muted)',
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
          <p className="mt-2 mb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>Какая потребность задета (необязательно)</p>
          <select value={fNeed} onChange={(e) => setFNeed(e.target.value)} style={selectStyle}>
            <option value="">— не выбрано —</option>
            {needs.map((n) => <option key={n.id} value={n.id}>{n.text}</option>)}
          </select>
          <p className="mt-2 mb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>Какое убеждение сработало (необязательно)</p>
          <select value={fBelief} onChange={(e) => setFBelief(e.target.value)} style={selectStyle}>
            <option value="">— не выбрано —</option>
            {ALL_BELIEFS.map((b) => <option key={b.id} value={b.id}>{b.belief.text}</option>)}
          </select>
          <p className="mt-2 mb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>Договор с ролью: как выхожу (необязательно)</p>
          <input
            value={fAction}
            onChange={(e) => setFAction(e.target.value)}
            placeholder="Например: попрошу напрямую, без обиды"
            className="w-full rounded-xl px-2.5 outline-none"
            style={{ height: 36, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12.5 }}
          />
          <button
            onClick={saveEpisode}
            className="w-full rounded-xl mt-2.5 py-2.5"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 13, fontWeight: 700 }}
          >
            Записать эпизод
          </button>
        </section>
      )}
    </div>
  )
}
