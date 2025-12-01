'use strict'

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000
const FLIPPED_VERTICALLY_FLAG   = 0x40000000
const FLIPPED_DIAGONALLY_FLAG   = 0x20000000
const GID_MASK                  = 0x1FFFFFFF

export class mapManager {
  constructor() {
    this.mapData = null        // данные карты
    this.tLayer = null         // первый тайловый слой
    this.xCount = 0
    this.yCount = 0
    this.tSize  = { x: 32, y: 32 }
    this.mapSize = { x: 0, y: 0 }
    this.tilesets = []
    this.imgLoadCount = 0
    this.imgLoaded = false
    this.jsonLoaded = false
    this.view = { x: 0, y: 0, w: 0, h: 0 } // окно камеры

    this.gameManager = null
    this.objects = []          // объекты из object-слоёв
  }

  // загрузка карты из json
  loadMap(path) {
    // сбрасываем состояние перед новой картой
    this.mapData = null
    this.tLayer = null
    this.xCount = 0
    this.yCount = 0
    this.mapSize = { x: 0, y: 0 }

    this.tilesets = []
    this.imgLoadCount = 0
    this.imgLoaded = false
    this.jsonLoaded = false

    this.objects = []

    const request = new XMLHttpRequest()

    request.onreadystatechange = () => {
      if (request.readyState === 4) {
        if (request.status === 200 || request.status === 0) {
          this.parseMap(request.responseText)
        } else {
          console.error(`Не удалось загрузить карту: ${path}`)
        }
      }
    }

    request.open('GET', path, true)
    request.send()
  }

  setGameManager(gameManager) {
    this.gameManager = gameManager
  }

  // разбор json карты
  parseMap(tilesJSON) {
    this.mapData = JSON.parse(tilesJSON)

    this.xCount = this.mapData.width
    this.yCount = this.mapData.height

    this.tSize.x = this.mapData.tilewidth
    this.tSize.y = this.mapData.tileheight

    this.mapSize.x = this.xCount * this.tSize.x
    this.mapSize.y = this.yCount * this.tSize.y

    this.tilesets = []
    this.imgLoadCount = 0
    this.imgLoaded = false

    for (let i = 0; i < this.mapData.tilesets.length; i++) {
      const t = this.mapData.tilesets[i]
      const img = new Image()

      img.onload = () => {
        this.imgLoadCount++
        if (this.imgLoadCount === this.tilesets.length) {
          this.imgLoaded = true
        }
      }
      img.src = t.image

      const ts = {
        firstgid: t.firstgid,
        image: img,
        name: t.name,
        xCount: Math.floor(t.imagewidth  / t.tilewidth),
        yCount: Math.floor(t.imageheight / t.tileheight),
        tSize: { x: t.tilewidth, y: t.tileheight },
      }
      this.tilesets.push(ts)
    }

    // запоминаем первый тайловый слой для getTilesetId
    this.tLayer = null
    for (let l = 0; l < this.mapData.layers.length; l++) {
      const layer = this.mapData.layers[l]
      if (layer.type === 'tilelayer') {
        this.tLayer = layer
        break
      }
    }

    // кеш объектов из object-слоёв
    this.objects = []
    for (const layer of this.mapData.layers) {
      if (layer.type === 'objectgroup') {
        const objs = layer.objects || []
        this.objects.push(...objs)
      }
    }

    this.jsonLoaded = true
  }

  // проверка, что слой должен рисоваться поверх объектов
  isAboveLayer(layer) {
    const props = layer.properties || []
    return props.some((p) => p.name === 'above' && p.value === true)
  }

  // отрисовка тайлов
  // mode:
  //  'all'        — все слои
  //  'background' — только без above=true
  //  'foreground' — только above=true
  draw(ctx, mode = 'all') {
    if (!this.imgLoaded || !this.jsonLoaded) {
      setTimeout(() => this.draw(ctx, mode), 100)
      return
    }

    if (mode === 'all' || mode === 'background') {
      ctx.clearRect(0, 0, this.view.w, this.view.h)
    }

    const tileLayers = this.mapData.layers.filter(
      (layer) => layer.type === 'tilelayer' && layer.visible
    )

    for (const layer of tileLayers) {
      const above = this.isAboveLayer(layer)

      if (mode === 'background' && above) continue
      if (mode === 'foreground' && !above) continue

      const data = layer.data

      for (let i = 0; i < data.length; i++) {
        const rawId = data[i]
        if (!rawId) continue

        const flippedH = (rawId & FLIPPED_HORIZONTALLY_FLAG) !== 0
        const flippedV = (rawId & FLIPPED_VERTICALLY_FLAG) !== 0
        const flippedD = (rawId & FLIPPED_DIAGONALLY_FLAG) !== 0

        const gid = rawId & GID_MASK
        if (gid === 0) continue

        const tile = this.getTile(gid)
        if (!tile) continue

        const mapX = (i % this.xCount) * this.tSize.x
        const mapY = Math.floor(i / this.xCount) * this.tSize.y

        if (!this.isVisible(mapX, mapY, this.tSize.x, this.tSize.y)) continue

        const screenX = mapX - this.view.x
        const screenY = mapY - this.view.y

        ctx.save()

        const cx = screenX + this.tSize.x / 2
        const cy = screenY + this.tSize.y / 2

        ctx.translate(cx, cy)

        if (flippedD) {
          ctx.rotate((90 * Math.PI) / 180)
          ctx.scale(-1, 1)
        }
        if (flippedH) {
          ctx.scale(-1, 1)
        }
        if (flippedV) {
          ctx.scale(1, -1)
        }

        ctx.translate(-this.tSize.x / 2, -this.tSize.y / 2)

        ctx.drawImage(
          tile.img,
          tile.px,
          tile.py,
          this.tSize.x,
          this.tSize.y,
          0,
          0,
          this.tSize.x,
          this.tSize.y
        )

        ctx.restore()
      }
    }
  }

