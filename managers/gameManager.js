// managers/gameManager.js
import { mapManager } from './mapManager.js'
import { SpriteManager } from './spriteManager.js'
import { EventsManager } from './eventsManager.js'
import { PhysicManager } from './physicManager.js'
import { SoundManager } from './soundManager.js'

import { Player } from '../object/Player.js'
import { Bonus } from '../object/Bonus.js'
import { Key } from '../object/Key.js'
import { Enemy1, Enemy2, Enemy3 } from '../object/Enemy.js'
import { Exit } from '../object/Exit.js'

export class GameManager {
  constructor() {
    this.canvas = null
    this.ctx = null

    this.mapManager = new mapManager()
    this.spriteManager = new SpriteManager()
    this.eventsManager = new EventsManager()
    this.physicManager = new PhysicManager()
    this.soundManager = new SoundManager()

    this.factory = {}
    this.entities = []
    this.laterKill = []

    this.player = null

    this.spawnFromMapDone = false
    this.entitiesFromMapDone = false
    this.lastTimestamp = 0

    // счёт / уровень / ключи
    this.score = 0
    this.playerName = 'Игрок'
    this.level = 1

    this.keysTotal = 5
    this.keysCollected = 0

    // уровни
    this.canvasId = null
    this.currentConfig = null
    this.nextLevelConfig = null

    // состояние выхода
    this.exitUnlocked = false

    // игра уже завершена / рекорд сохранён
    this.gameFinished = false

    // флаг инициализации звуков
    this._soundInitDone = false
  }

  init(canvasId, config) {
    this.canvasId = canvasId
    this.currentConfig = config || {}

    this.canvas = document.getElementById(canvasId)
    if (!this.canvas) {
      console.error('Не найден canvas с id', canvasId)
      return
    }

    this.ctx = this.canvas.getContext('2d')

    // инициализируем звуки один раз
    if (!this._soundInitDone && this.soundManager && typeof this.soundManager.init === 'function') {
      this.soundManager.init()
      this._soundInitDone = true
    }

    // ---------- сброс состояния уровня ----------
    this.entities = []
    this.laterKill = []
    this.player = null
    this.spawnFromMapDone = false
    this.entitiesFromMapDone = false
    this.lastTimestamp = 0
    this.exitUnlocked = false
    this.gameFinished = false

    // счёт
    if (!config || !config.keepScore) {
      this.score = 0
    }

    // имя игрока — ТОЛЬКО из конфига
    if (config && config.playerName) {
      this.playerName = config.playerName
    }

    this.level =
      config && typeof config.level === 'number'
        ? config.level
        : this.level || 1

    // ключи
    this.keysTotal =
      config && typeof config.keysTotal === 'number'
        ? config.keysTotal
        : 5
    this.keysCollected = 0

    // след. уровень
    this.nextLevelConfig =
      config && config.nextLevelConfig ? config.nextLevelConfig : null

    // ---------- музыка текущего уровня ----------
    if (this.soundManager) {
      this.soundManager.stop('level1')
      this.soundManager.stop('level2')

      if (this.level === 1) {
        this.soundManager.play('level1')
      } else if (this.level === 2) {
        this.soundManager.play('level2')
      }
    }

    // ---------- СБРОС состояния mapManager перед новой картой ----------
    if (this.mapManager) {
      this.mapManager.mapData = null
      this.mapManager.tLayer = null
      this.mapManager.xCount = 0
      this.mapManager.yCount = 0
      this.mapManager.mapSize = { x: 0, y: 0 }

      this.mapManager.tilesets = []
      this.mapManager.imgLoadCount = 0
      this.mapManager.imgLoaded = false
      this.mapManager.jsonLoaded = false

      this.mapManager.objects = []
    }

    // окно просмотра (камера)
    this.mapManager.view = {
      x: 0,
      y: 0,
      w: this.canvas.width,
      h: this.canvas.height,
    }

    if (typeof this.mapManager.setGameManager === 'function') {
      this.mapManager.setGameManager(this)
    }

    // ---------- карта ----------
    this.mapManager.loadMap(config.map)

    // ---------- спрайты ----------
    this.spriteManager.loadAtlas('./img/sprites.json', './img/sprites.png')

    if (config && config.atlasJson && config.atlasImg) {
      this.spriteManager.loadAtlas(config.atlasJson, config.atlasImg)
    }

    // управление
    this.eventsManager.setup(this.canvas)

    // физика: перед новым уровнем обнуляем кэш стен
    if (this.physicManager) {
      if (typeof this.physicManager.resetCollisionCache === 'function') {
        this.physicManager.resetCollisionCache()
      }
      this.physicManager.setManager(this, this.mapManager)
    }

    // ---------- фабрика сущностей ----------
    this.factory['Player'] = Player
    this.factory['player'] = Player

    this.factory['Bonus'] = Bonus
    this.factory['bonus'] = Bonus
    this.factory['cake'] = Bonus

    this.factory['Key'] = Key
    this.factory['key'] = Key

    this.factory['Enemy1'] = Enemy1
    this.factory['enemy1'] = Enemy1

    this.factory['Enemy2'] = Enemy2
    this.factory['enemy2'] = Enemy2

    this.factory['Enemy3'] = Enemy3
    this.factory['enemy3'] = Enemy3

    this.factory['Enemy'] = Enemy2
    this.factory['enemy'] = Enemy2

    this.factory['Exit'] = Exit
    this.factory['exit'] = Exit

    // ---------- создаём игрока (позицию задаст initSpawnFromMap) ----------
    const p = new Player()

    p.pos_x = 0
    p.pos_y = 0

    p.size_x = 24
    p.size_y = 24

    p.speed = p.baseSpeed || 200
    p.spriteName =
      config && config.playerSprite
        ? config.playerSprite
        : 'cat'

    p.eventsManager = this.eventsManager
    p.physicManager = this.physicManager
    p.spriteManager = this.spriteManager
    p.gameManager = this

    this.initPlayer(p)
  }

