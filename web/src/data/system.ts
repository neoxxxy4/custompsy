// ─── Данные системы «Архитектор осознанного доверия» ───

export interface Force {
  id: string;
  num: string;
  name: string;
  color: string;
  layer: 'Фундамент' | 'Стены' | 'Крыша';
  role: string;
  desc: string;
  metrics: string[];
}

export const FORCES: Force[] = [
  {
    id: 'neuro',
    num: '05',
    name: 'Нейрохимия',
    color: 'var(--f-neuro)',
    layer: 'Фундамент',
    role: 'Сигналы состояния',
    desc: 'Дофамин, кортизол, тестостерон, серотонин, окситоцин. Важен баланс: не «больше = лучше», а правильный сигнал в нужное время. Рецепторы нельзя жечь быстрыми победами.',
    metrics: ['Пауза перед наградой', 'Сон 7–8 ч', 'Силовая база', 'Победы, даже маленькие'],
  },
  {
    id: 'discipline',
    num: '01',
    name: 'Самодисциплина',
    color: 'var(--f-discipline)',
    layer: 'Стены',
    role: 'Выбор взрослого',
    desc: 'Не «мне надо» (голос родителя), а «я выбираю режим, потому что он ведёт к моим победам». Не клетка, а стартовая площадка для остальных сил. Микро-шаги, а не рывок.',
    metrics: ['Тренировки: кол-во и качество', 'Сон: часы и глубина', 'Еда: регулярность и ограничения', 'Вода: норма в день', 'Осознанные паузы'],
  },
  {
    id: 'environment',
    num: '02',
    name: 'Среда',
    color: 'var(--f-environment)',
    layer: 'Стены',
    role: 'Порядок вокруг',
    desc: 'Физическое и информационное пространство. Внимание — самый ценный ресурс. У каждой вещи, контакта, приложения и источника — своё место, время и условия.',
    metrics: ['Т.О. организма', 'Быт и вещи', 'Гаджеты и приложения', 'Структура инфопотока'],
  },
  {
    id: 'emotions',
    num: '04',
    name: 'Эмоции',
    color: 'var(--f-emotions)',
    layer: 'Крыша',
    role: 'Компас',
    desc: 'Ощущение → эмоция → мысль. Поймал на теле — не дал сжечь фокус. Эмоция без имени управляет тобой; с именем — ты над ней. Не подавлять, не залипать.',
    metrics: ['Интерес → включай фокус', 'Тревога → стоп-кадр и микро-шаг', 'Гнев → проверь границу', 'Сила ≥ 6/10 → сбрось телом'],
  },
  {
    id: 'boundaries',
    num: '06',
    name: 'Границы',
    color: 'var(--f-boundaries)',
    layer: 'Крыша',
    role: 'Закон внутри и снаружи',
    desc: 'Доверие к себе внутри, контроль доступа снаружи. «Нет» без объяснений. Гнев сигналит: границу нарушили. Стыд: я нарушил свою. Защита гиперфокуса.',
    metrics: ['«Нет» без объяснений', 'Естественные последствия', 'Защита фокус-блоков'],
  },
  {
    id: 'metacog',
    num: '03',
    name: 'Метакогниция',
    color: 'var(--f-metacog)',
    layer: 'Крыша',
    role: 'Наблюдатель',
    desc: 'Думать о том, как думаешь. «Я злюсь» ≠ «Я злость». Мониторинг ресурса, остановка руминаций, возврат в фокус. Будильник, кайдзен-час, вечерняя рефлексия.',
    metrics: ['Вечерняя рефлексия', 'Кайдзен-час', 'Выгрузка руминаций'],
  },
];

export const forceById = (id: string) => FORCES.find((f) => f.id === id)!;

// ─── Граф архитектуры (v3.0 «Проводник») ───

