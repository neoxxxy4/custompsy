# BIOS — Операционная система жизни
## Техническая спецификация v1.0

---

## 1. Философия и концепция

**BIOS** (Базовая Система Ввода-Вывода Сознания) — личный дашборд, который объединяет продуктивность, саморазвитие, психологическую стабильность и базу знаний в единое графовое пространство.

**Метафора:** человек = биокомпьютер. Модули = компоненты ПК. Данные = кровь и нервные импульсы. Ядро = LOVE.

**5 целей пользователя:**
1. Продуктивность и эффективность (задачи, календарь, планирование)
2. Саморазвитие (навыки, привычки, знания)
3. База знаний (Obsidian-style, дневник, wiki-ссылки)
4. Психологическая стабильность (чек-листы, практики, ДСМ)
5. Увеличение интеллекта (майнд-карты, социальный круг, эмоциональный интеллект)

**Ключевой принцип:** любое событие — узел графа. Любой узел связан с любым другим. Local-first, offline-ready.

---

## 2. Архитектура — 6 сил + Ядро

### 2.1. Центральное ядро (Kernel LOVE / ДСМ)
- **LOVE** — центральный узел, через который проходят все решения
- **ДСМ (Дефолт Система Мозга)** — планировщик, регулятор, интегратор
- Функция: фильтрация приоритетов, энергетический аудит, эмоциональная проверка
- Принцип: "Все системные вызовы проходят через LOVE"

### 2.2. Шесть сил (модули)

| # | Модуль | Цвет | Роль | Под-узлы |
|---|--------|------|------|----------|
| 1 | **Discipline** (Самодисциплина) | `#3b82f6` | Foundation, ритуалы, расписание | Rituals, Schedule, Ascesis |
| 2 | **Environment** (Среда) | `#06b6d4` | Body TO, быт, цифровая гигиена | Body, Home, Digital |
| 3 | **Metacognition** (Мышление) | `#f59e0b` | RAM, ДСМ, кайдзен, рефлексия | RAM, DSM, Kaizen |
| 4 | **Emotions** (Эмоции) | `#8b5cf6` | Компас, капюшон, регуляция | Compass, Hood, Body |
| 5 | **Neurochem** (Нейрохимия) | `#ec4899` | Дофамин, кортизол, тестостерон | Dopamine, Cortisol, Testosterone |
| 6 | **Boundaries** (Границы) | `#22c55e` | Inner Law, Access Control, Focus Guard | Inner Law, Access, Focus |

### 2.3. Ring-архитектура (как в ОС)
- **Ring 0** — Kernel LOVE / ДСМ (единственный доступ к "железу" тела)
- **Ring 1** — System Calls (планировщик, память, хранилище)
- **Ring 2** — Drivers (адаптеры для социума, эмоций, охлаждения)
- **Ring 3** — User Space (задачи, заметки, привычки — пользовательские процессы)

### 2.4. Interrupts (внешние прерывания)
- INT 0x01 — Уведомления
- INT 0x02 — Дедлайны
- INT 0x03 — Тревога
- INT 0x04 — Вдохновение
- INT 0x05 — Выгорание (Kernel Panic)
- INT 0x06 — Социальный запрос
- INT 0x07 — Запрос на сон

---

## 3. Дизайн-система

### 3.1. Цвета
```css
--love: #ff006e;       /* Ядро, любовь, пульс */
--discipline: #3b82f6; /* Самодисциплина */
--environment: #06b6d4;/* Среда */
--metacognition: #f59e0b; /* Мышление */
--emotions: #8b5cf6;   /* Эмоции */
--neurochem: #ec4899;  /* Нейрохимия */
--boundaries: #22c55e; /* Границы */
--bg: #0a0a12;         /* Фон */
--panel: #0f0f1a;      /* Панели */
--text: #e2e8f0;       /* Текст */
--subtle: #475569;     /* Вторичный текст */
--border: #1e1e2e;     /* Границы */
```

### 3.2. Типографика
- **Шрифт:** `Inter` для UI, `monospace` для терминальных элементов
- **Размеры:** 11px заголовки модулей, 13px основной текст, 10px мета
- **Стиль:** uppercase + letter-spacing для заголовков модулей

