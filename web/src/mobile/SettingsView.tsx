import { Moon, MoreHorizontal, Plus, Save, Sun, Wifi, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ThemeId } from '@/lib/theme'
import { getDirtySet, saveAllToServer, useLSTick } from '../lib/sync'
import { useSync } from '../lib/SyncProvider'
import { useLS } from '../views/practice/store'
import {
  BOTTOM_TAB_META,
  DEFAULT_TABS,
  TOOL_META,
  validToolIds,
  type AppTab,
  type AppTabId,
  type MTab,
  type NavFolder,
  type NavItem,
} from './navConfig'
import ActionSheet from './ActionSheet'
import { useDragList } from './useDragList'

type SessionAnalyticsTab = 'selfmap' | 'emotions' | 'therapy' | 'progress' | 'path'

const SESSION_ANALYTICS_KEY = 'aod4-session-analytics-tabs'
const SESSION_ANALYTICS_LABELS: Record<SessionAnalyticsTab, string> = {
  selfmap: 'Самооценка',
  emotions: 'Эмоции',
  therapy: 'Терапия',
  progress: 'Прогресс',
  path: 'Путь',
}
const DEFAULT_SESSION_ANALYTICS: SessionAnalyticsTab[] = ['selfmap', 'emotions', 'therapy', 'progress', 'path']

type ToolMode = 'work' | 'analytics' | 'both'
interface ToolConfig {
  mode: ToolMode
  color?: string
}

const TOOL_CONFIG_KEY = 'aod4-tool-configs'
const TOOL_MODE_LABELS: Record<ToolMode, string> = {
  work: 'Работа',
  analytics: 'Аналитика',
  both: 'Работа + аналитика',
}
const DEFAULT_TOOL_CONFIGS: Record<MTab, ToolConfig> = {
  notes: { mode: 'both' },
  emotions: { mode: 'both' },
  therapy: { mode: 'both' },
  map: { mode: 'both' },
  progress: { mode: 'both' },
  path: { mode: 'both' },
  social: { mode: 'both' },
}

