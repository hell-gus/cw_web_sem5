// managers/EventsManager.js
export class EventsManager {
  constructor() {
    // keyCode → имя действия
    this.bind = {
      87: 'up',    // W
      65: 'left',  // A
      83: 'down',  // S
      68: 'right', // D
      69: 'break',     // E — действие (ломать Barrier)
    }

    // активные действия
    this.action = {}

    this.canvas = null

    // байндинг методов, чтобы this внутри них был EventsManager
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
  }

  setup(canvas) {
    this.canvas = canvas
    if (!canvas) return

    // мышь — вдруг пригодится потом (сейчас можно оставить пустыми обработчики)
    canvas.addEventListener('mousedown', this.onMouseDown)
    canvas.addEventListener('mouseup', this.onMouseUp)

    // клавиатура
    document.body.addEventListener('keydown', this.onKeyDown)
    document.body.addEventListener('keyup', this.onKeyUp)
  }

  onKeyDown(event) {
    const code = event.keyCode || event.which
    const action = this.bind[code]
    if (action) {
      this.action[action] = true
      // чтобы не было странных скроллов/шорткатов
      event.preventDefault()
    }
  }

  onKeyUp(event) {
    const code = event.keyCode || event.which
    const action = this.bind[code]
    if (action) {
      this.action[action] = false
      event.preventDefault()
    }
  }

  onMouseDown(_event) {
    // оставлено на будущее
  }

  onMouseUp(_event) {
    // оставлено на будущее
  }
}