### 3.3. Компоненты
- **Panel:** `background: var(--panel)`, `border: 1px solid var(--border)`, `border-radius: 16px`, `padding: 16px`
- **Task Row:** `background: #141419`, `border-left: 3px solid [module-color]`, `border-radius: 10px`
- **Progress Bar:** `height: 6px`, `background: #1a1a2e`, `border-radius: 3px`
- **Roadmap Item:** `border-left: 3px solid`, статусы: done/current/future
- **Emotion Cell:** `28x28px`, `border-radius: 6px`, hover с glow
- **Sub-node (орбита):** `36x36px`, `border-radius: 50%`, цвет = модуль

### 3.4. Layout
- **3-колоночная сетка:** 300px | 1fr | 300px
- **Header:** логотип BIOS, статус-бар (Focus/Energy/Stress/Sleep), уровень + XP, аватар
- **Footer:** Insights / Analytics strip
- **Центр:** Neural Garden (орбитальная визуализация 6 сил вокруг LOVE)

---

## 4. Функциональные модули

### 4.1. Task Queue (Продуктивность)
- Задачи как процессы с PID, CPU load, XP reward
- Kanban / список
- Приоритеты + энергетическая стоимость
- Связь с навыками (+XP при выполнении)

### 4.2. Road Map (Boot Sequence)
- Версионное развитие: v1.0 → v2.0 → v3.0 → v3.1 → v4.0
- Каждый этап = milestone с XP reward
- Прогресс-бары + статусы [OK] / [~~] / [  ]

### 4.3. Habit Loops (Привычки)
- Петля: Trigger → Action → Reward
- Счётчик серий (streak)
- XP за выполнение
- Цвет = модуль, к которому относится привычка

### 4.4. Emotion Map (Эмоции)
- Круговая карта эмоций (радость, тревога, гнев, спокойствие, усталость, любовь)
- Процент позитива, streak, XP за неделю
- Тренд (график)

### 4.5. Knowledge Graph (База знаний)
- Obsidian-style: `[[Wiki-ссылки]]` + backlinks
- Заметки = нейроны, ссылки = синапсы
- Теги, кластеры, граф-визуализация
- Связь с задачами, людьми, эмоциями

### 4.6. Homeostasis (Баланс)
- DSM-радар (6 метрик: Focus, Energy, Motivation, Calm, Creativity, Memory)
- Уровни гормонов: Dopamine, Cortisol, Serotonin, Testosterone
- Статистика: Focus, Energy, Stress, Sleep

### 4.7. Calendar (Календарь)
- Месячная сетка
- События с XP reward
- Биоритмы (волны Focus/Mood/Energy)

### 4.8. Journal (Дневник)
- Записи с датой, XP reward, тегами
- Автоматическая связь с Knowledge Graph
- Mood tagging

### 4.9. Social Web (Социальный круг)
- Люди как узлы с рейтингом (⭐)
- История контактов, last contact
- Напоминания о коммуникации

### 4.10. Analytics / Insights
- Корреляции (сон ↔ продуктивность, тревога ↔ задачи)
- Рекомендации ИИ
- Тренды
- Footer-strip на главном экране

---

## 5. Структура данных (TypeScript)

```typescript
// Центральная сущность
interface Node {
  id: string;
  type: 'task' | 'note' | 'emotion' | 'dsm' | 'person' | 'skill' | 'habit' | 'milestone';
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  linkedNodeIds: string[];
  moduleColor: string; // цвет модуля-владельца
}

interface Task extends Node {
  type: 'task';
  title: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: number; // 1-10
  energyCost: number; // 1-10
  focusRequired: number; // 1-10
  xpReward: number;
  skillId?: string;
  personId?: string;
  dueDate?: Date;
}

interface Note extends Node {
  type: 'note';
  title: string;
  content: string; // markdown
  links: string[]; // [[id]] или [[title]]
  backlinks: string[];
}

interface DSMState extends Node {
  type: 'dsm';
  focus: number;      // 0-100
  energy: number;     // 0-100
  anxiety: number;    // 0-100
  motivation: number; // 0-100
  creativity: number; // 0-100
  memory: number;     // 0-100
}

interface Habit extends Node {
  type: 'habit';
  name: string;
  trigger: string;
  action: string;
  reward: string;
  streak: number;
  maxStreak: number;
  module: 'discipline' | 'environment' | 'metacognition' | 'emotions' | 'neurochem' | 'boundaries';
}

interface Person extends Node {
  type: 'person';
  name: string;
  closeness: number; // 1-5
  lastContact: Date;
  rating: number; // 1-10
}

interface Milestone extends Node {
  type: 'milestone';
  version: string; // v1.0, v2.0...
  title: string;
  status: 'completed' | 'in_progress' | 'planned';
  xpReward: number;
  date: Date;
}
```