export default function SettingsView({
  theme,
  onToggleTheme,
  tabs,
  setTabs,
}: {
  theme: ThemeId
  onToggleTheme: () => void
  tabs: AppTab[]
  setTabs: (t: AppTab[] | ((prev: AppTab[]) => AppTab[])) => void
}) {
  const isDark = theme !== 'tg-light'
  const ThemeIcon = isDark ? Sun : Moon
  const editTab: AppTabId = 'tools'
  const [menuFolder, setMenuFolder] = useState<string | null>(null)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [analytics, setAnalytics] = useLS<SessionAnalyticsTab[]>(SESSION_ANALYTICS_KEY, DEFAULT_SESSION_ANALYTICS)
  const [toolConfigs, setToolConfigs] = useLS<Record<MTab, ToolConfig>>(TOOL_CONFIG_KEY, DEFAULT_TOOL_CONFIGS)
  const [toolSheet, setToolSheet] = useState<MTab | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const { offline, offlineForced, setOffline, connected, lastSyncAt } = useSync()
  const lsTick = useLSTick(5000)
  const pendingCount = getDirtySet().size
  void lsTick

  const markDirty = () => setIsDirty(true)

  const updateTabs = (next: AppTab[]) => {
    setTabs(next)
    markDirty()
  }

  const updateTab = (id: AppTabId, patch: Partial<AppTab>) => {
    updateTabs(tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const addFolder = () => {
    updateTab(editTab, {
      folders: [
        ...tabs.find((t) => t.id === editTab)!.folders,
        { id: `folder-${Date.now()}`, label: 'Новая папка', items: [] },
      ],
    })
  }

  const removeFolder = (folderId: string) => {
    updateTab(editTab, {
      folders: tabs.find((t) => t.id === editTab)!.folders.filter((f) => f.id !== folderId),
    })
  }

  const updateFolder = (folderId: string, patch: Partial<NavFolder>) => {
    updateTab(editTab, {
      folders: tabs
        .find((t) => t.id === editTab)!
        .folders.map((f) => (f.id === folderId ? { ...f, ...patch } : f)),
    })
  }

  const moveFolder = (from: number, to: number) => {
    if (from === to) return
    const tab = tabs.find((t) => t.id === editTab)!
    const next = [...tab.folders]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    updateTab(editTab, { folders: next })
  }

  const folderDrag = useDragList({
    disabled: false,
    onReorder: moveFolder,
    onLongPress: (i) => setMenuFolder(tabs.find((t) => t.id === editTab)?.folders[i]?.id ?? null),
  })

  const resetTabs = () => {
    if (confirm('Сбросить все папки к настройкам по умолчанию?')) {
      updateTabs(DEFAULT_TABS)
    }
  }

  const moveAnalytics = (from: number, to: number) => {
    if (from === to) return
    setAnalytics((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    markDirty()
  }

  const removeAnalytics = (id: SessionAnalyticsTab) => {
    setAnalytics((prev) => prev.filter((x) => x !== id))
    markDirty()
  }

  const addAnalytics = (id: SessionAnalyticsTab) => {
    if (analytics.includes(id)) return
    setAnalytics((prev) => [...prev, id])
    markDirty()
  }

  const updateToolConfig = (id: MTab, patch: Partial<ToolConfig>) => {
    setToolConfigs((prev) => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_TOOL_CONFIGS[id]), ...patch } }))
    markDirty()
  }

  const moveBottomTab = (from: number, to: number) => {
    if (from === to) return
    const next = [...tabs]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    updateTabs(next)
  }

  const removeBottomTab = (id: AppTabId) => {
    if (tabs.length <= 3) return
    updateTabs(tabs.filter((t) => t.id !== id))
  }

  const addBottomTab = (id: AppTabId) => {
    if (tabs.length >= 5) return
    if (tabs.some((t) => t.id === id)) return
    const meta = BOTTOM_TAB_META[id]
    const base = DEFAULT_TABS.find((t) => t.id === id)
    updateTabs([...tabs, { id, label: meta.label, icon: meta.icon, folders: base?.folders ?? [] }])
  }

  const saveAll = async () => {
    setSaveStatus('saving')
    try {
      await saveAllToServer()
      setSaveStatus('saved')
      setIsDirty(false)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      setSaveStatus('error')
      alert('Ошибка сохранения: ' + String(e))
    }
  }

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const bottomTabDrag = useDragList({
    disabled: false,
    onReorder: moveBottomTab,
    onLongPress: () => {},
  })

  const availableBottomTabs = (Object.keys(BOTTOM_TAB_META) as AppTabId[]).filter(
    (id) => !tabs.some((t) => t.id === id)
  )

  const analyticsDrag = useDragList({
    disabled: false,
    onReorder: moveAnalytics,
    onLongPress: () => {},
  })

  const availableAnalytics = (Object.keys(SESSION_ANALYTICS_LABELS) as SessionAnalyticsTab[]).filter(
    (id) => !analytics.includes(id)
  )

  const currentTab = tabs.find((t) => t.id === editTab) ?? DEFAULT_TABS.find((t) => t.id === editTab)

  const saveLabel = saveStatus === 'saving' ? 'Сохранение...' : saveStatus === 'saved' ? 'Сохранено' : saveStatus === 'error' ? 'Ошибка' : isDirty ? 'Сохранить' : 'Сохранено'

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
          Настройки
        </h1>
        <button
          onClick={saveAll}
          disabled={!isDirty && saveStatus !== 'error'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{
            background: isDirty || saveStatus === 'error' ? 'var(--accent)' : 'var(--surface-2)',
            color: isDirty || saveStatus === 'error' ? 'var(--on-fill)' : 'var(--muted)',
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--line)',
          }}
        >
          <Save size={14} strokeWidth={2} />
          {saveLabel}
        </button>
      </div>

      <div className="mt-6 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <button onClick={onToggleTheme} className="w-full flex items-center justify-between">
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>Тема</span>
          <span
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: 13 }}
          >
            <ThemeIcon size={14} strokeWidth={1.8} />
            {isDark ? 'День' : 'Ночь'}
          </span>
        </button>
      </div>

      <div className="mt-4 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>Синхронизация</span>
          <div className="flex gap-2">
            {(['online', 'offline'] as const).map((mode) => {
              const active = offline === (mode === 'offline')
              const Icon = mode === 'offline' ? WifiOff : Wifi
              return (
                <button
                  key={mode}
                  onClick={() => setOffline(mode === 'offline')}
                  disabled={offlineForced}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--surface-2)',
                    color: active ? 'var(--on-fill)' : 'var(--muted)',
                    border: '1px solid var(--line)',
                    fontSize: 13,
                    opacity: offlineForced ? 0.5 : 1,
                  }}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  {mode === 'offline' ? 'Офлайн' : 'Онлайн'}
                </button>
              )
            })}
          </div>
        </div>
        <p className="mt-2" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {offlineForced
            ? 'Тестовая сборка — сеть отключена, всё хранится локально'
            : offline
              ? pendingCount > 0
                ? `Офлайн. Изменений ждут отправки: ${pendingCount} — уедут при включении онлайна`
                : 'Офлайн. Всё работает локально, сеть не используется'
              : connected
                ? pendingCount > 0
                  ? `Онлайн. Отправляется изменений: ${pendingCount}`
                  : `Онлайн${lastSyncAt ? ` · синхронизировано в ${lastSyncAt.toLocaleTimeString('ru-RU')}` : ''}`
                : 'Нет связи с сервером — изменения копятся локально'}
        </p>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Нижние вкладки</h2>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{tabs.length}/5</span>
        </div>
        <p className="mb-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Порядок и состав нижней панели. Минимум 3, максимум 5.
        </p>
        <div
          {...bottomTabDrag.containerProps}
          className="rounded-2xl p-3 space-y-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          {tabs.map((t, idx) => {
            const Icon = t.icon
            return (
              <div
                key={t.id}
                {...bottomTabDrag.bindRow(idx)}
                className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', ...bottomTabDrag.rowStyle(idx) }}
              >
                <span className="flex items-center gap-2" style={{ fontSize: 14, color: 'var(--light)' }}>
                  <Icon size={14} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
                  {t.label}
                </span>
                <button
                  onClick={() => removeBottomTab(t.id)}
                  disabled={tabs.length <= 3}
                  className="p-1"
                  style={{ color: tabs.length <= 3 ? 'var(--line-strong)' : 'var(--muted)' }}
                >
                  <X size={14} strokeWidth={1.8} />
                </button>
              </div>
            )
          })}
        </div>
        {availableBottomTabs.length > 0 && tabs.length < 5 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {availableBottomTabs.map((id) => (
              <button
                key={id}
                onClick={() => addBottomTab(id)}
                className="px-2 py-1 rounded-lg"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)' }}
              >
                + {BOTTOM_TAB_META[id].label}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Аналитика сессии</h2>
        <p className="mt-1 mb-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Порядок и состав вкладок в разделе «Сессия»
        </p>
        <div
          {...analyticsDrag.containerProps}
          className="rounded-2xl p-3 space-y-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          {analytics.map((id, idx) => (
            <div
              key={id}
              {...analyticsDrag.bindRow(idx)}
              className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', ...analyticsDrag.rowStyle(idx) }}
            >
              <span style={{ fontSize: 14, color: 'var(--light)' }}>{SESSION_ANALYTICS_LABELS[id]}</span>
              <button onClick={() => removeAnalytics(id)} className="p-1" style={{ color: 'var(--muted)' }}>
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>
          ))}
          {analytics.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Нет вкладок</p>}
        </div>
        {availableAnalytics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {availableAnalytics.map((id) => (
              <button
                key={id}
                onClick={() => addAnalytics(id)}
                className="px-2 py-1 rounded-lg"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)' }}
              >
                + {SESSION_ANALYTICS_LABELS[id]}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Инструменты</h2>
        <p className="mt-1 mb-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Режим работы, визуал и цвета
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TOOL_META) as MTab[]).map((id) => {
            const meta = TOOL_META[id]
            const cfg = toolConfigs[id] ?? DEFAULT_TOOL_CONFIGS[id]
            return (
              <button
                key={id}
                onClick={() => setToolSheet(id)}
                className="rounded-2xl p-3 text-left"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <meta.icon size={16} strokeWidth={1.8} style={{ color: cfg.color || 'var(--accent)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{meta.label}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{TOOL_MODE_LABELS[cfg.mode]}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Папки инструментов</h2>
          <button
            onClick={addFolder}
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 600 }}
          >
            <Plus size={14} strokeWidth={2} /> Папка
          </button>
        </div>

        <div {...folderDrag.containerProps} className="space-y-3">
          {(currentTab?.folders ?? []).map((folder, idx) => (
            <div
              key={folder.id}
              {...folderDrag.bindRow(idx)}
              className="rounded-2xl p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', ...folderDrag.rowStyle(idx) }}
            >
              <div className="flex items-center gap-2">
                {editingFolder === folder.id ? (
                  <input
                    value={folder.label}
                    onChange={(e) => updateFolder(folder.id, { label: e.target.value })}
                    onBlur={() => setEditingFolder(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingFolder(null) }}
                    autoFocus
                    className="flex-1 min-w-0 rounded-lg px-2 py-1 outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 14 }}
                  />
                ) : (
                  <span className="flex-1" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
                    {folder.label}
                  </span>
                )}
                <button onClick={() => setMenuFolder(folder.id)} className="p-1" style={{ color: 'var(--muted)' }}>
                  <MoreHorizontal size={18} strokeWidth={1.8} />
                </button>
              </div>

              <FolderItems folder={folder} onChange={(items) => updateFolder(folder.id, { items })} />
            </div>
          ))}
        </div>

        <button
          onClick={resetTabs}
          className="mt-4 w-full py-2 rounded-xl"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}
        >
          Сбросить папки
        </button>
      </section>

      {menuFolder && (
        <ActionSheet
          title={tabs.find((t) => t.id === editTab)?.folders.find((f) => f.id === menuFolder)?.label || 'Папка'}
          onClose={() => setMenuFolder(null)}
          onRename={() => { setEditingFolder(menuFolder); setMenuFolder(null) }}
          onDelete={() => { removeFolder(menuFolder); setMenuFolder(null) }}
        />
      )}

      {toolSheet && (
        <ToolConfigSheet
          id={toolSheet}
          config={toolConfigs[toolSheet] ?? DEFAULT_TOOL_CONFIGS[toolSheet]}
          onChange={(patch) => updateToolConfig(toolSheet, patch)}
          onClose={() => setToolSheet(null)}
        />
      )}
    </div>
  )
}

function ToolConfigSheet({
  id,
  config,
  onChange,
  onClose,
}: {
  id: MTab
  config: ToolConfig
  onChange: (patch: Partial<ToolConfig>) => void
  onClose: () => void
}) {
  const meta = TOOL_META[id]
  const modes: ToolMode[] = ['work', 'analytics', 'both']
  const colors = ['var(--accent)', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderBottom: 'none', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid place-items-center pb-3">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>
        <h2 className="mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 600, color: 'var(--light)' }}>
          <meta.icon size={18} strokeWidth={1.8} style={{ color: config.color || 'var(--accent)' }} />
          {meta.label}
        </h2>

        <p className="mb-2" style={{ fontSize: 12, color: 'var(--muted)' }}>Режим</p>
        <div className="flex gap-2 mb-4">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => onChange({ mode: m })}
              className="flex-1 py-2 rounded-xl"
              style={{
                fontSize: 12,
                fontWeight: 600,
                background: config.mode === m ? 'var(--accent)' : 'var(--surface-2)',
                color: config.mode === m ? 'var(--on-fill)' : 'var(--muted)',
                border: '1px solid var(--line)',
              }}
            >
              {TOOL_MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <p className="mb-2" style={{ fontSize: 12, color: 'var(--muted)' }}>Акцентный цвет</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ color: c })}
              className="rounded-full"
              style={{
                width: 28,
                height: 28,
                background: c,
                boxShadow: config.color === c ? '0 0 0 2px var(--light)' : 'none',
              }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 14 }}
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}

