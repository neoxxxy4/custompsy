// кольцо прогресса для карточки «Прогресс дня» (мобильная главная)
export default function ProgressRing({
  pct,
  color,
  size = 76,
}: {
  pct: number
  color: string
  size?: number
}) {
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} opacity={0.5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        style={{ transition: 'stroke-dashoffset .5s cubic-bezier(0.65,0,0.35,1)' }}
      />
    </svg>
  )
}
