import { mapManager } from './mapManager.js'
import { SpriteManager } from './spriteManager.js'
import { EventsManager } from './eventsManager.js'
import { PhysicManager } from './physicManager.js'
import { Player } from '../object/Player.js'

export class GameManager {
  constructor() {
    console.log('GameManager constructor')
    this.canvas = null
    this.ctx = null

    this.mapManager = new mapManager()
    this.spriteManager = new SpriteManager()
    this.eventsManager = new EventsManager()
    this.physicManager = new PhysicManager()

    this.player = null
    this.lastTimestamp = 0
  }

  init(canvasId, config) {
    console.log('GameManager.init', config)

    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) {
      console.error('Не найден canvas с id', canvasId)
      return
    }

    this.ctx = this.canvas.getContext('2d')

    // --- карта ---
    this.mapManager.view = {
      x: 0,
      y: 0,
      w: this.canvas.width,
      h: this.canvas.height,
    }
    this.mapManager.loadMap(config.map)

    // --- спрайты ---
    this.spriteManager.loadAtlas(config.atlasJson, config.atlasImg)

    // --- события управления ---
    this.eventsManager.setup(this.canvas)

    // --- физика ---
    this.physicManager.setManager(this, this.mapManager)

    // --- игрок ---
    this.player = new Player()
    this.player.pos_x = config.startX ?? 100
    this.player.pos_y = config.startY ?? 100
    this.player.size_x = 32
    this.player.size_y = 32
    this.player.speed = 2
    this.player.spriteName = config.playerSprite ?? 'cat_ginger_1'
  }

  update(dt) {
    if (!this.player) return

    const a = this.eventsManager.action
    this.player.move_x = 0
    this.player.move_y = 0

    if (a.up) this.player.move_y = -1
    if (a.down) this.player.move_y = 1
    if (a.left) this.player.move_x = -1
    if (a.right) this.player.move_x = 1

    if (this.player.move_x !== 0 && this.player.move_y !== 0) {
      const k = Math.SQRT1_2
      this.player.move_x *= k
      this.player.move_y *= k
    }

    this.physicManager.update(this.player, dt)
  }

  draw() {
    if (!this.ctx) return

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.mapManager.mapData) {
      this.mapManager.draw(this.ctx)
    }

    if (this.spriteManager.imgLoaded && this.spriteManager.jsonLoaded && this.player) {
      this.spriteManager.drawSprite(
        this.ctx,
        this.player.spriteName,
        this.player.pos_x,
        this.player.pos_y,
      )
    }
  }

  loop = (timestamp) => {
    const dt = (timestamp - this.lastTimestamp) / 1000 || 0
    this.lastTimestamp = timestamp

    try {
      this.update(dt)
      this.draw()
    } catch (e) {
      console.error('Ошибка в game loop:', e)
    }

    requestAnimationFrame(this.loop)
  }

  start() {
    console.log('GameManager.start')
    requestAnimationFrame(this.loop)
  }
}
