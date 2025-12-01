// object/Barrier.js
import { Entity } from './Entity.js'

export class Barrier extends Entity {
  constructor() {
    super()

    this.name = 'Barrier'

    // ЖЁСТКО указываем имя спрайта из sprites.json
    this.spriteName = 'Barrier'   // <- тут важно: такое имя должно быть в sprites.json

    this.size_x = 32
    this.size_y = 32

    this.move_x = 0
    this.move_y = 0

    this.isBreaking = false
    this.breakTimer = 0
  }

  update(dt) {
    // барьер сам по себе ничего не делает,
    // логика "разламывания" будет в Player
  }

  draw(ctx) {
    const sm =
      this.spriteManager ||
      (this.gameManager && this.gameManager.spriteManager) ||
      null

    if (sm && this.spriteName && typeof sm.getSprite === 'function') {
      const sprite = sm.getSprite(this.spriteName)
      if (sprite) {
        sm.drawSprite(ctx, this.spriteName, this.pos_x, this.pos_y)
        return
      }
    }

    // если спрайт всё ещё не нашли — рисуем зелёный квадрат
    ctx.fillStyle = 'green'
    ctx.fillRect(this.pos_x, this.pos_y, this.size_x, this.size_y)
  }

  kill() {
    if (this.gameManager && typeof this.gameManager.kill === 'function') {
      this.gameManager.kill(this)
    }
  }
}
