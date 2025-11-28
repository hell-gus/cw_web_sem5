export class PhysicManager {
  setManager(gameManager, mapManager) {
    this.gameManager = gameManager
    this.mapManager = mapManager
  }

  update(obj, dt) {
    if (!obj) return

    const speed = obj.speed ?? 0
    const dx = obj.move_x * speed
    const dy = obj.move_y * speed

    let newX = obj.pos_x + dx
    let newY = obj.pos_y + dy

    const maxX = this.mapManager.mapSize.x - obj.size_x
    const maxY = this.mapManager.mapSize.y - obj.size_y

    if (newX < 0) newX = 0
    if (newY < 0) newY = 0
    if (newX > maxX) newX = maxX
    if (newY > maxY) newY = maxY

    // тут потом добавим столкновения со стенами по тайлам
    obj.pos_x = newX
    obj.pos_y = newY
  }

  entityAtXY(obj, x, y) {
    return null
  }
}
