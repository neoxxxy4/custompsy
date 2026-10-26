import TherapyChat from './TherapyChat'

export default function AiChatView() {
  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        ИИ-чат
      </h1>
      <div className="mt-3">
        <TherapyChat />
      </div>
    </div>
  )
}
