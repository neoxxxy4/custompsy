export const THEMES = ['blueprint', 'tg-dark', 'tg-light'] as const
export type ThemeId = (typeof THEMES)[number]

export const DEFAULT_THEME: ThemeId = 'blueprint'

export const NEXT_THEME: Record<ThemeId, ThemeId> = {
  blueprint: 'tg-dark',
  'tg-dark': 'tg-light',
  'tg-light': 'blueprint',
}

export const THEME_LABELS: Record<ThemeId, string> = {
  blueprint: 'Блупринт',
  'tg-dark': 'ТГ Тёмный',
  'tg-light': 'ТГ Светлый',
}

export function asTheme(v: string): ThemeId {
  return (THEMES as readonly string[]).includes(v) ? (v as ThemeId) : DEFAULT_THEME
}

export function applyTheme(t: ThemeId): void {
  document.documentElement.dataset.theme = t
}
