// object/Player.js
import { Entity } from './Entity.js'

export class Player extends Entity {
  constructor() {
    super()

    this.name = 'player'
    this.lifetime = 100

    // движение
    this.move_x = 0
    this.move_y = 0

    // жизни
    this.lives = 3
    this.maxLives = 3

    // скорость
    this.baseSpeed = 200
    this.speed = this.baseSpeed
    this.speedBoostTimer = 0 // сколько ещё секунд действует ускорение

    // имя спрайта из sprites.json
    this.spriteName = 'cat'

    // ссылки на менеджеры
    this.eventsManager = null
    this.physicManager = null
    this.spriteManager = null
    this.gameManager = null

    // смещение спрайта, чтобы лапы не залезали на стену
    this.spriteOffsetX = 0
    this.spriteOffsetY = -6
  }

  update(dt) {
    if (!this.eventsManager || !this.physicManager) return

    const a = this.eventsManager.action || {}

    this.move_x = 0
    this.move_y = 0

    if (a.up) this.move_y = -1
    if (a.down) this.move_y = 1
    if (a.left) this.move_x = -1
    if (a.right) this.move_x = 1

    // нормализация диагонали
    if (this.move_x !== 0 && this.move_y !== 0) {
      const k = Math.SQRT1_2
      this.move_x *= k
      this.move_y *= k
    }

    // таймер ускорения
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt
      if (this.speedBoostTimer <= 0) {
        this.speedBoostTimer = 0
        this.speed = this.baseSpeed
      }
    }

    // движение + столкновения со стенами
    this.physicManager.update(this, dt)

    // столкновения с другими сущностями
    if (this.gameManager && Array.isArray(this.gameManager.entities)) {
      for (const e of this.gameManager.entities) {
        if (!e || e === this) continue

        const intersect =
          this.pos_x < e.pos_x + e.size_x &&
          this.pos_x + this.size_x > e.pos_x &&
          this.pos_y < e.pos_y + e.size_y &&
          this.pos_y + this.size_y > e.pos_y

        if (intersect) {
          if (typeof this.onTouchEntity === 'function') {
            this.onTouchEntity(e)
          }
          if (typeof e.onTouchEntity === 'function') {
            e.onTouchEntity(this)
          }
        }
      }
    }
  }

  draw(ctx) {
    if (!ctx) return

    const sm = this.spriteManager

    // если спрайт найден — рисуем кота
    if (sm && this.spriteName && typeof sm.getSprite === 'function') {
      const sprite = sm.getSprite(this.spriteName)
      if (sprite) {
        sm.drawSprite(
          ctx,
          this.spriteName,
          this.pos_x + this.spriteOffsetX,
          this.pos_y + this.spriteOffsetY,
        )
        return
      }
    }

    // запасной вариант — оранжевый квадрат
    ctx.fillStyle = 'orange'
    ctx.fillRect(this.pos_x, this.pos_y, this.size_x, this.size_y)
  }

  onTouchEntity(obj) {
    if (!obj) return

    // враги
    if (obj.name === 'Enemy1' || obj.name === 'Enemy2' || obj.name === 'Enemy3') {
      this.lifetime -= 10
      // тут можно уменьшать жизни, показывать анимацию и т.п.
    }
  }

  onTouchMap(tileIndex) {}

  kill() {
    this.lifetime = 0
  }

  // применить ускорение от вкусняшки
  applySpeedBoost(boostSpeed, duration) {
    if (boostSpeed <= this.baseSpeed) return
    this.speed = boostSpeed
    this.speedBoostTimer = duration
  }
}
