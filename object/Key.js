// object/Key.js
import { Entity } from './Entity.js'

export class Key extends Entity {
  constructor() {
    super()

    this.name = 'Key'
    this.spriteName = 'key' // имя из sprites.json

    this.gameManager = null
    this.spriteManager = null

    this.value = 100 // очки за ключ
  }

  update(dt) {
    // ключ статичен
  }

  draw(ctx) {
    if (this.spriteManager && this.spriteName) {
      this.spriteManager.drawSprite(ctx, this.spriteName, this.pos_x, this.pos_y)
    } else {
      ctx.fillStyle = 'yellow'
      ctx.beginPath()
      ctx.moveTo(this.pos_x + this.size_x / 2, this.pos_y)
      ctx.lineTo(this.pos_x + this.size_x, this.pos_y + this.size_y / 2)
      ctx.lineTo(this.pos_x + this.size_x / 2, this.pos_y + this.size_y)
      ctx.lineTo(this.pos_x, this.pos_y + this.size_y / 2)
      ctx.closePath()
      ctx.fill()
    }
  }

  onTouchEntity(other) {
    if (!other || other.name !== 'player' || !this.gameManager) return

    if (typeof this.gameManager.addScore === 'function') {
      this.gameManager.addScore(this.value)
    }

    if (typeof this.gameManager.onKeyCollected === 'function') {
      this.gameManager.onKeyCollected(this)
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
