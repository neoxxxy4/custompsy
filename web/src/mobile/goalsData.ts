// Инструмент «Цели»: области развития с подпунктами-признаками.
// Уровень области = среднее по её подпунктам (0-12, как в карте самооценки).
// Структура полностью самонастраиваемая: области и подпункты добавляются и удаляются.

export interface GoalParam {
  id: string
  text: string
}

export interface GoalArea {
  id: string
  name: string
  color: string
  params: GoalParam[]
}

export const GOALS_STRUCTURE_KEY = 'aod4-goals-structure-v1'
export const GOALS_VALS_KEY = 'aod4-goals-vals-v1'

// палитра для новых областей
export const GOAL_PALETTE = ['#38bdf8', '#22c55e', '#eab308', '#f472b6', '#fb923c', '#a78bfa', '#4ade80', '#f87171']

export const DEFAULT_GOALS: GoalArea[] = [
  {
    id: 'respect',
    name: 'Уважение',
    color: '#38bdf8',
    params: [
      { id: 'respect-1', text: 'Я держу слово, данное себе' },
      { id: 'respect-2', text: 'Я принимаю своё тело и внешность' },
      { id: 'respect-3', text: 'Я позволяю себе отдых без чувства вины' },
      { id: 'respect-4', text: 'Я признаю свои достижения без стыда' },
    ],
  },
  {
    id: 'responsibility',
    name: 'Ответственность',
    color: '#22c55e',
    params: [
      { id: 'resp-1', text: 'Я довожу начатое до конца' },
      { id: 'resp-2', text: 'Я признаю свои ошибки без оправданий' },
      { id: 'resp-3', text: 'Я не перекладываю вину на обстоятельства и людей' },
      { id: 'resp-4', text: 'Я забочусь о своём здоровье и быте' },
    ],
  },
  {
    id: 'boundaries',
    name: 'Личные границы',
    color: '#eab308',
    params: [
      { id: 'bound-1', text: 'Я умею говорить «нет» без чувства вины' },
      { id: 'bound-2', text: 'Я замечаю, когда мне некомфортно' },
      { id: 'bound-3', text: 'Я прямо говорю, что мне не нравится' },
      { id: 'bound-4', text: 'Я не позволяю обесценивать мои чувства' },
    ],
  },
  {
    id: 'emotions',
    name: 'Эмоции',
    color: '#f472b6',
    params: [
      { id: 'emo-1', text: 'Я замечаю эмоцию в момент, а не после' },
      { id: 'emo-2', text: 'Я могу назвать свою эмоцию словами' },
      { id: 'emo-3', text: 'Я выражаю злость, не разрушая отношения' },
      { id: 'emo-4', text: 'Я успокаиваю себя без вредных способов' },
    ],
  },
  {
    id: 'money',
    name: 'Отношения к деньгам',
    color: '#fb923c',
    params: [
      { id: 'money-1', text: 'Я знаю, сколько у меня денег и куда они уходят' },
      { id: 'money-2', text: 'Я трачу без сильной тревоги и без запоев' },
      { id: 'money-3', text: 'Я регулярно откладываю' },
      { id: 'money-4', text: 'Я спокойно говорю о деньгах и цене своего труда' },
    ],
  },
  {
    id: 'growth',
    name: 'Развитие',
    color: '#a78bfa',
    params: [
      { id: 'grow-1', text: 'Я регулярно учусь чему-то новому' },
      { id: 'grow-2', text: 'Я довожу планы обучения до практики' },
      { id: 'grow-3', text: 'Я разбираю свой опыт: и ошибки, и успехи' },
      { id: 'grow-4', text: 'Я осознанно выхожу из зоны комфорта' },
    ],
  },
]
