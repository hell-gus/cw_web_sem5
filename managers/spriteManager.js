// managers/spriteManager.js
export class SpriteManager {
  constructor() {
    this.mapManager = null

    // все спрайты из всех атласов
    // каждый спрайт знает, из какой картинки его рисовать
    this.sprites = []

    this.imgLoaded = false
    this.jsonLoaded = false
  }

  setManager = (mapManager) => {
    this.mapManager = mapManager
  }

  // можно вызывать несколько раз для разных атласов:
  //  - cat_ginger_atlas.json / .png
  //  - objects_atlas.json / .png (ключ, торт, монстры)
  loadAtlas(atlasJson, atlasImg) {
    const img = new Image()
    img.src = atlasImg
    img.onload = () => {
      this.imgLoaded = true
      console.log('SpriteManager: картинка атласа загружена', atlasImg)
    }

    fetch(atlasJson)
      .then((res) => res.json())
      .then((data) => {
        const spritesToAdd = []

        if (Array.isArray(data)) {
          // формат: [ { name, x, y, w, h }, ... ]
          for (const sprite of data) {
            spritesToAdd.push({
              name: sprite.name,
              x: sprite.x,
              y: sprite.y,
              w: sprite.w ?? sprite.width,
              h: sprite.h ?? sprite.height,
              img, // ссылка на конкретную картинку
            })
          }
        } else {
          // формат aseprite / texturepacker: frames: { "name.png": { frame:{x,y,w,h} } }
          const frames = data.frames || data
          for (const [rawName, frameData] of Object.entries(frames)) {
            const f = frameData.frame || frameData
            const name = rawName.replace(/\.(png|aseprite)$/i, '')
            spritesToAdd.push({
              name,
              x: f.x,
              y: f.y,
              w: f.w ?? f.width,
              h: f.h ?? f.height,
              img,
            })
          }
        }

        // важно: ДОБАВЛЯЕМ, а не перетираем —
        // так можно грузить несколько атласов
        this.sprites.push(...spritesToAdd)

        this.jsonLoaded = true
        console.log('SpriteManager: загружено спрайтов', this.sprites.length)
      })
  }

  getSprite = (name) => {
    return this.sprites.find((s) => s.name === name) || null
  }

  drawSprite = (ctx, name, x, y) => {
    if (!this.jsonLoaded || !this.sprites.length) return

    const sprite = this.getSprite(name)
    if (!sprite || !sprite.img) return

    ctx.drawImage(
      sprite.img,
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