---

## 6. Технический стек

| Слой | Технология | Почему |
|------|-----------|--------|
| Frontend | React 19 + TypeScript | Компонентность, типизация |
| State | Zustand | Простота, модульность |
| Storage | IndexedDB (Dexie.js) | Local-first, offline |
| Sync | Supabase (опц.) | Auth, бэкап, мульти-устройство |
| Graph | Cytoscape.js | Граф знаний, социальный круг |
| Calendar | date-fns + кастом | Гибкость |
| PWA | Vite PWA plugin | Установка, offline |
| Styling | Tailwind CSS | Скорость, дизайн-система |

---

## 7. План разработки (MVP)

### Этап 0. Скелет
- React + Vite + Tailwind + Zustand
- Тёмная тема с цветовой системой
- Layout: 3 колонки + header + footer

### Этап 1. Task Queue + Road Map
- Задачи с приоритетами и XP
- Road Map с версиями
- Быстрый win — видно прогресс

### Этап 2. Neural Garden (центр)
- Орбитальная визуализация 6 сил
- LOVE-ядро с пульсацией
- DSM-радар

### Этап 3. Homeostasis + Emotions
- DSM-трекер (5 метрик)
- Круг эмоций
- Гормональные бары

### Этап 4. Knowledge Graph
- Заметки с `[[ссылками]]`
- Backlinks
- Граф визуализации

### Этап 5. Habit Loops + Journal
- Петли T→A→R
- Дневник с тегами
- Streak counter

### Этап 6. Social + Calendar
- Люди, рейтинги, напоминания
- Календарь + биоритмы

### Этап 7. Analytics
- Корреляции
- Insights
- Рекомендации

---

## 8. Ключевые принципы для разработчика

1. **Local-first.** Всё хранится в IndexedDB. Sync — опционально.
2. **Графовое пространство.** Любой узел может ссылаться на любой. Нет изолированных модулей.
3. **LOVE-фильтр.** Любое действие в системе должно проходить через проверку: "Это из любви к себе/процессу?"
4. **Interrupt Controller.** Внешний мир (уведомления, дедлайны) — прерывания. Система фильтрует, а не реагирует мгновенно.
5. **Backprop = рефлексия.** Каждый вечер — корректировка "весов" (привычек) на основе дневного опыта.
6. **Эстетика = функция.** Красивый интерфейс мотивирует открывать приложение.

---

## 9. Референсы

- **itabyss.pro** — структура, минимализм
- **platform.21-school.ru** — геймификация, уровни, XP
- **Obsidian** — граф знаний, wiki-ссылки
- **Telegram-канал "Архитектор осознанного доверия"** — философия, 6 сил, ДСМ, нейрохимия

---

## 10. Словарь терминов

- **BIOS** — Базовая Система Ввода-Вывода Сознания
- **ДСМ** — Дефолт Система Мозга (режим "ни о чём", сортировка опыта)
- **ОЗУ** — Рабочая память (7±2 объектов)
- **PSU** — Питание (сон, еда, спорт)
- **COOLING** — Охлаждение (медитация, сброс стресса)
- **GPU** — Эмоции/креатив (параллельная обработка)
- **Habit Loop** — Триггер → Действие → Награда
- **Kernel Panic** — Состояние выгорения, требует Recovery Protocol
- **Interrupt** — Внешнее прерывание, требующее внимания ядра

---

*Создано: 2026-09-09*
*Автор: Архитектор осознанного доверия*
*Версия спецификации: 1.0*