  // работа с тайлами/тайлсетами
  getTile(tileIndex) {
    const tileset = this.getTileset(tileIndex)
    if (!tileset) return null

    const id = tileIndex - tileset.firstgid
    const x = id % tileset.xCount
    const y = Math.floor(id / tileset.xCount)

    return {
      img: tileset.image,
      px: x * this.tSize.x,
      py: y * this.tSize.y,
    }
  }

  getTileset(tileIndex) {
    for (let i = this.tilesets.length - 1; i >= 0; i--) {
      if (this.tilesets[i].firstgid <= tileIndex) {
        return this.tilesets[i]
      }
    }
    return null
  }

  // проверка, попадает ли тайл в окно камеры
  isVisible(x, y, width, height) {
    if (x + width  < this.view.x)            return false
    if (y + height < this.view.y)            return false
    if (x > this.view.x + this.view.w)       return false
    if (y > this.view.y + this.view.h)       return false
    return true
  }

  // создание игровых объектов из object-слоёв

parseEntities() {
  // ждём, пока карта и тайлы загрузятся
  if (!this.imgLoaded || !this.jsonLoaded || !this.gameManager) {
    setTimeout(() => this.parseEntities(), 100)
    return
  }

  const gm = this.gameManager
  if (!gm.factory) return

  // очищаем старый список объектов
  this.objects = []

  for (const layer of this.mapData.layers) {
    if (layer.type !== 'objectgroup') continue

    const layerOffsetX = layer.offsetx || 0
    const layerOffsetY = layer.offsety || 0
    const entities = layer.objects || []

    for (const e of entities) {
      try {
        const keyName = e.name || ''   // Enemy1 / Enemy2 / Enemy3 / Key / Exit / Barrier ...
        const keyType = e.type || ''   // Enemy / Key / Exit / Barrier ...

        // 1) сначала ищем по name (Enemy1), потом по type (Enemy),
        // 2) потом пробуем те же варианты в нижнем регистре
        let EntityClass =
          (keyName && gm.factory[keyName]) ||
          (keyType && gm.factory[keyType]) ||
          (keyName && gm.factory[keyName.toLowerCase()]) ||
          (keyType && gm.factory[keyType.toLowerCase()])

        if (!EntityClass) {
          console.warn('Нет класса для объекта карты:', e)
          continue
        }

        const obj = new EntityClass()

        // имя объекта внутри игры
        obj.name = keyName || keyType || obj.name || ''

        // спрайт — тоже сначала по name, потом по type
        if ('spriteName' in obj) {
          if (keyName) {
            obj.spriteName = keyName
          } else if (keyType) {
            obj.spriteName = keyType
          }
        }

        // координаты с учётом смещения слоя
        const isTileObject = typeof e.gid === 'number'
        const baseX = e.x + layerOffsetX
        const baseY = e.y + layerOffsetY

        obj.pos_x = baseX
        obj.pos_y = isTileObject ? baseY - e.height : baseY

        // хитбоксы если заданы в Tiled
        if (e.width) obj.size_x = e.width
        if (e.height) obj.size_y = e.height

        // ссылки на менеджеры
        obj.gameManager = gm
        obj.spriteManager = gm.spriteManager
        if ('physicManager' in obj) {
          obj.physicManager = gm.physicManager
        }

        gm.entities.push(obj)
        this.objects.push(obj)
      } catch (err) {
        console.error('Ошибка создания сущности из объекта карты', e, err)
      }
    }
  }
}



  // вернуть gid тайла по мировым координатам (нужно для коллизий)
  getTilesetId(x, y) {
    if (!this.tLayer) return 0

    const tileX = Math.floor(x / this.tSize.x)
    const tileY = Math.floor(y / this.tSize.y)

    if (tileX < 0 || tileX >= this.xCount || tileY < 0 || tileY >= this.yCount) {
      return 0
    }

    const idx = tileY * this.xCount + tileX
    return this.tLayer.data[idx] & GID_MASK
  }

  // центрируем камеру на точке (x, y)
  centerAt(x, y) {
    // по горизонтали
    if (x < this.view.w / 2) {
      this.view.x = 0
    } else if (x > this.mapSize.x - this.view.w / 2) {
      this.view.x = this.mapSize.x - this.view.w
    } else {
      this.view.x = x - this.view.w / 2
    }

    // по вертикали
    if (y < this.view.h / 2) {
      this.view.y = 0
    } else if (y > this.mapSize.y - this.view.h / 2) {
      this.view.y = this.mapSize.y - this.view.h
    } else {
      this.view.y = y - this.view.h / 2
    }
  }
}