function FolderItems({
  folder,
  onChange,
}: {
  folder: NavFolder
  onChange: (items: NavItem[]) => void
}) {
  const [editingLabel, setEditingLabel] = useState<{ id: MTab; label: string } | null>(null)

  const safeItems = folder.items.filter((i) => validToolIds.has(i.id))

  const updateItem = (id: MTab, patch: Partial<NavItem>) => {
    onChange(safeItems.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  const removeItem = (id: MTab) => {
    onChange(safeItems.filter((i) => i.id !== id))
  }

  const moveItem = (from: number, to: number) => {
    if (from === to) return
    const next = [...safeItems]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const addItem = (id: MTab) => {
    if (!validToolIds.has(id)) return
    onChange([...safeItems, { id, label: TOOL_META[id].label }])
  }

  const drag = useDragList({
    disabled: false,
    onReorder: moveItem,
    onLongPress: (i) => {
      const it = safeItems[i]
      if (it) setEditingLabel({ id: it.id, label: it.label })
    },
  })

  const used = new Set(safeItems.map((i) => i.id))
  const available = (Object.keys(TOOL_META) as MTab[]).filter((id) => !used.has(id))

  return (
    <div className="mt-2" data-drag-container>
      <div {...drag.containerProps} className="space-y-1.5">
        {safeItems.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Пусто</p>}
        {safeItems.map((item, idx) => (
          <div
            key={item.id}
            {...drag.bindRow(idx)}
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', ...drag.rowStyle(idx) }}
          >
            {editingLabel?.id === item.id ? (
              <input
                value={editingLabel.label}
                onChange={(e) => setEditingLabel({ ...editingLabel, label: e.target.value })}
                onBlur={() => {
                  if (editingLabel.label.trim()) updateItem(item.id, { label: editingLabel.label.trim() })
                  setEditingLabel(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    if (editingLabel.label.trim()) updateItem(item.id, { label: editingLabel.label.trim() })
                    setEditingLabel(null)
                  }
                }}
                autoFocus
                className="flex-1 min-w-0 rounded-lg px-2 py-0.5 outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
              />
            ) : (
              <button
                onClick={() => setEditingLabel({ id: item.id, label: item.label })}
                className="flex-1 text-left"
                style={{ fontSize: 13, color: 'var(--text)' }}
              >
                {item.label || TOOL_META[item.id]?.label || item.id}
              </button>
            )}
            <label className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--muted)' }}>
              ур
              <input
                type="number"
                min={1}
                max={6}
                value={item.minLevel ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value)
                  updateItem(item.id, { minLevel: v })
                }}
                className="w-8 rounded-lg px-1 py-0.5 text-center outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 11 }}
              />
            </label>
            <button onClick={() => removeItem(item.id)} className="p-1" style={{ color: 'var(--muted)' }}>
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {available.map((id) => (
            <button
              key={id}
              onClick={() => addItem(id)}
              className="px-2 py-1 rounded-lg"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)' }}
            >
              + {TOOL_META[id].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
