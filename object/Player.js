import { Entity } from './Entity.js'

export class Player extends Entity {
  constructor() {
    super()
    this.lifetime = 100
    this.move_x = 0
    this.move_y = 0
    this.speed = 2
    this.spriteName = 'cat_ginger_1'
  }

  update() {}
  draw() {}
  kill() {}
  onTouchMap() {}
}
