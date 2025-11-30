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

    // радиус обзора кота (в пикселях)
    this.viewRadius = 160

    // точка спауна (если потом захочешь ограничения зоны)
    this.originX = 0
    this.originY = 0
    this._originInitialized = false

    // ---- параметры случайного блуждания ----
    this.randomDirX = 0
    this.randomDirY = 0
    this.randomTimer = 0              // сколько ещё двигаться в текущем направлении
    this.randomIntervalMin = 0.7      // мин. время до смены направления
    this.randomIntervalMax = 1.8      // макс. время до смены направления
  }

  ensureOrigin() {
    if (this._originInitialized) return
    this.originX = this.pos_x
    this.originY = this.pos_y
    this._originInitialized = true
  }

  // выбор нового случайного направления
  pickRandomDirection() {
    const angle = Math.random() * Math.PI * 2
    this.randomDirX = Math.cos(angle)
    this.randomDirY = Math.sin(angle)

    const t =
      this.randomIntervalMin +
      Math.random() * (this.randomIntervalMax - this.randomIntervalMin)
    this.randomTimer = t
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
    let chasing = false

    // --- 1) если видим кота — преследуем ---
    if (player) {
      const d2 = this.dist2(this.pos_x, this.pos_y, player.pos_x, player.pos_y)
      const inView = d2 <= this.viewRadius * this.viewRadius

      if (inView) {
        let vx = player.pos_x - this.pos_x
        let vy = player.pos_y - this.pos_y
        const len = Math.hypot(vx, vy) || 1
        vx /= len
        vy /= len

        this.move_x = vx
        this.move_y = vy

        chasing = true
      }
    }

    // --- 2) кота не видно — случайное блуждание по карте ---
    if (!chasing) {
      this.randomTimer -= dt
      if (this.randomTimer <= 0) {
        this.pickRandomDirection()
      }

      this.move_x = this.randomDirX
      this.move_y = this.randomDirY
    }

    // --- 3) движение (стены обрабатывает PhysicManager) ---
    this.physicManager.update(this, dt)
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
    this.viewRadius = 140 // маленький обзор
  }
}

export class Enemy2 extends EnemyBase {
  constructor() {
    super()
    this.name = 'Enemy2'
    this.spriteName = 'Enemy2'
    this.speed = 90
    this.baseSpeed = this.speed
    this.viewRadius = 180
  }
}

export class Enemy3 extends EnemyBase {
  constructor() {
    super()
    this.name = 'Enemy3'
    this.spriteName = 'Enemy3'
    this.speed = 110
    this.baseSpeed = this.speed
    this.viewRadius = 220 // самый «зрячий»
  }
}