export interface GraphNode {
  id: string;
  label: string;
  sub?: string;
  x: number; // 0..1200
  y: number; // 0..860
  r: number;
  color?: string;
  kind: 'core' | 'pillar' | 'force' | 'source' | 'leaf';
  desc: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export const GRAPH_NODES: GraphNode[] = [
  { id: 'meaning', label: 'Смысл', sub: 'быть проводником', x: 600, y: 90, r: 46, kind: 'core', color: '#e9e7e2', desc: '«Жить». Не быть источником — быть проводником веры, любви и смысла. Сила в доброте, желании помогать и делиться.' },
  { id: 'state', label: 'Состояние', sub: 'поток', x: 260, y: 270, r: 40, kind: 'pillar', color: '#8ab2d1', desc: 'Цель — не навыки и знания, а состояния, в которых совершаются сверхординарные результаты. Гиперфокус — необходимый навык экстраординарных результатов.' },
  { id: 'path', label: 'Путь', sub: 'циклы по 4 недели', x: 600, y: 270, r: 40, kind: 'pillar', color: '#efedbd', desc: 'От страхов — к желаниям. Непрерывный жизненный поток: спринты по 4 недели, сезоны с целями, версии архитектуры v1.0 → v3.1.' },
  { id: 'org', label: 'Организация', sub: 'порядок', x: 940, y: 270, r: 40, kind: 'pillar', color: '#aaf7b3', desc: 'Порядок = заранее принятые решения. Экономия рабочей памяти: чек-листы, календарь, у каждой вещи своё место.' },

  { id: 'hyperfocus', label: 'Гиперфокус', x: 260, y: 430, r: 26, kind: 'leaf', color: '#8ab2d1', desc: 'Один из необходимых навыков достижения экстраординарных результатов. Требует защиты границами и чистой эмоциональной входной точки.' },
  { id: 'sprints', label: 'Спринты', x: 600, y: 430, r: 26, kind: 'leaf', color: '#efedbd', desc: 'Планирование циклами по 4 недели. Sprint 0: Состояние → Путь → Организация → v3.01. Season 0: цель — v3.1 до 1.12.' },
  { id: 'checklists', label: 'Чек-листы', x: 940, y: 430, r: 26, kind: 'leaf', color: '#aaf7b3', desc: 'Ежедневный чек-лист и чек-листы отдельных блоков. Сознание не способно охватить все факты — списки, майнд-карты и матрица «срочно-важно» разгружают ОЗУ.' },

  { id: 'f-neuro', label: 'Нейрохимия', x: 120, y: 610, r: 30, kind: 'force', color: '#aaf7b3', desc: FORCES[0].desc },
  { id: 'f-discipline', label: 'Самодисциплина', x: 310, y: 700, r: 30, kind: 'force', color: '#efedbd', desc: FORCES[1].desc },
  { id: 'f-environment', label: 'Среда', x: 500, y: 740, r: 30, kind: 'force', color: '#8ab2d1', desc: FORCES[2].desc },
  { id: 'f-metacog', label: 'Метакогниция', x: 700, y: 740, r: 30, kind: 'force', color: '#c6a1ce', desc: FORCES[5].desc },
  { id: 'f-emotions', label: 'Эмоции', x: 890, y: 700, r: 30, kind: 'force', color: '#ffc09a', desc: FORCES[3].desc },
  { id: 'f-boundaries', label: 'Границы', x: 1080, y: 610, r: 30, kind: 'force', color: '#8ac1a0', desc: FORCES[4].desc },

  { id: 'src-we', label: 'Мы', sub: 'биология', x: 220, y: 120, r: 22, kind: 'source', color: '#cbc6b9', desc: 'Моя биология, физиология, мозг. Всё, что внутри. Не могу изменить биологию, но могу понять её законы и перестать с ней бороться.' },
  { id: 'src-env', label: 'Среда', sub: 'ресурсы', x: 980, y: 120, r: 22, kind: 'source', color: '#cbc6b9', desc: 'Ресурсы, пространство, время. Всё, что вокруг, кроме людей. Не могу контролировать весь мир, но могу навести порядок в своей среде.' },
  { id: 'src-people', label: 'Люди', sub: 'социум', x: 1090, y: 330, r: 22, kind: 'source', color: '#cbc6b9', desc: 'Социум, близкие, коллеги. Не могу заставить других быть удобными, но могу выстроить границы и выбирать, кого пускать в свою жизнь.' },
];

export const GRAPH_EDGES: GraphEdge[] = [
  { from: 'meaning', to: 'state' },
  { from: 'meaning', to: 'path' },
  { from: 'meaning', to: 'org' },
  { from: 'state', to: 'hyperfocus' },
  { from: 'path', to: 'sprints' },
  { from: 'org', to: 'checklists' },
  { from: 'f-neuro', to: 'state' },
  { from: 'f-discipline', to: 'path' },
  { from: 'f-environment', to: 'org' },
  { from: 'f-metacog', to: 'hyperfocus' },
  { from: 'f-emotions', to: 'state' },
  { from: 'f-boundaries', to: 'hyperfocus' },
  { from: 'src-we', to: 'meaning' },
  { from: 'src-env', to: 'meaning' },
  { from: 'src-people', to: 'org' },
  { from: 'f-neuro', to: 'f-discipline' },
  { from: 'f-emotions', to: 'f-metacog' },
];

// ─── Чек-листы ───

export interface CheckItem { id: string; text: string; hint?: string }
export interface CheckList { id: string; title: string; time: string; forceId?: string; color: string; items: CheckItem[] }

export const CHECKLISTS: CheckList[] = [
  {
    id: 'morning',
    title: 'Утро · Запуск',
    time: 'подъём',
    color: 'var(--f-discipline)',
    items: [
      { id: 'm1', text: 'Подъём по режиму' },
      { id: 'm2', text: 'Телефон — не раньше чем через 30 минут после пробуждения' },
      { id: 'm3', text: 'Вода — первый стакан' },
      { id: 'm4', text: 'Белковый завтрак' },
      { id: 'm5', text: 'Чек-лист дня просмотрен, план подтверждён' },
    ],
  },
  {
    id: 'focus-gate',
    title: 'Вход в гиперфокус',
    time: '30 секунд перед блоком',
    color: 'var(--f-emotions)',
    items: [
      { id: 'f1', text: 'Проверь тело: челюсть, плечи, живот', hint: 'Расслабил мышцы — эмоция отпустила хватку' },
      { id: 'f2', text: 'Назови эмоцию одним словом', hint: 'Без имени ты в эмоции. С именем — ты над ней' },
      { id: 'f3', text: 'Куда тянет? Прошлое → 5 вдохов · Будущее → запиши микро-шаг · Препятствие → убери или прими' },
      { id: 'f4', text: 'Сила эмоции < 6/10', hint: 'Если 6 и выше — не включай фокус: умойся, присядь 10 раз, пройдись' },
    ],
  },
  {
    id: 'day',
    title: 'День · Энергия',
    time: 'в течение дня',
    color: 'var(--f-neuro)',
    items: [
      { id: 'd1', text: 'Осознанная пауза при нагрузке ≥ 6/10' },
      { id: 'd2', text: 'Работа без наушников и лишнего кофе' },
      { id: 'd3', text: '3 литра воды' },
      { id: 'd4', text: 'Обед > ужин по калориям, без перекусов' },
      { id: 'd5', text: '20 000 шагов' },
      { id: 'd6', text: 'Тренировка по плану недели' },
    ],
  },
  {
    id: 'study',
    title: 'Учёба · Глубокая работа',
    time: 'будни 2 ч · выходные 6 ч',
    color: 'var(--f-metacog)',
    items: [
      { id: 's1', text: 'Не более 2 блоков по 1.5 часа' },
      { id: 's2', text: 'Блоки подобраны под усталость и сложность' },
      { id: 's3', text: 'Время измерено — в дневную и недельную статистику' },
      { id: 's4', text: 'Один конспект/выгрузка по итогам блока' },
    ],
  },
  {
    id: 'evening',
    title: 'Вечер · Рефлексия',
    time: 'отбой',
    color: 'var(--f-boundaries)',
    items: [
      { id: 'e1', text: 'Какая эмоция сегодня украла больше всего фокуса?', hint: 'Не для самобичевания — чтобы завтра узнать её в лицо' },
      { id: 'e2', text: 'Последний приём пищи — за 4 часа до сна' },
      { id: 'e3', text: 'Телефон убран за 30 минут до сна' },
      { id: 'e4', text: 'Чтение книги перед сном' },
      { id: 'e5', text: 'Отбой по режиму' },
    ],
  },
];

// ─── Роадмапа ───

export interface RoadItem {
  date: string;
  title: string;
  tag: 'version' | 'sprint' | 'season' | 'goal';
  status: 'done' | 'now' | 'next';
  desc: string;
}

export const ROADMAP: RoadItem[] = [
  { date: '22.04', title: 'v1.0 «Гиперфокус»', tag: 'version', status: 'done', desc: 'Контроль сил. Три источника: Мы, Среда, Люди. Здание: фундамент (психофизиология, нейрохимия, интеллект), стены (самодисциплина, среда, режим), крыша (эмоции, границы, метакогниция).' },
  { date: '10.06', title: 'v2.0 — переход', tag: 'version', status: 'done', desc: '49 дней спустя. Переход от страхов к желаниям: страх доверия → желание познания, страх эффективности → движение в пути, страх контроля → организация потребностей.' },
  { date: '24.06', title: 'v3.0 «Проводник»', tag: 'version', status: 'done', desc: 'Непрерывный жизненный поток. Четыре опоры: Смысл, Состояние, Путь, Организация. Планирование циклами по 4 недели.' },
  { date: '16.09', title: 'Sprint 0 · Состояние', tag: 'sprint', status: 'now', desc: 'Dopamine Load, Decision Fatigue, Check list 4. Ввод жизни в главные потоки.' },
  { date: '23.09', title: 'Sprint 0 · Путь', tag: 'sprint', status: 'next', desc: 'Hype Cycle, потоки развития.' },
  { date: '30.09', title: 'Sprint 0 · Организация', tag: 'sprint', status: 'next', desc: 'Agile, планирование дня.' },
  { date: '01.10', title: 'v3.01', tag: 'version', status: 'next', desc: 'Итерация архитектуры по итогам Sprint 0.' },
  { date: '01.12', title: 'Season 0 → v3.1', tag: 'goal', status: 'next', desc: 'Раскрыть основные составляющие графа. Сделать базовый информационный продукт.' },
  { date: '∞', title: 'v4.0 — продукт?', tag: 'season', status: 'next', desc: '«Может, v4.0 некогда и не будет — либо это уже будет полноценный продукт».' },
];

// ─── Планирование ───

export interface SprintWeek { week: string; theme: string; topics: string[]; color: string }

export const SPRINT0: SprintWeek[] = [
  { week: '16.09 — 22.09', theme: 'Состояние', topics: ['Dopamine Load', 'Decision Fatigue', 'Check list 4'], color: 'var(--f-emotions)' },
  { week: '23.09 — 29.09', theme: 'Путь', topics: ['Hype Cycle', 'Потоки развития'], color: 'var(--f-discipline)' },
  { week: '30.09 — 06.10', theme: 'Организация', topics: ['Agile', 'Планирование дня'], color: 'var(--f-neuro)' },
  { week: '07.10 — 13.10', theme: 'Итерация', topics: ['Ретроспектива', 'v3.01'], color: 'var(--f-metacog)' },
];

export interface DayPlan { day: string; blocks: { time: string; what: string; color?: string }[] }

export const WEEK_TEMPLATE: DayPlan[] = [
  { day: 'Пн', blocks: [
    { time: '06:30', what: 'Подъём · утренний чек-лист', color: 'var(--f-discipline)' },
    { time: '08:00', what: 'Работа — осознанные паузы', color: 'var(--f-neuro)' },
    { time: '18:00', what: 'Тренировка' },
    { time: '19:30', what: 'Учёба — блок 1.5 ч', color: 'var(--f-metacog)' },
    { time: '22:30', what: 'Вечерняя рефлексия · отбой', color: 'var(--f-boundaries)' },
  ]},
  { day: 'Вт', blocks: [
    { time: '06:30', what: 'Подъём · утренний чек-лист', color: 'var(--f-discipline)' },
    { time: '08:00', what: 'Работа', color: 'var(--f-neuro)' },
    { time: '19:30', what: 'Учёба — блок 1.5 ч', color: 'var(--f-metacog)' },
    { time: '21:00', what: 'Отдых: медитация · музыка', color: 'var(--f-emotions)' },
  ]},
  { day: 'Ср', blocks: [
    { time: '06:30', what: 'Подъём · утренний чек-лист', color: 'var(--f-discipline)' },
    { time: '18:00', what: 'Тренировка' },
    { time: '19:30', what: 'Учёба — блок 1.5 ч', color: 'var(--f-metacog)' },
  ]},
  { day: 'Чт', blocks: [
    { time: '06:30', what: 'Подъём · утренний чек-лист', color: 'var(--f-discipline)' },
    { time: '19:30', what: 'Учёба — блок 1.5 ч', color: 'var(--f-metacog)' },
    { time: '21:00', what: 'Кайдзен-час', color: 'var(--f-metacog)' },
  ]},
  { day: 'Пт', blocks: [
    { time: '06:30', what: 'Подъём · утренний чек-лист', color: 'var(--f-discipline)' },
    { time: '18:00', what: 'Тренировка' },
    { time: '20:00', what: 'Социум · свободный вечер', color: 'var(--f-emotions)' },
  ]},
  { day: 'Сб', blocks: [
    { time: '09:00', what: 'Длинная тренировка / лыжи' },
    { time: '12:00', what: 'Учёба — 2 блока по 1.5 ч', color: 'var(--f-metacog)' },
    { time: '17:00', what: 'Быт · среда · Т.О.', color: 'var(--f-environment)' },
  ]},
  { day: 'Вс', blocks: [
    { time: '10:00', what: 'Учёба — 2 блока по 1.5 ч', color: 'var(--f-metacog)' },
    { time: '16:00', what: 'Пост в канал · ритуал недели', color: 'var(--f-boundaries)' },
    { time: '19:00', what: 'Планирование следующей недели', color: 'var(--f-discipline)' },
  ]},
];

export const PLAN_PRINCIPLES = [
  { title: 'Эффективность', desc: 'Результат / время. Делать больше дел за меньшее время.' },
  { title: 'Стабильность', desc: 'Регулярно, без срывов. Качество важнее рывков.' },
  { title: 'Баланс энергии', desc: 'Не выжимать до нуля — оставлять пространство для перезагрузки.' },
  { title: 'Жёсткое + мягкое', desc: 'Баланс жёсткого и мягкого распределения дел на неделю.' },
];

// ─── Календарь ───

export interface CalEvent { date: string; title: string; color: string; kind: 'пост' | 'спринт' | 'тренировка' | 'цель' | 'ритуал' }

export const CAL_EVENTS: CalEvent[] = [
  { date: '2026-09-16', title: 'Sprint 0 · старт — Состояние', color: '#efedbd', kind: 'спринт' },
  { date: '2026-09-20', title: 'Пост #7 — ритуал недели', color: '#8ab2d1', kind: 'пост' },
  { date: '2026-09-23', title: 'Sprint 0 · Путь', color: '#efedbd', kind: 'спринт' },
  { date: '2026-09-27', title: 'Пост #8 — ритуал недели', color: '#8ab2d1', kind: 'пост' },
  { date: '2026-09-30', title: 'Sprint 0 · Организация', color: '#efedbd', kind: 'спринт' },
  { date: '2026-10-01', title: 'v3.01 — итерация архитектуры', color: '#c6a1ce', kind: 'цель' },
  { date: '2026-10-04', title: 'Пост #9 — ритуал недели', color: '#8ab2d1', kind: 'пост' },
  { date: '2026-12-01', title: 'Season 0 финал → v3.1', color: '#aaf7b3', kind: 'цель' },
];

// ─── Модули-хаб ───

export interface Module {
  id: string;
  num: string;
  name: string;
  tagline: string;
  color: string;
}

export const MODULES: Module[] = [
  { id: 'day', num: '01', name: 'День', tagline: 'Повестка сегодняшнего дня: цели, расписание, чек-листы, события', color: 'var(--accent)' },
  { id: 'graph', num: '02', name: 'Граф', tagline: 'Архитектура системы: смысл, состояние, путь, организация и 6 сил', color: 'var(--f-metacog)' },
  { id: 'checklists', num: '03', name: 'Практика', tagline: 'Чек-листы дня из шаблонов, заметки с папками, дневник', color: 'var(--f-discipline)' },
  { id: 'balance', num: '04', name: 'Баланс', tagline: 'Колесо 6 сил и распределение энергии недели', color: 'var(--f-neuro)' },
  { id: 'roadmap', num: '05', name: 'Роадмапа', tagline: 'Версии архитектуры: v1.0 → v3.1, спринты и сезоны', color: 'var(--f-environment)' },
  { id: 'planning', num: '06', name: 'Планирование', tagline: 'Циклы по 4 недели и шаблон недели', color: 'var(--f-emotions)' },
  { id: 'calendar', num: '07', name: 'Календарь', tagline: 'События, ритуалы, дедлайны сезона', color: 'var(--f-boundaries)' },
  { id: 'blog', num: '08', name: 'Блог', tagline: 'Посты с датой и текстом — как канал, только для себя', color: '#e9e7e2' },
];

export const SPHERES = [
  { name: 'Основа', parts: ['Работа / сон', 'Учёба / отдых', 'Спорт / питание'] },
  { name: 'Интеллект и продуктивность', parts: ['Организация', 'Психология / канал', 'Мышление / потребление'] },
  { name: 'Потребности', parts: ['Быт', 'Хобби', 'Социум', 'Отношения'] },
];
