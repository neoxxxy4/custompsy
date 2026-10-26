import { useEffect, useMemo, useState } from 'react'
import MobileBottomNav, { type BottomTabId } from './MobileBottomNav'
import TodayView from './TodayView'
import MapView from './MapView'
import EmotionsView from './EmotionsView'
import PathView from './PathView'
import ProgressView from './ProgressView'
import SettingsView from './SettingsView'
import TherapyView from './TherapyView'
import SessionView from './SessionView'
import ChatView from './ChatView'
import SocialView from './SocialView'
import BeliefsView from './BeliefsView'
import RecordsView from './RecordsView'
import DashboardView from './DashboardView'
import TabShell from './TabShell'
import { DEFAULT_TABS, useAppTabs, validToolIds, type MTab } from './navConfig'
import type { ThemeId } from '@/lib/theme'

export default function MobileApp({ theme, onToggleTheme }: { theme: ThemeId; onToggleTheme: () => void }) {
  const [tabs, setTabs] = useAppTabs()
  const [tab, setTab] = useState<BottomTabId>('day')
  const [activeFolder, setActiveFolder] = useState<Partial<Record<string, string>>>({})
  const [activeTool, setActiveTool] = useState<MTab | null>(null)

  const currentTab = useMemo(() => tabs.find((t) => t.id === tab) ?? tabs[0], [tabs, tab])
  const toolsTab = useMemo(() => tabs.find((t) => t.id === 'tools') ?? DEFAULT_TABS.find((t) => t.id === 'tools')!, [tabs])

  const openTool = (id: MTab) => {
    setActiveTool(id)
    globalThis.window.scrollTo({ top: 0 })
    if (globalThis.window.history.state?.tool !== id) {
      globalThis.window.history.pushState({ tool: id }, '', globalThis.window.location.href)
    }
  }

  const switchTab = (t: BottomTabId) => {
    setTab(t)
    setActiveTool(null)
    globalThis.window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const onPopState = () => {
      if (activeTool) {
        setActiveTool(null)
        globalThis.window.scrollTo({ top: 0 })
      }
    }
    const onBackButton = (e: Event) => {
      if (activeTool) {
        e.preventDefault()
        setActiveTool(null)
        globalThis.window.scrollTo({ top: 0 })
      }
    }
    const onSwitchTab = (e: Event) => {
      const id = (e as CustomEvent<{ tab: BottomTabId }>).detail?.tab
      if (id) switchTab(id)
    }
    globalThis.window.addEventListener('popstate', onPopState)
    document.addEventListener('backbutton', onBackButton)
    globalThis.window.addEventListener('aod:switch-tab', onSwitchTab)
    return () => {
      globalThis.window.removeEventListener('popstate', onPopState)
      document.removeEventListener('backbutton', onBackButton)
      globalThis.window.removeEventListener('aod:switch-tab', onSwitchTab)
    }
  }, [activeTool, switchTab])

  const renderTool = (id: MTab) => {
    switch (id) {
      case 'notes':
        return <RecordsView onHome={() => setActiveTool(null)} />
      case 'therapy':
        return <TherapyView />
      case 'map':
        return <MapView />
      case 'emotions':
        return <EmotionsView />
      case 'progress':
        return <ProgressView />
      case 'path':
        return <PathView />
      case 'social':
        return <SocialView />
      case 'beliefs':
        return <BeliefsView />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen relative z-10 overflow-x-hidden" style={{ color: 'var(--text)' }}>
      {activeTool ? (
        <TabShell
          tab={toolsTab}
          activeFolderId={activeFolder['tools'] ?? toolsTab.folders[0]?.id ?? ''}
          onFolder={(id: string) => setActiveFolder((prev) => ({ ...prev, tools: id }))}
          onTool={openTool}
          toolView={renderTool(activeTool)}
        />
      ) : tab === 'tools' ? (
        <TabShell
          tab={currentTab}
          activeFolderId={activeFolder[tab] ?? currentTab.folders[0]?.id ?? ''}
          onFolder={(id: string) => setActiveFolder((prev) => ({ ...prev, [tab]: id }))}
          onTool={openTool}
        />
      ) : tab === 'dashboard' ? (
        <DashboardView />
      ) : tab === 'day' ? (
        <TodayView />
      ) : tab === 'chat' ? (
        <ChatView />
      ) : tab === 'session' ? (
        <SessionView />
      ) : tab === 'settings' ? (
        <SettingsView theme={theme} onToggleTheme={onToggleTheme} tabs={tabs} setTabs={setTabs} />
      ) : validToolIds.has(tab as MTab) ? (
        // сервис как самостоятельная нижняя вкладка — без оболочки папок
        renderTool(tab as MTab)
      ) : null}

      <MobileBottomNav tabs={tabs} tab={tab} onTab={switchTab} />
    </div>
  )
}
