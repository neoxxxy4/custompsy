import { Moon, MoreHorizontal, Plus, Sun, X } from 'lucide-react'
import { useState } from 'react'
import type { ThemeId } from '@/lib/theme'
import { useLS } from '../views/practice/store'
import {
  DEFAULT_TABS,
  TOOL_META,
  validToolIds,
  writeTabs,
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

  const updateTabs = (next: AppTab[]) => {
    setTabs(next)
    writeTabs(next)
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

  const toggleAnalytics = (id: SessionAnalyticsTab) => {
    setAnalytics((prev) => {
      const set = new Set(prev)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return Array.from(set)
    })
  }

  const currentTab = tabs.find((t) => t.id === editTab) ?? DEFAULT_TABS.find((t) => t.id === editTab)

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Настройки
      </h1>

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

      <section className="mt-6">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Аналитика сессии</h2>
        <p className="mt-1 mb-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Выберите вкладки, видимые в разделе «Сессия»
        </p>
        <div className="rounded-2xl p-3 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          {(Object.keys(SESSION_ANALYTICS_LABELS) as SessionAnalyticsTab[]).map((id) => {
            const active = analytics.includes(id)
            return (
              <label key={id} className="flex items-center justify-between">
                <span style={{ fontSize: 14, color: 'var(--light)' }}>{SESSION_ANALYTICS_LABELS[id]}</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleAnalytics(id)}
                  className="w-5 h-5 accent-[var(--accent)]"
                />
              </label>
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
