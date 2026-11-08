// каталог потребностей: Дубынин «Мозг и его потребности» (витальные/социальные/саморазвитие) + Маслоу
// id каталога: n<catIndex>-<needIndex>, пользовательские: u<catIndex>-<i>

export interface NeedCat {
  name: string
  color: string
  needs: string[]
}

export const NEED_CATEGORIES: NeedCat[] = [
  {
    name: 'Витальные',
    color: '#38bdf8',
    needs: [
      'Еда и вода',
      'Сон и отдых',
      'Безопасность',
      'Комфорт и здоровье',
      'Экономия сил',
      'Дом, быт, стабильность',
    ],
  },
  {
    name: 'Социальные',
    color: '#fb923c',
    needs: [
      'Близость и забота',
      'Принадлежность к группе',
      'Признание и статус',
      'Собственность',
      'Эмпатия и помощь другим',
      'Уважение',
    ],
  },
  {
    name: 'Саморазвитие',
    color: '#a78bfa',
    needs: [
      'Любопытство и креатив',
      'Подражание — учиться у других',
      'Игра',
      'Свобода и автономия',
      'Познание и понимание',
      'Эстетика — гармония, красота',
      'Самореализация',
    ],
  },
]

export interface NeedRef {
  id: string
  text: string
  catIndex: number
  color: string
}

// плоский список: каталожные + пользовательские потребности (для поиска, ИИ, карты)
export function allNeeds(custom: Record<number, string[]>): NeedRef[] {
  const out: NeedRef[] = []
  NEED_CATEGORIES.forEach((cat, ci) => {
    cat.needs.forEach((text, ni) => out.push({ id: `n${ci}-${ni}`, text, catIndex: ci, color: cat.color }))
    ;(custom[ci] ?? []).forEach((text, ui) => out.push({ id: `u${ci}-${ui}`, text, catIndex: ci, color: cat.color }))
  })
  return out
}
