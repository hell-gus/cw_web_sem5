// managers/physicManager.js

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000
const FLIPPED_VERTICALLY_FLAG = 0x40000000
const FLIPPED_DIAGONALLY_FLAG = 0x20000000
const GID_MASK = 0x1FFFFFFF

// СЛОЙ коллизий — один на обеих картах
const COLLISION_LAYER_NAMES = ['Collision', 'collision']

// КАКИЕ TILESET'ы считаем "стенами"
// сюда можно добавлять/убирать названия по необходимости
const SOLID_TILESET_NAMES = [
  'TX Tileset Wall',
  'TX Struct',
  'mainlevbuild_32x32',
]

export class PhysicManager {
  constructor() {
    this.gameManager = null
    this.mapManager = null

    this.collisionLayers = null
    this.tileColliders = {}

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
  }

  ensureCollisionLayers() {
    if (!this.mapManager || !this.mapManager.mapData) return

    if (!this.collisionLayers) {
      this.collisionLayers = this.mapManager.mapData.layers.filter(
        (l) =>
          l.type === 'tilelayer' &&
          COLLISION_LAYER_NAMES.includes(l.name),
      )
    }
  }

  // собираем хитбоксы для tileset'ов, где есть objectgroup + collides/collieds
  ensureTileColliders() {
    if (!this.mapManager || !this.mapManager.mapData) return

    const mapData = this.mapManager.mapData
    const result = {}

    for (const ts of mapData.tilesets) {
      if (!SOLID_TILESET_NAMES.includes(ts.name)) continue
      if (!ts.tiles) continue

      const collData = {
        firstgid: ts.firstgid,
        tiles: {},
      }

      for (const tile of ts.tiles) {
        if (!tile.objectgroup || !tile.objectgroup.objects) continue

        const rects = []

        for (const obj of tile.objectgroup.objects) {
          if (!obj.properties) continue

          const hasColl = obj.properties.some(
            (p) =>
              (p.name === 'collides' || p.name === 'collieds') &&
              p.value === true,
          )
          if (!hasColl) continue

          rects.push({
            x: obj.x,
            y: obj.y,
            w: obj.width,
            h: obj.height,
          })
        }

        if (rects.length) {
          collData.tiles[tile.id] = rects
        }
      }

      if (Object.keys(collData.tiles).length) {
        result[ts.name] = collData
      }
    }

    this.tileColliders = result
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

  // ТОЛЬКО tileset'ы из SOLID_TILESET_NAMES на слое Collision дают стены.
  // Если для конкретного тайла есть хитбоксы — проверяем их,
  // если нет — вся клетка непроходима.
  isSolidAt(worldX, worldY) {
  if (!this.mapManager || !this.mapManager.mapData) return false

  this.ensureCollisionLayers()
  if (!this.collisionLayers || !this.collisionLayers.length) return false

  const tSize = this.mapManager.tSize
  const xCount = this.mapManager.xCount
  const yCount = this.mapManager.yCount

  const tileX = Math.floor(worldX / tSize.x)
  const tileY = Math.floor(worldY / tSize.y)

  // всё вне карты считаем стеной
  if (tileX < 0 || tileY < 0 || tileX >= xCount || tileY >= yCount) {
    return true
  }

  const index = tileY * xCount + tileX

  // достаточно, чтобы В ЛЮБОМ коллизионном слое был ненулевой gid
  for (const layer of this.collisionLayers) {
    const data = layer.data
    if (!data || index < 0 || index >= data.length) continue

    const rawGid = data[index] || 0
    if (rawGid & GID_MASK) {      // есть тайл -> стена
      return true
    }
  }

  return false
}


  // подсветка: только тайлы из SOLID_TILESET_NAMES на слое Collision
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
        const baseWorldX = tx * tSize.x
        const baseWorldY = ty * tSize.y

        let fullTileSolid = false
        let rectsToDraw = null

        for (const layer of this.collisionLayers) {
          const data = layer.data
          if (!data || index < 0 || index >= data.length) continue

          const rawGid = data[index] || 0
          if (!rawGid) continue

          const gid = rawGid & GID_MASK
          if (!gid) continue

          const ts = this.getTilesetByGid(gid)
          if (!ts) continue
          if (!SOLID_TILESET_NAMES.includes(ts.name)) {
            // не "стеновой" tileset → не подсвечиваем
            continue
          }

          const collEntry = this.tileColliders[ts.name]

          if (!collEntry) {
            fullTileSolid = true
            break
          }

          const localId =
            typeof collEntry.firstgid === 'number'
              ? gid - collEntry.firstgid
              : null
          if (localId == null) {
            fullTileSolid = true
            break
          }

          const rects = collEntry.tiles[localId]
          if (rects && rects.length) {
            rectsToDraw = rects
          } else {
            fullTileSolid = true
          }

          break
        }

        if (!fullTileSolid && !rectsToDraw) continue

        const baseScreenX = baseWorldX - view.x
        const baseScreenY = baseWorldY - view.y

        if (
          baseScreenX >= canvasW ||
          baseScreenY >= canvasH ||
          baseScreenX + tSize.x <= 0 ||
          baseScreenY + tSize.y <= 0
        ) {
          continue
        }

        if (fullTileSolid) {
          ctx.fillRect(baseScreenX, baseScreenY, tSize.x, tSize.y)
        } else if (rectsToDraw) {
          for (const r of rectsToDraw) {
            ctx.fillRect(
              baseScreenX + r.x,
              baseScreenY + r.y,
              r.w,
              r.h,
            )
          }
        }
      }
    }

    ctx.restore()
  }

  isRectColliding(x, y, w, h) {
    if (!this.mapManager || !this.mapManager.tSize) return false

    const pad = 2

    const left   = x + pad
    const right  = x + w - 1 - pad
    const top    = y + pad
    const bottom = y + h - 1 - pad

    const tileW = this.mapManager.tSize.x
    const tileH = this.mapManager.tSize.y

    const stepX = Math.max(4, tileW / 4)
    const stepY = Math.max(4, tileH / 4)

    for (let px = left; px <= right; px += stepX) {
      for (let py = top; py <= bottom; py += stepY) {
        if (this.isSolidAt(px, py)) {
          return true
        }
      }
    }

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
