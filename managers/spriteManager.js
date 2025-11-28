export class SpriteManager {
  constructor() {
    this.image = new Image()
    this.sprites = []
    this.imgLoaded = false
    this.jsonLoaded = false
  }

  setManager = (mapManager) => {
    this.mapManager = mapManager
  }

  loadAtlas(atlasJson, atlasImg) {
    fetch(atlasJson)
      .then((res) => res.json())
      .then((data) => {
        this.sprites = []

        if (Array.isArray(data)) {
          for (const sprite of data) {
            this.sprites.push({
              name: sprite.name,
              x: sprite.x,
              y: sprite.y,
              w: sprite.w ?? sprite.width,
              h: sprite.h ?? sprite.height,
            })
          }
        } else {
          const frames = data.frames || data
          for (const [rawName, frameData] of Object.entries(frames)) {
            const f = frameData.frame || frameData
            const name = rawName.replace(/\.(png|aseprite)$/i, '')
            this.sprites.push({
              name,
              x: f.x,
              y: f.y,
              w: f.w ?? f.width,
              h: f.h ?? f.height,
            })
          }
        }

        this.jsonLoaded = true
        console.log('SpriteManager: загружено спрайтов', this.sprites.length)
      })

    this.image = new Image()
    this.image.src = atlasImg
    this.image.onload = () => {
      this.imgLoaded = true
      console.log('SpriteManager: картинка атласа загружена')
    }
  }

  getSprite = (name) => {
    return this.sprites.find((s) => s.name === name) || null
  }

  drawSprite = (ctx, name, x, y) => {
    if (!this.imgLoaded || !this.jsonLoaded) return
    const sprite = this.getSprite(name)
    if (!sprite) return

    ctx.drawImage(
      this.image,
      sprite.x,
      sprite.y,
      sprite.w,
      sprite.h,
      x,
      y,
      sprite.w,
      sprite.h,
    )
  }
}
