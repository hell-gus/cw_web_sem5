// object/Player.js
import { Entity } from './Entity.js'

export class Player extends Entity {
  constructor() {
    super()

    this.name = 'player'

    // движение
    this.move_x = 0
    this.move_y = 0

    // размеры хитбокса
    this.size_x = 24
    this.size_y = 24

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

    // направление взгляда: 1 — вправо, -1 — влево
    this.facing = 1
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

    // обновляем направление только по горизонтали
    if (this.move_x > 0) {
      this.facing = 1   // вправо
    } else if (this.move_x < 0) {
      this.facing = -1  // влево
    }
    // если move_x === 0, facing не меняем → при движении вверх/вниз
    // кот смотрит в последнюю горизонтальную сторону

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

    const sm =
      this.spriteManager ||
      (this.gameManager && this.gameManager.spriteManager) ||
      null

    if (sm && this.spriteName && typeof sm.getSprite === 'function') {
      const sprite = sm.getSprite(this.spriteName)
      if (sprite) {
        ctx.save()

        // пока действует неуязвимость — мигаем/полупрозрачные
        if (this.invulnTimer > 0) {
          ctx.globalAlpha = 0.6
        }

        const x = this.pos_x + this.spriteOffsetX
        const y = this.pos_y + this.spriteOffsetY

        if (this.facing === -1) {
          // смотрит влево — зеркалим по X
          ctx.translate(x + sprite.w, y)
          ctx.scale(-1, 1)
          sm.drawSprite(ctx, this.spriteName, 0, 0)
        } else {
          // смотрит вправо — как обычно
          sm.drawSprite(ctx, this.spriteName, x, y)
        }

        ctx.restore()
        return
      }
    }

    // запасной вариант — оранжевый квадрат
    ctx.fillStyle = 'orange'
    ctx.fillRect(this.pos_x, this.pos_y, this.size_x, this.size_y)
  }

  onTouchEntity(obj) {
    if (!obj || this.isDead) return

    const gm = this.gameManager

    // ===== ВРАГИ =====
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

      // звук удара по коту
      if (gm && gm.soundManager) {
        gm.soundManager.play('cat_hit')
      }

      console.log(`Кот получил урон, жизни: ${this.lives}/${this.maxLives}`)

      // если жизни закончились — смерть
      if (this.lives <= 0) {
        this.isDead = true
        if (gm && typeof gm.onPlayerDied === 'function') {
          gm.onPlayerDied()
        }
      }
      return
    }

    // ===== КЛЮЧИ =====
    const isKey =
      obj.name === 'Key' ||
      obj.name === 'key' ||
      obj.type === 'Key' ||
      obj.type === 'key'

    if (isKey) {
      // звук сбора ключа
      if (gm && gm.soundManager) {
        gm.soundManager.play('key_pickup')
      }

      if (gm && typeof gm.onKeyCollected === 'function') {
        gm.onKeyCollected(obj)
      }
      if (gm && typeof gm.kill === 'function') {
        gm.kill(obj)
      }
      return
    }

    // ===== БОНУСЫ (вкусняшки) =====
    const isBonus =
      obj.name === 'Bonus' ||
      obj.name === 'bonus' ||
      obj.type === 'Bonus' ||
      obj.type === 'bonus' ||
      obj.name === 'cake'

    if (isBonus) {
      // ускорение кота, например до 280 на 3 секунды
      this.applySpeedBoost(280, 3)

      // звук вкусняшки
      if (gm && gm.soundManager) {
        gm.soundManager.play('cake_pickup')
      }

      if (gm && typeof gm.addScore === 'function') {
        gm.addScore(10)
      }
      if (gm && typeof gm.kill === 'function') {
        gm.kill(obj)
      }
      return
    }

    // ===== ВЫХОД (EXIT) =====
    const isExit =
      obj.name === 'Exit' ||
      obj.name === 'exit' ||
      obj.type === 'Exit' ||
      obj.type === 'exit'

    if (isExit) {
      if (gm && typeof gm.tryExit === 'function') {
        gm.tryExit()
      }
      return
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
    // не понижаем скорость, если уже быстрее
    if (boostSpeed <= this.speed) return
    this.speed = boostSpeed
    this.speedBoostTimer = duration
  }
}
