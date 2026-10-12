import { useCallback, useEffect } from 'react';
import MobileApp from '@/mobile/MobileApp';
import { useLS } from '@/views/practice/store';
import { applyTheme, asTheme, DEFAULT_THEME } from '@/lib/theme';

export default function App() {
  const [themeRaw, setTheme] = useLS<string>('aod4-theme', DEFAULT_THEME);
  const theme = asTheme(themeRaw);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleDayNight = useCallback(() => {
    setTheme((t) => (asTheme(t) === 'tg-dark' ? 'tg-light' : 'tg-dark'));
  }, [setTheme]);

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      <MobileApp theme={theme} onToggleTheme={toggleDayNight} />
    </div>
  );
}
