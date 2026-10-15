import { useEffect, useState } from 'react'
import MobileBottomNav, { type AppTabId } from './MobileBottomNav'
import TodayView from './TodayView'
import MapView from './MapView'
import EmotionsView from './EmotionsView'
import PathView from './PathView'
import ProgressView from './ProgressView'
import SettingsView from './SettingsView'
import TherapyView from './TherapyView'
import SessionView from './SessionView'
import ChatView from './ChatView'
import TabShell from './TabShell'
import type { MTab } from './navConfig'
import type { ThemeId } from '@/lib/theme'

export default function MobileApp({ theme, onToggleTheme }: { theme: ThemeId; onToggleTheme: () => void }) {
  const [tab, setTab] = useState<AppTabId>('day')
  const [activeTool, setActiveTool] = useState<MTab | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const openTool = (id: MTab) => {
    setActiveTool(id)
    globalThis.window.scrollTo({ top: 0 })
    if (globalThis.window.history.state?.tool !== id) {
      globalThis.window.history.pushState({ tool: id }, '', globalThis.window.location.href)
    }
  }

  const switchTab = (t: AppTabId) => {
    setTab(t)
    setActiveTool(null)
    setSettingsOpen(false)
    globalThis.window.scrollTo({ top: 0 })
  }

  const openSettings = () => {
    setSettingsOpen(true)
    globalThis.window.scrollTo({ top: 0 })
    if (globalThis.window.history.state?.screen !== 'settings') {
      globalThis.window.history.pushState({ screen: 'settings' }, '', globalThis.window.location.href)
    }
  }

  useEffect(() => {
    const onPopState = () => {
      if (activeTool) {
        setActiveTool(null)
        globalThis.window.scrollTo({ top: 0 })
      } else if (settingsOpen) {
        setSettingsOpen(false)
        globalThis.window.scrollTo({ top: 0 })
      }
    }
    const onBackButton = (e: Event) => {
      if (activeTool) {
        e.preventDefault()
        setActiveTool(null)
        globalThis.window.scrollTo({ top: 0 })
      } else if (settingsOpen) {
        e.preventDefault()
        setSettingsOpen(false)
        globalThis.window.scrollTo({ top: 0 })
      }
    }
    globalThis.window.addEventListener('popstate', onPopState)
    document.addEventListener('backbutton', onBackButton)
    return () => {
      globalThis.window.removeEventListener('popstate', onPopState)
      document.removeEventListener('backbutton', onBackButton)
    }
  }, [activeTool, settingsOpen])

  const renderTool = (id: MTab) => {
    switch (id) {
      case 'chat':
        return <ChatView />
      case 'therapy':
        return <TherapyView />
      case 'map':
        return <MapView />
      case 'emotions':
        return <EmotionsView />
      case 'session':
        return <SessionView />
      case 'progress':
        return <ProgressView />
      case 'path':
        return <PathView />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen relative z-10 overflow-x-hidden" style={{ color: 'var(--text)' }}>
      {activeTool ? (
        <TabShell
          onTool={openTool}
          toolView={renderTool(activeTool)}
          onSettings={openSettings}
        />
      ) : settingsOpen ? (
        <SettingsView theme={theme} onToggleTheme={onToggleTheme} />
      ) : tab === 'tools' ? (
        <TabShell
          onTool={openTool}
          onSettings={openSettings}
        />
      ) : tab === 'day' ? (
        <TodayView />
      ) : tab === 'chat' ? (
        <ChatView />
      ) : tab === 'session' ? (
        <SessionView />
      ) : null}

      {!settingsOpen && <MobileBottomNav tab={tab} onTab={switchTab} />}
    </div>
  )
}
