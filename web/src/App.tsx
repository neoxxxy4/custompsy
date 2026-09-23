import { useState, useCallback, useEffect } from 'react';
import SideNav from '@/components/SideNav';
import StatusBar from '@/components/StatusBar';
import MobileApp from '@/mobile/MobileApp';
import Dashboard from '@/views/Dashboard';
import DayView from '@/views/DayView';
import GraphView from '@/views/GraphView';
import ChecklistsView from '@/views/ChecklistsView';
import BalanceView from '@/views/BalanceView';
import RoadmapView from '@/views/RoadmapView';
import PlanningView from '@/views/PlanningView';
import CalendarView from '@/views/CalendarView';
import BlogView from '@/views/BlogView';
import { useLS } from '@/views/practice/store';
import { applyTheme, asTheme, DEFAULT_THEME, NEXT_THEME } from '@/lib/theme';
import { useMediaQuery } from '@/lib/useMediaQuery';

export type ViewId =
  | 'hub' | 'day' | 'graph' | 'checklists' | 'notes' | 'diary'
  | 'balance' | 'roadmap' | 'planning' | 'calendar' | 'blog';

export const VIEW_TITLES: Record<ViewId, string> = {
  hub: 'Обзор',
  day: 'День',
  graph: 'Граф системы',
  checklists: 'Чек-листы',
  notes: 'Заметки',
  diary: 'Дневник',
  balance: 'Система баланса',
  roadmap: 'Роадмапа',
  planning: 'Планирование',
  calendar: 'Календарь',
  blog: 'Блог',
};

export default function App() {
  const [view, setView] = useState<ViewId>('day');
  const [themeRaw, setTheme] = useLS<string>('aod2-theme', DEFAULT_THEME);
  const theme = asTheme(themeRaw);
  // <1024px — мобильное приложение (MobileApp), >=1024px — десктопный layout
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const go = useCallback((v: ViewId) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => NEXT_THEME[asTheme(t)]);
  }, [setTheme]);

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      <div className="blueprint-bg" />
      <div className="vignette" />

      {!isDesktop && <MobileApp />}

      {isDesktop && (
        <>
          <SideNav view={view} go={go} />
          <StatusBar view={view} go={go} theme={theme} onToggleTheme={toggleTheme} />

          <div className="lg:pl-[232px]">
            <main className="relative z-10 max-w-[1400px] mx-auto px-5 lg:px-8 pb-24 pt-8">
              {view === 'hub' && <Dashboard go={go} />}
              {view === 'day' && <DayView go={go} />}
              {view === 'graph' && <GraphView />}
              {(view === 'checklists' || view === 'notes' || view === 'diary') && (
                <ChecklistsView
                  key={view}
                  initialTab={view === 'notes' ? 'notes' : view === 'diary' ? 'diary' : 'lists'}
                />
              )}
              {view === 'balance' && <BalanceView />}
              {view === 'roadmap' && <RoadmapView />}
              {view === 'planning' && <PlanningView />}
              {view === 'calendar' && <CalendarView />}
              {view === 'blog' && <BlogView />}
            </main>

            <footer
              className="relative z-10 max-w-[1400px] mx-auto px-5 lg:px-8 pb-10 flex justify-between items-center"
            >
              <span className="mono-label">Архитектор осознанного доверия</span>
              <span className="mono-label">v1.0 «Гиперфокус» → v4.0 «Просветление»</span>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
