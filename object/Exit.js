// object/Exit.js
import { Entity } from './Entity.js'

export class Exit extends Entity {
  constructor() {
    super()

    this.name = 'Exit'
    this.type = 'Exit'

    // размер ячейки; mapManager потом может перезаписать из Tiled
    this.size_x = 32
    this.size_y = 32

    // кадр из твоего sprites.json
    // ("Ex1", "Ex2", "Ex3" или "Ex4" – выбери любой)
    this.spriteName = 'Ex1'

    this.spriteManager = null
    this.gameManager = null
  }

  update(dt) {
    // выход сам не двигается
  }

  draw(ctx) {
    if (!ctx) return

    const gm = this.gameManager
    const sm =
      this.spriteManager ||
      (gm && gm.spriteManager) ||
      null

    // пробуем нарисовать спрайт из атласа
    if (sm && this.spriteName && typeof sm.getSprite === 'function') {
      const sprite = sm.getSprite(this.spriteName)
      if (sprite) {
        sm.drawSprite(ctx, this.spriteName, this.pos_x, this.pos_y)
        return
      }
    }

    // запасной вариант — зелёный квадратик
    ctx.save()
    ctx.fillStyle = 'rgba(0, 255, 0, 0.35)'
    ctx.fillRect(this.pos_x, this.pos_y, this.size_x, this.size_y)
    ctx.restore()
  }
}
