// managers/physicManager.js

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000
const FLIPPED_VERTICALLY_FLAG = 0x40000000
const FLIPPED_DIAGONALLY_FLAG = 0x20000000
const GID_MASK = 0x1FFFFFFF

// только слой Collision
const COLLISION_LAYER_NAMES = ['Collision']

// тайлсеты, которые по умолчанию считаем "твёрдыми" (стены),
// если на тайле нет collides:false
const SOLID_TILESET_NAMES = [
  'TX Tileset Wall',
  'TX Struct',
  'mainlevbuild_32x32',
]

export class PhysicManager {
  constructor() {
    this.gameManager = null
    this.mapManager = null

    // кэш больше НЕ используем
    this.debugDraw = false
  }

  setManager(gameManager, mapManager) {
    this.gameManager = gameManager
    this.mapManager = mapManager
  }

  // заглушка — вдруг где-то вызывается
  resetCollisionCache() {
    // больше ничего не кешируем, оставляем пустым
  }

  // каждый раз берём актуальный список collision-слоёв из текущей карты
  getCollisionLayers() {
    if (!this.mapManager || !this.mapManager.mapData) return []
    return this.mapManager.mapData.layers.filter(
      (l) => l.type === 'tilelayer' && COLLISION_LAYER_NAMES.includes(l.name),
    )
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

  // найти описание тайла по localId
  getTileDef(ts, localId) {
    if (!ts || !Array.isArray(ts.tiles)) return null
    for (const tile of ts.tiles) {
      if (tile.id === localId) return tile
    }
    return null
  }

  // вернуть МИРОВЫЕ прямоугольники коллизии для одного тайла
  getCollRectsForTile(rawGid, tileX, tileY) {
    if (!rawGid) return null
    const gid = rawGid & GID_MASK
    if (!gid) return null

    const ts = this.getTilesetByGid(gid)
    if (!ts) return null

    const tSize = this.mapManager.tSize
    const baseX = tileX * tSize.x
    const baseY = tileY * tSize.y

    const localId = gid - ts.firstgid
    const tileDef = this.getTileDef(ts, localId)

    // 1) objectgroup с collides/collieds = true → берём ЭТИ прямоугольники
    if (tileDef && tileDef.objectgroup && Array.isArray(tileDef.objectgroup.objects)) {
      const rects = []

      for (const obj of tileDef.objectgroup.objects) {
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
          x: baseX + obj.x,
          y: baseY + obj.y,
          w: obj.width,
          h: obj.height,
        })
      }

      if (rects.length) {
        return rects
      }
    }

    // 2) свойства collides / collides:false / collides:true
    let hasCollidesFalse = false
    let hasCollidesTrue = false
    if (tileDef && Array.isArray(tileDef.properties)) {
      for (const p of tileDef.properties) {
        if (p.name === 'collides' && p.value === false) {
          hasCollidesFalse = true
        }
        if (p.name === 'collides' && p.value === true) {
          hasCollidesTrue = true
        }
      }
    }

    // collides:false → нет коллизии, даже если тайлсет "твёрдый"
    if (hasCollidesFalse) {
      return null
    }

    // 3) collides:true ИЛИ тайл из "твёрдого" тайлсета → весь тайл 32x32 стена
    const isSolidTileset = SOLID_TILESET_NAMES.includes(ts.name)
    if (hasCollidesTrue || isSolidTileset) {
      return [
        {
          x: baseX,
          y: baseY,
          w: tSize.x,
          h: tSize.y,
        },
      ]
    }

    // иначе — нет коллизии
    return null
  }

  isSolidAt(worldX, worldY) {
    if (!this.mapManager || !this.mapManager.mapData) return false

    const collisionLayers = this.getCollisionLayers()
    if (!collisionLayers.length) return false

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

    for (const layer of collisionLayers) {
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

  // рисуем красным реальные прямоугольники коллизий
  drawDebugColliders(ctx) {
    if (!ctx || !this.mapManager || !this.mapManager.mapData) return

    const collisionLayers = this.getCollisionLayers()
    if (!collisionLayers.length) return

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

        for (const layer of collisionLayers) {
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
    // если карта ещё не загружена – считаем, что всё проходимо
    if (
      !this.mapManager ||
      !this.mapManager.mapData ||
      this.mapManager.jsonLoaded === false
    ) {
      return false
    }

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
