export type SocialLayer = 'core' | 'close' | 'friends' | 'mates' | 'known' | 'contacts' | 'crowd'
export type ThinkingType = 'constructor' | 'centrist' | 'reflector'

export interface Person {
  id: string
  name: string
  layer: SocialLayer
  thinkingType: ThinkingType
  tags: string[]
  setIds: string[]
  lastContact?: string
  note?: string
}

export interface SocialSet {
  id: string
  name: string
  color: string
}

export interface SocialTag {
  id: string
  name: string
  color: string
}

export const SOCIAL_LAYERS: { id: SocialLayer; label: string; limit: number }[] = [
  { id: 'core', label: 'Ядро', limit: 5 },
  { id: 'close', label: 'Близкие', limit: 15 },
  { id: 'friends', label: 'Друзья', limit: 50 },
  { id: 'mates', label: 'Товарищи', limit: 100 },
  { id: 'known', label: 'Знакомые', limit: 150 },
  { id: 'contacts', label: 'Контакты', limit: 500 },
  { id: 'crowd', label: 'Толпа', limit: 1500 },
]

export const THINKING_TYPES: Record<ThinkingType, { label: string; color: string }> = {
  constructor: { label: 'Конструктор', color: '#3b82f6' },
  centrist: { label: 'Центрист', color: '#eab308' },
  reflector: { label: 'Рефлектор', color: '#8b5cf6' },
}
