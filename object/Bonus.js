// object/Bonus.js
import { Entity } from './Entity.js'

export class Bonus extends Entity {
  constructor() {
    super()
    this.name = 'Bonus'

    // имя спрайта из sprites.json
    this.spriteName = 'cake'

    this.gameManager = null
    this.spriteManager = null

    this.value = 100 // очки за бонус

    // параметры ускорения
    this.speedBoostAmount = 300   // скорость во время буста
    this.speedBoostDuration = 3   // секунды
  }

  update(dt) {
    // бонус статичен
  }

  draw(ctx) {
    if (this.spriteManager && this.spriteName) {
      this.spriteManager.drawSprite(ctx, this.spriteName, this.pos_x, this.pos_y)
    } else {
      ctx.fillStyle = 'gold'
      ctx.beginPath()
      ctx.arc(
        this.pos_x + this.size_x / 2,
        this.pos_y + this.size_y / 2,
        Math.min(this.size_x, this.size_y) / 2,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }

  onTouchEntity(other) {
    if (!other || other.name !== 'player' || !this.gameManager) return

    const player = other

    // всегда +100 очков
    if (typeof this.gameManager.addScore === 'function') {
      this.gameManager.addScore(this.value)
    }

    // если жизней меньше 3: +жизнь
    if (player.lives < player.maxLives) {
      player.lives += 1
      if (player.lives > player.maxLives) {
        player.lives = player.maxLives
      }
    } else {
      // жизней 3: шанс на ускорение
      const roll = Math.random()
      if (roll >= 0.5 && typeof player.applySpeedBoost === 'function') {
        player.applySpeedBoost(this.speedBoostAmount, this.speedBoostDuration)
      }
    }

    this.gameManager.kill(this)
  }

  onTouchMap() {}

  kill() {
    if (this.gameManager) {
      this.gameManager.kill(this)
    }
  }
}
