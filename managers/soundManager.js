// managers/soundManager.js
export class SoundManager {
  constructor() {
    this.sounds = {}
    this.masterVolume = 0.8
    this.initialized = false
  }

  init() {
    if (this.initialized) return
    this.initialized = true

    // тут жёстко прописываем все твои файлы
    const manifest = {
      key_pickup: './sounds/key_pickup.mp3',
      cake_pickup: './sounds/cake_pickup.mp3',
      cat_hit: './sounds/cat_hit.mp3',
      game_over: './sounds/game_over.mp3',

      level_complete: './sounds/level_complete.mp3', // после 1 уровня
      win: './sounds/win.mp3',                       // финальная победа

      level1: './sounds/level1.mp3', // фон 1 уровня
      level2: './sounds/level2.mp3', // фон 2 уровня
    }

    this.sounds = {}

    Object.entries(manifest).forEach(([name, src]) => {
      const audio = new Audio(src)
      audio.preload = 'auto'

      // фон тише и по кругу
      if (name === 'level1' || name === 'level2') {
        audio.loop = true
        audio.volume = 0.35
      } else {
        audio.loop = false
        audio.volume = 0.8
      }

      this.sounds[name] = audio
    })
  }

  play(name) {
    const base = this.sounds[name]
    if (!base) return

    // фоновая музыка — один экземпляр
    if (name === 'level1' || name === 'level2') {
      try {
        base.currentTime = 0
        base.play()
      } catch (e) {
        console.warn('Не удалось проиграть музыку', name, e)
      }
      return
    }

    // короткие эффекты — клонируем, чтобы могли накладываться
    try {
      const clone = base.cloneNode()
      clone.volume = base.volume
      clone.play()
    } catch (e) {
      console.warn('Не удалось проиграть звук', name, e)
    }
  }

  stop(name) {
    const s = this.sounds[name]
    if (!s) return
    s.pause()
    s.currentTime = 0
  }

  stopAll() {
    Object.values(this.sounds).forEach((a) => {
      a.pause()
    })
  }
}
