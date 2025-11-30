// managers/physicManager.js

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000
const FLIPPED_VERTICALLY_FLAG = 0x40000000
const FLIPPED_DIAGONALLY_FLAG = 0x20000000
const GID_MASK = 0x1FFFFFFF

// только слой Collision
const COLLISION_LAYER_NAMES = ['Collision']

export class PhysicManager {
  constructor() {
    this.gameManager = null
    this.mapManager = null

    this.collisionLayers = null          // массив слоёв-тайлов
    this.tileColliders = {}              // firstgid -> { firstgid, tiles: {localId: [rects...] } }

    // набор gid, которые считаем "тайл целиком стена"
    this.fullTileGids = new Set()
    // набор gid, которые явно НЕ стена (collides:false)
    this.nonSolidGids = new Set()

    this.debugDraw = true
  }

  setManager(gameManager, mapManager) {
    this.gameManager = gameManager
    this.mapManager = mapManager
    this.resetCollisionCache()
  }

  resetCollisionCache() {
    this.collisionLayers = null
    this.tileColliders = {}
    this.fullTileGids = new Set()
    this.nonSolidGids = new Set()
  }

  ensureCollisionLayers() {
    if (!this.mapManager || !this.mapManager.mapData) return
    if (this.collisionLayers) return

    this.collisionLayers = this.mapManager.mapData.layers.filter(
      (l) => l.type === 'tilelayer' && COLLISION_LAYER_NAMES.includes(l.name),
    )
  }

  // строим локальные прямоугольники-коллайдеры для всех тайлсетов
  ensureTileColliders() {
    if (!this.mapManager || !this.mapManager.mapData) return
    if (Object.keys(this.tileColliders).length) return

    const mapData = this.mapManager.mapData

    // 1. Разбираем tilesets: objectgroup, collides:true / collides:false
    for (const ts of mapData.tilesets) {
      if (!ts.tiles) continue

      const tiles = {}
      const tileW = ts.tilewidth || this.mapManager.tSize.x
      const tileH = ts.tileheight || this.mapManager.tSize.y

      for (const tile of ts.tiles) {
        const rects = []
        const localId = tile.id
        const globalGid = ts.firstgid + localId

        // --- objectgroup: частичные прямоугольники ---
        if (tile.objectgroup && Array.isArray(tile.objectgroup.objects)) {
          for (const obj of tile.objectgroup.objects) {
            if (!obj) continue
            if (obj.width <= 0 || obj.height <= 0) continue

            let collFlag = false
            if (Array.isArray(obj.properties)) {
              for (const p of obj.properties) {
                if (
                  (p.name === 'collides' || p.name === 'collieds') &&
                  p.value === true
                ) {
                  collFlag = true
                  break
                }
              }
            }
            if (!collFlag) continue

            rects.push({
              x: obj.x,
              y: obj.y,
              w: obj.width,
              h: obj.height,
            })
          }
        }

        // свойство collides на самом тайле
        let collidesProp = null
        if (Array.isArray(tile.properties)) {
          const prop = tile.properties.find((p) => p.name === 'collides')
          if (prop) collidesProp = !!prop.value
        }

        if (rects.length) {
          // есть вручную нарисованные хитбоксы — используем их
          tiles[localId] = rects
        } else if (collidesProp === true) {
          // тайл целиком стена 32×32
          this.fullTileGids.add(globalGid)
        } else if (collidesProp === false) {
          // явно НЕ стена
          this.nonSolidGids.add(globalGid)
        }
      }

      if (Object.keys(tiles).length) {
        this.tileColliders[ts.firstgid] = {
          firstgid: ts.firstgid,
          tiles,
        }
      }
    }

    // 2. Всё, что стоит на слое Collision и не помечено collides:false
    //    и не имеет своих хитбоксов — считаем тайлом-стеной 32×32
    this.ensureCollisionLayers()
    if (!this.collisionLayers) return

    const tileW = mapData.tilewidth
    const tileH = mapData.tileheight

    for (const layer of this.collisionLayers) {
      const data = layer.data || []
      const w = layer.width

      for (let index = 0; index < data.length; index++) {
        const rawGid = data[index]
        if (!rawGid) continue
        const gid = rawGid & GID_MASK
        if (!gid) continue

        if (this.nonSolidGids.has(gid)) continue

        // есть ли уже частичный коллайдер для этого gid?
        const ts = this.getTilesetByGid(gid)
        if (ts) {
          const collEntry = this.tileColliders[ts.firstgid]
          const localId =
            collEntry && typeof collEntry.firstgid === 'number'
              ? gid - collEntry.firstgid
              : null
          const rects =
            collEntry && localId != null ? collEntry.tiles[localId] : null

          if (rects && rects.length) {
            // уже есть хитбоксы — ничего не добавляем
            continue
          }
        }

        // если сюда дошли — делаем этот gid "полным" тайлом-стеной
        this.fullTileGids.add(gid)
      }
    }
  }

  getTilesetByGid(gid) {
    if (!this.mapManager || !this.mapManager.mapData) return null
    const tilesets = this.mapManager.mapData.tilesets
    let chosen = null

    for (const ts of tilesets) {
      if (gid >= ts.firstgid) chosen = ts
    }
    return chosen
  }

