// managers/EventsManager.js
export class EventsManager {
  constructor() {
    this.bind = {
      87: 'up',     // W
      65: 'left',   // A
      83: 'down',   // S
      68: 'right',  // D
      69: 'break',  // E — ломать преграду
    }

    // сюда кладутся активные действия (true/false)
    this.action = {}

    // привязка методы
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
  }

  // подключение обработчиков 
  setup() {
    document.body.addEventListener('keydown', this.onKeyDown)
    document.body.addEventListener('keyup', this.onKeyUp)
  }

  // когда кнопку нажали
  onKeyDown(event) {
    const code = event.keyCode || event.which
    const action = this.bind[code]

    if (action) {
      this.action[action] = true
      // чтобы страница не скроллилась стрелками и т.п.
      event.preventDefault()
    }
  }

  // когда кнопку отпустили
  onKeyUp(event) {
    const code = event.keyCode || event.which
    const action = this.bind[code]

    if (action) {
      this.action[action] = false
      event.preventDefault()
    }
  }
}
