// object/Player.js
import { Entity } from './Entity.js'

export class Player extends Entity {
  constructor() {
    super()

    this.name = 'player'

    // движение
    this.move_x = 0
    this.move_y = 0

    // жизни
    this.lives = 3          // текущее число жизней
    this.maxLives = 3       // максимум жизней

    // флаг смерти
    this.isDead = false

    // "неуязвимость" после удара, чтобы не сносило все жизни за один кадр
    this.invulnTimer = 0        // сколько ещё секунд нельзя получать урон
    this.invulnDuration = 1.0   // 1 секунда неуязвимости после удара

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
    if (this.isDead) return

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

    // таймер неуязвимости
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt
      if (this.invulnTimer < 0) this.invulnTimer = 0
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
    if (!obj || this.isDead) return

    // враги по имени
    const isEnemy =
      obj.name === 'Enemy1' ||
      obj.name === 'Enemy2' ||
      obj.name === 'Enemy3' ||
      obj.type === 'Enemy'

    if (isEnemy) {
      // если ещё действует неуязвимость — урон не получаем
      if (this.invulnTimer > 0) return

      // получаем урон: -1 жизнь
      this.lives -= 1
      if (this.lives < 0) this.lives = 0

      // включаем неуязвимость на секунду
      this.invulnTimer = this.invulnDuration

      console.log(`Кот получил урон, жизни: ${this.lives}/${this.maxLives}`)

      // если жизни закончились — смерть
      if (this.lives <= 0) {
        this.isDead = true
        if (this.gameManager && typeof this.gameManager.onPlayerDied === 'function') {
          this.gameManager.onPlayerDied()
        }
      }
    }
  }

  onTouchMap(tileIndex) {
    // если нужно — можно обрабатывать урон от ловушек / шипов и т.п.
  }

  kill() {
    this.lives = 0
    this.isDead = true
    if (this.gameManager && typeof this.gameManager.onPlayerDied === 'function') {
      this.gameManager.onPlayerDied()
    }
  }

  // применить ускорение от вкусняшки
  applySpeedBoost(boostSpeed, duration) {
    if (boostSpeed <= this.baseSpeed) return
    this.speed = boostSpeed
    this.speedBoostTimer = duration
  }
}