  initPlayer(obj) {
    this.player = obj
    if (!this.entities.includes(obj)) {
      this.entities.push(obj)
    }
  }

  addScore(points) {
    this.score += points || 0
  }

  kill(obj) {
    this.laterKill.push(obj)
  }

  onKeyCollected(keyEntity) {
    if (keyEntity && keyEntity._collected) return
    if (keyEntity) keyEntity._collected = true

    if (this.keysCollected < this.keysTotal) {
      this.keysCollected += 1
    }

    console.log(`Собрано ключей: ${this.keysCollected}/${this.keysTotal}`)

    if (this.keysCollected >= this.keysTotal) {
      this.unlockExit()
    }
  }

  onPlayerDied() {
    console.log('Игрок погиб')

    if (this.soundManager) {
      this.soundManager.stop('level1')
      this.soundManager.stop('level2')
      this.soundManager.play('game_over')
    }

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.reload()
      }, 400)
    }
  }

  unlockExit() {
    this.exitUnlocked = true
    console.log('Выход разблокирован')
  }

  handleExitTouch(exitEntity) {
    if (!exitEntity) return
    this.tryExit()
  }

  tryExit() {
    if (!this.exitUnlocked) {
      console.log('Выход закрыт, нужно собрать все ключи')
      return
    }
    console.log('Переход на следующий уровень...')
    this.goToNextLevel()
  }

  // ---- Сохранение рекорда и переход на страницу рекордов ----
  finishGame() {
    if (this.gameFinished) return
    this.gameFinished = true

    if (this.soundManager) {
      this.soundManager.stop('level1')
      this.soundManager.stop('level2')
    }

    try {
      const name = this.playerName || 'Игрок'
      const score = this.score || 0

      const result = {
        name,
        score,
        date: new Date().toISOString(),
      }

      const key = 'catGameRecords'
      let records = []
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          records = JSON.parse(raw) || []
        } catch (e) {
          console.warn('Не удалось распарсить старые рекорды', e)
        }
      }

      records.push(result)
      records.sort((a, b) => (b.score || 0) - (a.score || 0))
      records = records.slice(0, 20)

      localStorage.setItem(key, JSON.stringify(records))
      localStorage.setItem('catGameLastResult', JSON.stringify(result))
    } catch (e) {
      console.error('Не удалось сохранить рекорд', e)
    }

    const base = window.location.href.split('#')[0].split('?')[0]
    const dir = base.substring(0, base.lastIndexOf('/') + 1)
    window.location.href = dir + 'records.html'
  }

  goToNextLevel() {
    if (!this.nextLevelConfig) {
      console.log('Последний уровень пройден, переходим к таблице рекордов')
      this.finishGame()
      return
    }

    if (this.soundManager) {
      this.soundManager.play('level_complete')
    }

    const cfg = {
      ...this.nextLevelConfig,
      playerName: this.playerName,
      keepScore: true,
    }

    this.level += 1
    this.init(this.canvasId, cfg)
  }

  // спавн игрока
  initSpawnFromMap() {
    if (!this.mapManager || !this.mapManager.mapData || !this.player) return

    const layers = this.mapManager.mapData.layers || []

    for (const layer of layers) {
      if (layer.type !== 'objectgroup') continue

      const layerOffsetX = layer.offsetx || 0
      const layerOffsetY = layer.offsety || 0
      const objects = layer.objects || []

      for (const obj of objects) {
        if (
          obj.type === 'Cat' ||
          obj.type === 'cat' ||
          obj.type === 'Player' ||
          obj.type === 'player' ||
          obj.name === 'Cat' ||
          obj.name === 'cat'
        ) {
          const isTileObject = typeof obj.gid === 'number'

          const baseX = obj.x + layerOffsetX
          const baseY = obj.y + layerOffsetY

          const spawnX = baseX
          const spawnY = isTileObject ? baseY - obj.height : baseY

          this.player.pos_x = spawnX
          this.player.pos_y = spawnY

          this.spawnFromMapDone = true
          console.log('Spawn игрока из карты:', { spawnX, spawnY, obj })
          return
        }
      }
    }

    if (
      this.currentConfig &&
      typeof this.currentConfig.startX === 'number' &&
      typeof this.currentConfig.startY === 'number'
    ) {
      this.player.pos_x = this.currentConfig.startX
      this.player.pos_y = this.currentConfig.startY
      console.log('Spawn игрока по startX/startY из config')
    } else {
      this.player.pos_x = 32
      this.player.pos_y = 32
      console.warn('На карте нет Cat/Player и нет startX/startY — спавним в (32,32)')
    }

    this.spawnFromMapDone = true
  }

  // ===== логика кадра =====
  update(dt) {
    if (!this.player) return

    if (!this.spawnFromMapDone && this.mapManager && this.mapManager.jsonLoaded) {
      this.initSpawnFromMap()
    }

    if (
      !this.entitiesFromMapDone &&
      this.mapManager &&
      this.mapManager.jsonLoaded &&
      this.mapManager.imgLoaded
    ) {
      if (typeof this.mapManager.parseEntities === 'function') {
        this.mapManager.parseEntities()
      }
      this.entitiesFromMapDone = true

      this.entities = this.entities.filter((e) => {
        if (e instanceof Player && e !== this.player) {
          return false
        }
        return true
      })

      this.entities.forEach((e) => {
        if (e instanceof Exit) {
          if (!e.spriteName || e.spriteName === 'Exit' || e.spriteName === 'exit') {
            e.spriteName = 'Ex1'
          }
        }
      })
    }

    this.entities.forEach((e) => {
      if (typeof e.update === 'function') {
        try {
          e.update(dt)
        } catch (err) {
          console.error('Ошибка в update сущности', e, err)
        }
      }
    })

    if (this.laterKill.length) {
      this.laterKill.forEach((obj) => {
        const idx = this.entities.indexOf(obj)
        if (idx !== -1) this.entities.splice(idx, 1)
      })
      this.laterKill.length = 0
    }
  }

  drawHUD() {
    if (!this.ctx) return
    const ctx = this.ctx

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(8, 8, 220, 52)

    ctx.fillStyle = '#ffffff'
    ctx.font = '14px sans-serif'

    const lives = this.player ? this.player.lives : 0
    const maxLives = this.player ? this.player.maxLives : 3

    ctx.fillText(`Жизни: ${lives}/${maxLives}`, 16, 26)
    ctx.fillText(`Счёт: ${this.score}`, 16, 44)
    ctx.fillText(`Ключи: ${this.keysCollected}/${this.keysTotal}`, 120, 26)

    ctx.restore()
  }

  draw() {
    if (!this.ctx || !this.mapManager) return

    if (this.player) {
      this.mapManager.centerAt(this.player.pos_x, this.player.pos_y)
    }

    // 1. фоновые тайловые слои (без above=true)
    this.mapManager.draw(this.ctx, 'background')

    // 2. при необходимости — отладочная подсветка стен
    if (
      this.physicManager &&
      this.physicManager.debugDraw &&
      typeof this.physicManager.drawDebugColliders === 'function'
    ) {
      this.physicManager.drawDebugColliders(this.ctx)
    }

    // 3. кот, враги, ключи, тортики и т.п.
    this.entities.forEach((e) => {
      if (e && typeof e.draw === 'function') {
        e.draw(this.ctx)
      }
    })

    // 4. верхние тайловые слои (украшения с above=true)
    this.mapManager.draw(this.ctx, 'foreground')

    // 5. HUD поверх всего
    this.drawHUD()
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
    requestAnimationFrame(this.loop)
  }
}