  // вернуть мировые прямоугольники-коллайдеры для одного тайла
  getCollRectsForTile(rawGid, tileX, tileY) {
    if (!rawGid) return null
    const gid = rawGid & GID_MASK
    if (!gid) return null

    const ts = this.getTilesetByGid(gid)
    if (!ts) return null

    const tSize = this.mapManager.tSize

    let rects = null

    // 1) пробуем найти частичные хитбоксы из tileset.tiles[].objectgroup
    const collEntry = this.tileColliders[ts.firstgid]
    if (collEntry) {
      const localId = gid - collEntry.firstgid
      rects = collEntry.tiles[localId] || null
    }

    // 2) если нет частичных, но gid в fullTileGids — берём весь тайл 32×32
    if ((!rects || !rects.length) && this.fullTileGids.has(gid)) {
      rects = [{ x: 0, y: 0, w: tSize.x, h: tSize.y }]
    }

    if (!rects || !rects.length) return null

    const baseX = tileX * tSize.x
    const baseY = tileY * tSize.y

    // переводим в мировые координаты
    return rects.map((r) => ({
      x: baseX + r.x,
      y: baseY + r.y,
      w: r.w,
      h: r.h,
    }))
  }

  isSolidAt(worldX, worldY) {
    if (!this.mapManager || !this.mapManager.mapData) return false

    this.ensureCollisionLayers()
    this.ensureTileColliders()
    if (!this.collisionLayers || !this.collisionLayers.length) return false

    const tSize = this.mapManager.tSize
    const xCount = this.mapManager.xCount
    const yCount = this.mapManager.yCount

    const tileX = Math.floor(worldX / tSize.x)
    const tileY = Math.floor(worldY / tSize.y)

    // вне карты — стена
    if (tileX < 0 || tileY < 0 || tileX >= xCount || tileY >= yCount) {
      return true
    }

    const index = tileY * xCount + tileX

    for (const layer of this.collisionLayers) {
      const data = layer.data
      if (!data || index < 0 || index >= data.length) continue

      const rawGid = data[index]
      if (!rawGid) continue

      const rects = this.getCollRectsForTile(rawGid, tileX, tileY)
      if (!rects || !rects.length) continue

      for (const r of rects) {
        if (
          worldX >= r.x &&
          worldX < r.x + r.w &&
          worldY >= r.y &&
          worldY < r.y + r.h
        ) {
          return true
        }
      }
    }

    return false
  }

  // рисуем красным только реальные прямоугольники-коллайдеры
  drawDebugColliders(ctx) {
    if (!ctx || !this.mapManager || !this.mapManager.mapData) return

    this.ensureCollisionLayers()
    this.ensureTileColliders()
    if (!this.collisionLayers || !this.collisionLayers.length) return

    const tSize = this.mapManager.tSize
    const xCount = this.mapManager.xCount
    const yCount = this.mapManager.yCount
    const view = this.mapManager.view || { x: 0, y: 0 }
    const canvasW = ctx.canvas.width
    const canvasH = ctx.canvas.height

    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.fillStyle = 'red'

    for (let ty = 0; ty < yCount; ty++) {
      for (let tx = 0; tx < xCount; tx++) {
        const index = ty * xCount + tx
        let rectsWorld = null

        for (const layer of this.collisionLayers) {
          const data = layer.data
          if (!data || index < 0 || index >= data.length) continue

          const rawGid = data[index]
          if (!rawGid) continue

          rectsWorld = this.getCollRectsForTile(rawGid, tx, ty)
          if (rectsWorld && rectsWorld.length) break
        }

        if (!rectsWorld || !rectsWorld.length) continue

        for (const r of rectsWorld) {
          const sx = r.x - view.x
          const sy = r.y - view.y
          if (
            sx >= canvasW ||
            sy >= canvasH ||
            sx + r.w <= 0 ||
            sy + r.h <= 0
          ) {
            continue
          }
          ctx.fillRect(sx, sy, r.w, r.h)
        }
      }
    }

    ctx.restore()
  }

  isRectColliding(x, y, w, h) {
    if (!this.mapManager || !this.mapManager.tSize) return false

    const pad = 2

    const left = x + pad
    const right = x + w - 1 - pad
    const top = y + pad
    const bottom = y + h - 1 - pad

    const tileW = this.mapManager.tSize.x
    const tileH = this.mapManager.tSize.y

    const stepX = Math.max(4, tileW / 4)
    const stepY = Math.max(4, tileH / 4)

    for (let px = left; px <= right; px += stepX) {
      for (let py = top; py <= bottom; py += stepY) {
        if (this.isSolidAt(px, py)) return true
      }
    }

    // страховочные точки по нижней и правой границе
    for (let px = left; px <= right; px += stepX) {
      if (this.isSolidAt(px, bottom)) return true
    }
    for (let py = top; py <= bottom; py += stepY) {
      if (this.isSolidAt(right, py)) return true
    }

    return false
  }

  isRectFree(x, y, w, h) {
    return !this.isRectColliding(x, y, w, h)
  }

  update(obj, dt) {
    if (!obj) return

    const delta =
      typeof dt === 'number' && !Number.isNaN(dt) ? dt : 1 / 60

    const speed = obj.speed || 0
    const vx = obj.move_x * speed * delta
    const vy = obj.move_y * speed * delta

    let newX = obj.pos_x
    let newY = obj.pos_y

    if (vx !== 0) {
      const tryX = newX + vx
      if (this.isRectFree(tryX, newY, obj.size_x, obj.size_y)) {
        newX = tryX
      }
    }

    if (vy !== 0) {
      const tryY = newY + vy
      if (this.isRectFree(newX, tryY, obj.size_x, obj.size_y)) {
        newY = tryY
      }
    }

    obj.pos_x = newX
    obj.pos_y = newY
  }
}
