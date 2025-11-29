// object/Enemy.js
import { Entity } from './Entity.js'

// общий базовый класс для всех монстров
class EnemyBase extends Entity {
  constructor() {
    super()

    this.name = 'Enemy'
    this.type = 'Enemy'

    // движение
    this.move_x = 0
    this.move_y = 0

    // скорость
    this.baseSpeed = 80
    this.speed = this.baseSpeed

    // размеры хитбокса (чуть меньше тайла)
    this.size_x = 24
    this.size_y = 24

    // ссылки на менеджеры
    this.gameManager = null
    this.physicManager = null
    this.spriteManager = null

    // имя спрайта из atlas (по умолчанию, потом перепишем из Tiled)
    this.spriteName = 'Enemy1'

    // небольшой сдвиг, чтобы лучше сидел на тайле
    this.spriteOffsetX = 0
    this.spriteOffsetY = -4

    // радиус обзора кота
    this.viewRadius = 160
    // собственная зона, из которой нельзя выходить
    this.zoneRadius = 200

    // центр зоны
    this.originX = 0
    this.originY = 0
    this._originInitialized = false

    // патруль
    this.patrolPath = []   // массив точек {x, y}
    this.currentPoint = 0  // индекс текущей точки
    this.waitTime = 0
    this.waitAtPoint = 0.3 // пауза в точке
  }

  ensureOrigin() {
    if (this._originInitialized) return
    this.originX = this.pos_x
    this.originY = this.pos_y
    this.buildPatrolPath()
    this._originInitialized = true
  }

  // базовый квадратный маршрут — переопределяется в наследниках
  buildPatrolPath() {
    const step = 96
    this.patrolPath = [
      { x: this.originX,        y: this.originY },
      { x: this.originX + step, y: this.originY },
      { x: this.originX + step, y: this.originY + step },
      { x: this.originX,        y: this.originY + step },
    ]
    this.currentPoint = 0
  }

  dist2(x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    return dx * dx + dy * dy
  }

  update(dt) {
    this.ensureOrigin()
    if (!this.gameManager || !this.physicManager) return

    const player = this.gameManager.player
    let targetX = null
    let targetY = null

    // --- 1) если видим кота и он в нашей зоне — преследуем ---
    if (player) {
      const d2 = this.dist2(this.pos_x, this.pos_y, player.pos_x, player.pos_y)
      const inView = d2 <= this.viewRadius * this.viewRadius

      const d2zone = this.dist2(this.originX, this.originY, player.pos_x, player.pos_y)
      const inZone = d2zone <= this.zoneRadius * this.zoneRadius

      if (inView && inZone) {
        targetX = player.pos_x
        targetY = player.pos_y
      }
    }

    // --- 2) не видим кота — ходим по маршруту ---
    if (targetX === null) {
      if (!this.patrolPath.length) return

      const point = this.patrolPath[this.currentPoint]
      const d2p = this.dist2(this.pos_x, this.pos_y, point.x, point.y)

      if (d2p < 4 * 4) {
        this.waitTime += dt
        if (this.waitTime >= this.waitAtPoint) {
          this.waitTime = 0
          this.currentPoint = (this.currentPoint + 1) % this.patrolPath.length
        }
      } else {
        targetX = point.x
        targetY = point.y
      }
    }

    // --- 3) движение к цели ---
    if (targetX !== null) {
      let vx = targetX - this.pos_x
      let vy = targetY - this.pos_y
      const len = Math.hypot(vx, vy) || 1
      vx /= len
      vy /= len

      this.move_x = vx
      this.move_y = vy

      const nextX = this.pos_x + vx * this.speed * dt
      const nextY = this.pos_y + vy * this.speed * dt
      const d2zoneNext = this.dist2(this.originX, this.originY, nextX, nextY)

      if (d2zoneNext <= this.zoneRadius * this.zoneRadius) {
        this.physicManager.update(this, dt)
      } else {
        this.move_x = 0
        this.move_y = 0
      }
    } else {
      this.move_x = 0
      this.move_y = 0
    }
  }

  draw(ctx) {
    if (!ctx) return

    const gm = this.gameManager
    const sm =
      this.spriteManager ||
      (gm && gm.spriteManager) ||
      null

    // Пытаемся нарисовать спрайт ТАК ЖЕ, как у кота
    if (sm && typeof sm.getSprite === 'function') {
      const candidates = [
        this.spriteName,
        this.name,
        this.type,
        this.spriteName && this.spriteName.toLowerCase(),
        this.name && this.name.toLowerCase(),
        this.type && this.type.toLowerCase(),
      ].filter(Boolean)

      for (const key of candidates) {
        const sprite = sm.getSprite(key)
        if (sprite) {
          sm.drawSprite(
            ctx,
            key,
            this.pos_x + this.spriteOffsetX,
            this.pos_y + this.spriteOffsetY,
          )
          return
        }
      }
    }

    // если ничего не нашли — красный квадрат
    ctx.fillStyle = 'red'
    ctx.fillRect(this.pos_x, this.pos_y, this.size_x, this.size_y)
  }
}

// ================== ТРИ КОНКРЕТНЫХ ВРАГА ==================

export class Enemy1 extends EnemyBase {
  constructor() {
    super()
    this.name = 'Enemy1'
    this.spriteName = 'Enemy1'
    this.speed = 70
    this.baseSpeed = this.speed
    this.viewRadius = 140
    this.zoneRadius = 160
  }

  buildPatrolPath() {
    const step = 64
    this.patrolPath = [
      { x: this.originX,        y: this.originY },
      { x: this.originX + step, y: this.originY },
      { x: this.originX + step, y: this.originY + step },
      { x: this.originX,        y: this.originY + step },
    ]
    this.currentPoint = 0
  }
}

export class Enemy2 extends EnemyBase {
  constructor() {
    super()
    this.name = 'Enemy2'
    this.spriteName = 'Enemy2'
    this.speed = 90
    this.baseSpeed = this.speed
    this.viewRadius = 170
    this.zoneRadius = 210
  }

  buildPatrolPath() {
    const stepX = 128
    const stepY = 64
    this.patrolPath = [
      { x: this.originX - stepX / 2, y: this.originY },
      { x: this.originX + stepX / 2, y: this.originY },
      { x: this.originX + stepX / 2, y: this.originY + stepY },
      { x: this.originX - stepX / 2, y: this.originY + stepY },
    ]
    this.currentPoint = 0
  }
}

export class Enemy3 extends EnemyBase {
  constructor() {
    super()
    this.name = 'Enemy3'
    this.spriteName = 'Enemy3'
    this.speed = 110
    this.baseSpeed = this.speed
    this.viewRadius = 200
    this.zoneRadius = 260
  }

  buildPatrolPath() {
    const step = 160
    this.patrolPath = [
      { x: this.originX,            y: this.originY - step / 2 },
      { x: this.originX + step / 2, y: this.originY },
      { x: this.originX,            y: this.originY + step / 2 },
      { x: this.originX - step / 2, y: this.originY },
    ]
    this.currentPoint = 0
  }
}
