// managers/soundManager.js
export class SoundManager {
  constructor() {
    // AudioContext
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    this.context = AudioCtx ? new AudioCtx() : null

    this.gainNode = null
    this.clips = {} // path -> { buffer, loaded, playing }

    if (this.context) {
      this.gainNode = this.context.createGain()
      this.gainNode.connect(this.context.destination)
    }
  }

  // загрузка звука
  load(path, callback) {
    if (!this.context) return

    const existing = this.clips[path]
    if (existing && existing.loaded) {
      callback && callback(existing)
      return
    }

    const clip = {
      path,
      buffer: null,
      loaded: false,
      play: (volume = 1, loop = false) => {
        this.play(path, { volume, loop })
      },
    }
    this.clips[path] = clip

    const request = new XMLHttpRequest()
    request.open('GET', path, true)
    request.responseType = 'arraybuffer'

    request.onload = () => {
      this.context.decodeAudioData(
        request.response,
        (buffer) => {
          clip.buffer = buffer
          clip.loaded = true
          callback && callback(clip)
        },
        (err) => {
          console.error('decodeAudioData error', err)
        },
      )
    }

    request.send()
  }

  // проигрывание
  play(path, options = {}) {
    if (!this.context) return

    const { volume = 1, loop = false } = options
    const clip = this.clips[path]

    const playImpl = (c) => {
      const source = this.context.createBufferSource()
      source.buffer = c.buffer
      source.loop = !!loop

      const gainNode = this.gainNode || this.context.createGain()
      gainNode.gain.value = volume
      source.connect(gainNode)

      if (!this.gainNode) {
        gainNode.connect(this.context.destination)
      }

      source.start(0)
    }

    if (!clip || !clip.loaded) {
      // если ещё не загружен — загрузим и сразу проиграем
      this.load(path, (c) => playImpl(c))
    } else {
      playImpl(clip)
    }
  }
}
