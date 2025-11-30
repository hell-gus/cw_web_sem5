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

    // флаг, что ключ уже подобран и не должен считаться повторно
    this._collected = false
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
    // уже подобран → игнор
    if (this._collected) return

    if (!other || !this.gameManager) return

    // считаем, что это игрок, если:
    // 1) это ровно текущий player из GameManager
    // ИЛИ
    // 2) имя сущности — "player"/"Player"
    const otherName = (other.name || '').toLowerCase()
    const isPlayer =
      other === this.gameManager.player || otherName === 'player'

    if (!isPlayer) return

    // помечаем как подобранный, чтобы не сработать ещё раз
    this._collected = true

    if (typeof this.gameManager.addScore === 'function') {
      this.gameManager.addScore(this.value)
    }

    if (typeof this.gameManager.onKeyCollected === 'function') {
      this.gameManager.onKeyCollected(this)
    }

    // убираем ключ из игры
    this.gameManager.kill(this)
  }

  onTouchMap() {}

  kill() {
    // если вдруг kill вызовут напрямую — тоже не даём двойной учёт
    if (this._collected) return
    this._collected = true

    if (this.gameManager) {
      this.gameManager.kill(this)
    }
  }
}
