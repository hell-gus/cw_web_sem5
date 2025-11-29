// managers/physicManager.js

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000
const FLIPPED_VERTICALLY_FLAG = 0x40000000
const FLIPPED_DIAGONALLY_FLAG = 0x20000000
const GID_MASK = 0x1FFFFFFF

// какие слои считаем коллизионными
const COLLISION_LAYER_NAMES = ['3-1']
// какие тайлсеты считаем "стенами"
const SOLID_TILESET_NAMES = ['TX Tileset Wall', 'TX Struct']

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
  }

  ensureCollisionLayers() {
    if (!this.mapManager || !this.mapManager.mapData) return
    if (this.collisionLayers) return

    this.collisionLayers = this.mapManager.mapData.layers.filter(
      (l) => l.type === 'tilelayer' && COLLISION_LAYER_NAMES.includes(l.name),
    )
  }

  ensureTileColliders() {
    if (!this.mapManager || !this.mapManager.mapData) return
    if (Object.keys(this.tileColliders).length) return

    for (const ts of this.mapManager.mapData.tilesets) {
      if (!SOLID_TILESET_NAMES.includes(ts.name)) continue

      const collData = {
        firstgid: ts.firstgid,
        tiles: {},
      }

      if (ts.tiles) {
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
      }

      this.tileColliders[ts.name] = collData
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

    // за пределами карты считаем твёрдо
    if (tileX < 0 || tileY < 0 || tileX >= xCount || tileY >= yCount) {
      return true
    }

    const index = tileY * xCount + tileX

    for (const layer of this.collisionLayers) {
      const data = layer.data
      if (!data || index < 0 || index >= data.length) continue

      const rawGid = data[index] || 0
      const gid = rawGid & GID_MASK
      if (!gid) continue

      const ts = this.getTilesetByGid(gid)
      if (!ts || !SOLID_TILESET_NAMES.includes(ts.name)) continue

      const collEntry = this.tileColliders[ts.name]
      const localId = gid - collEntry.firstgid
      const rects = collEntry && collEntry.tiles[localId]

      const baseX = tileX * tSize.x
      const baseY = tileY * tSize.y

      if (rects && rects.length) {
        const localX = worldX - baseX
        const localY = worldY - baseY

        for (const r of rects) {
          if (
            localX >= r.x &&
            localX < r.x + r.w &&
            localY >= r.y &&
            localY < r.y + r.h
          ) {
            return true
          }
        }
      } else {
        // нет специальных прямоугольников → весь тайл твёрдый
        return true
      }
    }

    return false
  }


    // === СТОЛКНОВЕНИЯ: точка под лапами ===
      // === Столкновения: проверяем ВСЮ "коробку" кота ===
      // === Столкновения: проверяем ВСЮ "коробку" кота ===
    // === Столкновения: проверяем ВСЮ "коробку" кота плотной сеткой точек ===
      // === Столкновения: проверяем прямоугольник объекта плотной сеткой точек ===
      // === Столкновения: проверяем прямоугольник объекта плотной сеткой точек ===
      // === Столкновения: проверяем прямоугольник объекта плотной сеткой точек ===
    isRectColliding(x, y, w, h) {
        if (!this.mapManager || !this.mapManager.tSize) return false

        // чуть уменьшаем хитбокс по краям, чтобы не цепляться за 1px шум
        const pad = 2

        const left   = x + pad
        const right  = x + w - 1 - pad
        const top    = y + pad
        const bottom = y + h - 1 - pad

        const tileW = this.mapManager.tSize.x
        const tileH = this.mapManager.tSize.y

        // шаг меньше размера тайла, чтобы не пролетать между коллайдерами
        const stepX = Math.max(4, tileW / 4)
        const stepY = Math.max(4, tileH / 4)

        // внутренняя сетка точек
        for (let px = left; px <= right; px += stepX) {
        for (let py = top; py <= bottom; py += stepY) {
            if (this.isSolidAt(px, py)) {
            return true
            }
        }
        }

        // дополнительно контроль правой и нижней границы
        for (let px = left; px <= right; px += stepX) {
        if (this.isSolidAt(px, bottom)) return true
        }
        for (let py = top; py <= bottom; py += stepY) {
        if (this.isSolidAt(right, py)) return true
        }

        return false
    }

    // прямоугольник свободен, если он НЕ пересекается со стенами
    isRectFree(x, y, w, h) {
        return !this.isRectColliding(x, y, w, h)
    }




    // прямоугольник свободен, если он НЕ пересекается со стенами
    isRectFree(x, y, w, h) {
        return !this.isRectColliding(x, y, w, h)
    }


  update(obj, dt) {
    if (!obj) return

    // на всякий случай подстрахуемся от undefined
    const delta = (typeof dt === 'number' && !Number.isNaN(dt)) ? dt : 1 / 60

    const speed = obj.speed || 0
    const vx = obj.move_x * speed * delta
    const vy = obj.move_y * speed * delta

    let newX = obj.pos_x
    let newY = obj.pos_y

    // --- сначала пробуем сдвиг по X ---
    if (vx !== 0) {
      const tryX = newX + vx
      if (this.isRectFree(tryX, newY, obj.size_x, obj.size_y)) {
        newX = tryX
      } else {
        // упёрлись в стену по X
        // obj.onTouchMap && obj.onTouchMap(...)
      }
    }

    // --- затем сдвиг по Y ---
    if (vy !== 0) {
      const tryY = newY + vy
      if (this.isRectFree(newX, tryY, obj.size_x, obj.size_y)) {
        newY = tryY
      } else {
        // упёрлись в стену по Y
        // obj.onTouchMap && obj.onTouchMap(...)
      }
    }

    obj.pos_x = newX
    obj.pos_y = newY
  }

  // прямоугольник свободен, если он НЕ пересекается со стенами
  isRectFree(x, y, w, h) {
    return !this.isRectColliding(x, y, w, h)
  }
}