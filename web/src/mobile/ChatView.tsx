export default function ChatView() {
  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Чат
      </h1>
      <div className="mt-6 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Здесь будет чат.
        </p>
      </div>
    </div>
  )
}
