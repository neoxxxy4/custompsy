// треугольник Карпмана: Жертва — Спасатель — Преследователь
// у каждой роли — её логика и выход в «треугольник победителя» (Чой)

export type RoleId = 'victim' | 'rescuer' | 'persecutor'

export interface RoleMeta {
  id: RoleId
  name: string
  color: string
  motto: string       // внутренняя фраза роли
  exitName: string    // ресурсная версия (треугольник победителя)
  exit: string        // как выходить
}

export const ROLES: RoleMeta[] = [
  {
    id: 'victim',
    name: 'Жертва',
    color: '#38bdf8',
    motto: '«Всё плохо, я не справлюсь, пусть кто-то поможет»',
    exit: 'Уязвимый / ответственный',
    exitText: 'признать чувства, спросить «что Я могу сделать?», просить прямо вместо страдания',
  },
  {
    id: 'rescuer',
    name: 'Спасатель',
    color: '#22c55e',
    motto: '«Я помогу, без меня не справятся»',
    exit: 'Заботливый',
    exitText: 'помогать только по запросу, спросить «ты хочешь помощь или чтобы я просто выслушал?»',
  },
  {
    id: 'persecutor',
    name: 'Преследователь',
    color: '#ef4444',
    motto: '«Ты виноват, надо давить и контролировать»',
    exit: 'Настойчивый',
    exitText: 'назвать факт без обвинения, выставить границу, сказать чего я хочу вместо критики',
  },
]

export const roleById = (id: string): RoleMeta => ROLES.find((r) => r.id === id) ?? ROLES[0]

// эпизод попадания в треугольник
export interface RoleEpisode {
  id: string
  ts: number
  text: string           // что случилось
  myRole: RoleId         // в какую роль меня втянуло
  needId?: string        // задетая потребность (aod4-needs)
  beliefId?: string      // сработавшее убеждение (aod4-beliefs)
  action?: string        // договор/действие: как выхожу из треугольника
}

export const ROLES_KEY = 'aod4-roles-v1'
