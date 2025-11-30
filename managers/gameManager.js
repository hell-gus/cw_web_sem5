// managers/gameManager.js
import { mapManager } from './mapManager.js'
import { SpriteManager } from './spriteManager.js'
import { EventsManager } from './eventsManager.js'
import { PhysicManager } from './physicManager.js'

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
    this.canvasId = null          // какой canvas используем
    this.currentConfig = null     // конфиг текущего уровня
    this.nextLevelConfig = null   // конфиг следующего уровня

    // состояние выхода
    this.exitUnlocked = false
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

    // сброс внутреннего состояния при запуске уровня
    this.entities = []
    this.laterKill = []
    this.player = null
    this.spawnFromMapDone = false
    this.entitiesFromMapDone = false
    this.lastTimestamp = 0
    this.exitUnlocked = false

    // игрок / уровень
    if (!config || !config.keepScore) {
      this.score = 0
    }

    if (config && config.playerName) {
      this.playerName = config.playerName
    }

    this.level =
      config && typeof config.level === 'number'
        ? config.level
        : this.level || 1

    // ключи можно переопределить через config
    this.keysTotal =
      config && typeof config.keysTotal === 'number'
        ? config.keysTotal
        : 5
    this.keysCollected = 0

    // запоминаем конфиг следующего уровня, если передали
    this.nextLevelConfig =
      config && config.nextLevelConfig ? config.nextLevelConfig : null

    // окно просмотра карты
    this.mapManager.view = {
      x: 0,
      y: 0,
      w: this.canvas.width,
      h: this.canvas.height,
    }

    // даём карте доступ к gameManager
    if (typeof this.mapManager.setGameManager === 'function') {
      this.mapManager.setGameManager(this)
    }

    // карта + спрайты
    this.mapManager.loadMap(config.map)
    this.spriteManager.loadAtlas(config.atlasJson, config.atlasImg)

    // управление
    this.eventsManager.setup(this.canvas)

    // физика
    this.physicManager.setManager(this, this.mapManager)

    // ---------- фабрика сущностей ----------

    // игрок — создаём вручную
    this.factory['Player'] = Player
    this.factory['player'] = Player

    // бонус (вкусняшка)
    this.factory['Bonus'] = Bonus
    this.factory['bonus'] = Bonus
    this.factory['cake'] = Bonus

    // ключ
    this.factory['Key'] = Key
    this.factory['key'] = Key

    // враги — три типа
    this.factory['Enemy1'] = Enemy1
    this.factory['enemy1'] = Enemy1

    this.factory['Enemy2'] = Enemy2
    this.factory['enemy2'] = Enemy2

    this.factory['Enemy3'] = Enemy3
    this.factory['enemy3'] = Enemy3

    // если в Tiled type = "Enemy" — пусть будет Enemy2
    this.factory['Enemy'] = Enemy2
    this.factory['enemy'] = Enemy2

    // выход
    this.factory['Exit'] = Exit
    this.factory['exit'] = Exit

    // ---------- создаём игрока вручную ----------
    const p = new Player()
    p.pos_x =
      config && typeof config.startX === 'number'
        ? config.startX
        : 100
    p.pos_y =
      config && typeof config.startY === 'number'
        ? config.startY
        : 100

    // хитбокс кота
    p.size_x = 24
    p.size_y = 24

    p.speed = p.baseSpeed || 200
    p.spriteName =
      config && config.playerSprite
        ? config.playerSprite
        : 'cat'

    // ссылки на менеджеры
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
    // защита от повторного учёта одного и того же ключа
    if (keyEntity && keyEntity._collected) {
      return
    }
    if (keyEntity) {
      keyEntity._collected = true
    }

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
    if (typeof window !== 'undefined') {
      // можно сделать рестарт уровня вместо reload:
      // this.init(this.canvasId, { ...this.currentConfig, keepScore: false })
      window.location.reload()
    }
  }

  unlockExit() {
    this.exitUnlocked = true
    console.log('Выход разблокирован')
  }

  // кот коснулся объекта Exit → пробуем перейти
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

  // переход на следующий уровень без level2.html
  goToNextLevel() {
    if (!this.nextLevelConfig) {
      console.warn('nextLevelConfig не задан — следующего уровня нет')
      return
    }

    const cfg = {
      ...this.nextLevelConfig,
      playerName: this.playerName,
      keepScore: true, // сохраняем счёт
    }

    this.level += 1
    this.init(this.canvasId, cfg)
  }

  // спавн игрока по объекту Cat/Player с карты (только координаты)
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

    this.spawnFromMapDone = true
  }

  // ===== логика кадра =====
  update(dt) {
    if (!this.player) return

    // ждём, пока карта загрузится, чтобы сдвинуть кота на точку спауна
    if (!this.spawnFromMapDone && this.mapManager && this.mapManager.jsonLoaded) {
      this.initSpawnFromMap()
    }

    // создаём сущности из objectgroup слоёв ОДИН РАЗ,
    // когда и json, и картинки карты уже загружены
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

      // на случай, если parseEntities создал ещё одного Player —
      // оставляем только того, кто в this.player
      this.entities = this.entities.filter((e) => {
        if (e instanceof Player && e !== this.player) {
          return false
        }
        return true
      })

      // фикс для Exit: если parseEntities переопределил spriteName = "Exit",
      // возвращаем нормальный кадр из атласа ("Ex1")
      this.entities.forEach((e) => {
        if (e instanceof Exit) {
          if (!e.spriteName || e.spriteName === 'Exit' || e.spriteName === 'exit') {
            e.spriteName = 'Ex1'
          }
        }
      })
    }

    // обновляем все сущности
    this.entities.forEach((e) => {
      if (typeof e.update === 'function') {
        try {
          e.update(dt)
        } catch (err) {
          console.error('Ошибка в update сущности', e, err)
        }
      }
    })

    // отложенное удаление
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

    this.mapManager.draw(this.ctx)

    // дебаг-коллайдеры, если включено
    if (
      this.physicManager &&
      this.physicManager.debugDraw &&
      typeof this.physicManager.drawDebugColliders === 'function'
    ) {
      this.physicManager.drawDebugColliders(this.ctx)
    }

    this.entities.forEach((e) => {
      if (e && typeof e.draw === 'function') {
        e.draw(this.ctx)
      }
    })

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
