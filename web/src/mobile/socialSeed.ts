import { uid } from '../views/practice/store'
import type { Person, SocialSet, SocialTag, SocialLayer, ThinkingType } from './socialTypes'

const FIRST_NAMES = [
  'Александр', 'Мария', 'Дмитрий', 'Анна', 'Максим', 'Елена', 'Иван', 'Ольга', 'Артём', 'Наталья',
  'Никита', 'Татьяна', 'Михаил', 'Светлана', 'Даниил', 'Ирина', 'Егор', 'Виктория', 'Андрей', 'Полина',
  'Илья', 'Екатерина', 'Кирилл', 'Алиса', 'Алексей', 'Анастасия', 'Павел', 'Юлия', 'Роман', 'Валерия',
  'Сергей', 'Ксения', 'Владимир', 'Вероника', 'Арсений', 'София', 'Константин', 'Марина', 'Вадим', 'Олеся',
  'Глеб', 'Дарья', 'Богдан', 'Людмила', 'Захар', 'Надежда', 'Матвей', 'Галина', 'Платон', 'Тамара',
  'Савелий', 'Лариса', 'Тимофей', 'Яна', 'Марк', 'Инна', 'Давид', 'Лилия', 'Фёдор', 'Алина',
  'Лев', 'Кристина', 'Юрий', 'Виолетта', 'Игнат', 'Элина', 'Станислав', 'Милана', 'Борис', 'Альбина',
  'Георгий', 'Василиса', 'Денис', 'Софья', 'Эдуард', 'Регина', 'Николай', 'Карина', 'Пётр', 'Изабелла',
  'Семён', 'Жанна', 'Тихон', 'Маргарита', 'Филипп', 'Аделина', 'Виктор', 'Амелия', 'Антон', 'Лиана',
  'Мирон', 'Нина', 'Прохор', 'Эмилия', 'Григорий', 'Роза', 'Лука', 'Стефания', 'Евгений', 'Фаина',
]

const LAST_NAMES = [
  'Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Смирнов', 'Васильев', 'Попов', 'Новиков', 'Морозов', 'Волков',
  'Лебедев', 'Соколов', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов', 'Богданов', 'Фёдоров', 'Михайлов', 'Пономарёв',
  'Андреев', 'Макаров', 'Зайцев', 'Соловьёв', 'Орлов', 'Назаров', 'Калинин', 'Беляев', 'Гусев', 'Комаров',
  'Карпов', 'Афанасьев', 'Мельников', 'Тарасов', 'Медведев', 'Исаков', 'Марков', 'Дорофеев', 'Егоров', 'Осипов',
  'Калашников', 'Давыдов', 'Поляков', 'Анисимов', 'Рябов', 'Савельев', 'Тихонов', 'Фролов', 'Жуков', 'Щербаков',
]

const SET_NAMES: { name: string; color: string }[] = [
  { name: 'семья', color: '#ec4899' },
  { name: 'друзья', color: '#3b82f6' },
  { name: 'школа 21', color: '#f97316' },
  { name: 'бег', color: '#22c55e' },
  { name: 'лыжи', color: '#06b6d4' },
  { name: 'Warface', color: '#ef4444' },
  { name: 'Саморазвитие', color: '#eab308' },
  { name: 'IT', color: '#8b5cf6' },
  { name: 'шахматы', color: '#14b8a6' },
]

const TAGS: { name: string; color: string }[] = [
  { name: 'работа', color: '#ef4444' },
  { name: 'спорт', color: '#22c55e' },
  { name: 'игра', color: '#f97316' },
]

const THINKING: ThinkingType[] = ['constructor', 'centrist', 'reflector']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickUnique<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function weightedLayer(): SocialLayer {
  const r = Math.random()
  if (r < 0.03) return 'core'
  if (r < 0.13) return 'close'
  if (r < 0.33) return 'friends'
  if (r < 0.58) return 'mates'
  if (r < 0.83) return 'known'
  if (r < 0.98) return 'contacts'
  return 'crowd'
}

function lastContact(): string {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * 365))
  return d.toISOString().slice(0, 10)
}

export function seedSocialData(): {
  people: Person[]
  sets: SocialSet[]
  tags: SocialTag[]
} {
  const sets: SocialSet[] = SET_NAMES.map((s) => ({ ...s, id: uid() }))
  const tags: SocialTag[] = TAGS.map((t) => ({ ...t, id: uid() }))

  const people: Person[] = []
  const usedNames = new Set<string>()

  while (people.length < 150) {
    const name = `${pick(LAST_NAMES)} ${pick(FIRST_NAMES)}`
    if (usedNames.has(name)) continue
    usedNames.add(name)

    const layer = weightedLayer()
    const setCount = 1 + Math.floor(Math.random() * 3)
    const personSets = pickUnique(sets, setCount)

    // чаще добавляем семью/друзей в ядро/близкие
    if (layer === 'core' || layer === 'close') {
      const familyOrFriends = sets.find((s) => s.name === 'семья' || s.name === 'друзья')
      if (familyOrFriends && !personSets.find((s) => s.id === familyOrFriends.id)) {
        personSets.push(familyOrFriends)
      }
    }

    const tagCount = Math.floor(Math.random() * 3)
    const personTags = pickUnique(tags, tagCount)

    // ярлык по множеству
    if (personSets.some((s) => ['бег', 'лыжи'].includes(s.name)) && !personTags.find((t) => t.name === 'спорт')) {
      const sport = tags.find((t) => t.name === 'спорт')
      if (sport) personTags.push(sport)
    }
    if (personSets.some((s) => ['Warface', 'шахматы'].includes(s.name)) && !personTags.find((t) => t.name === 'игра')) {
      const game = tags.find((t) => t.name === 'игра')
      if (game) personTags.push(game)
    }
    if (personSets.some((s) => ['IT', 'школа 21'].includes(s.name)) && !personTags.find((t) => t.name === 'работа')) {
      const work = tags.find((t) => t.name === 'работа')
      if (work) personTags.push(work)
    }

    people.push({
      id: uid(),
      name,
      layer,
      thinkingType: pick(THINKING),
      tags: personTags.map((t) => t.id),
      setIds: personSets.map((s) => s.id),
      lastContact: Math.random() > 0.3 ? lastContact() : undefined,
      note: Math.random() > 0.8 ? 'Случайная заметка' : undefined,
    })
  }

  return { people, sets, tags }
}
