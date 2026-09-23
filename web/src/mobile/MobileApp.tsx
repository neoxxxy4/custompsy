import { useState } from 'react'
import MobileBottomNav, { type MTab } from './MobileBottomNav'
import TodayView from './TodayView'
import RecordsView, { type FolderKey } from './RecordsView'

// мобильная оболочка (<1024px): 2 вкладки + нижнее меню
export default function MobileApp() {
  const [tab, setTab] = useState<MTab>('today')
  const [recordsFolder, setRecordsFolder] = useState<FolderKey>('all')

  const go = (t: MTab) => {
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen relative z-10" style={{ color: 'var(--text)' }}>
      {tab === 'today' && <TodayView />}
      {tab === 'records' && (
        <RecordsView folder={recordsFolder} onFolder={setRecordsFolder} onHome={() => go('today')} />
      )}
      <MobileBottomNav tab={tab} go={go} />
    </div>
  )
}
