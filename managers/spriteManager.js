// managers/spriteManager.js
export class SpriteManager {
  constructor() {
    this.mapManager = null;

    // все спрайты из всех атласов
    this.sprites = [];

    this.imgLoaded = false;
    this.jsonLoaded = false;
  }

  setManager = (mapManager) => {
    this.mapManager = mapManager;
  };

  loadAtlas(atlasJson, atlasImg) {
    const img = new Image();
    img.src = atlasImg;
    img.onload = () => {
      this.imgLoaded = true;
      console.log('SpriteManager: картинка атласа загружена', atlasImg);
    };

    fetch(atlasJson)
      .then((res) => res.json())
      .then((data) => {
        const spritesToAdd = [];

        if (Array.isArray(data)) {
          // формат: [ { name, x, y, w, h }, ... ]
          for (const sprite of data) {
            spritesToAdd.push({
              name: String(sprite.name).trim(),
              x: sprite.x,
              y: sprite.y,
              w: sprite.w ?? sprite.width,
              h: sprite.h ?? sprite.height,
              img,
            });
          }
        } else {
          // формат texturepacker / leshy: frames: { "name": { frame:{x,y,w,h} } }
          const frames = data.frames || data;
          for (const [rawName, frameData] of Object.entries(frames)) {
            const f = frameData.frame || frameData;
            const name = String(
              rawName.replace(/\.(png|aseprite)$/i, '')
            ).trim();

            spritesToAdd.push({
              name,
              x: f.x,
              y: f.y,
              w: f.w ?? f.width,
              h: f.h ?? f.height,
              img,
            });
          }
        }

        this.sprites.push(...spritesToAdd);

        this.jsonLoaded = true;
        console.log('SpriteManager: загружено спрайтов всего', this.sprites.length);
      })
      .catch((err) => {
        console.error('SpriteManager: ошибка загрузки атласа', atlasJson, err);
      });
  }

  getSprite = (name) => {
    if (!name) return null;
    if (!this.jsonLoaded || !this.sprites.length) return null;

    const n = String(name).trim();

    // сначала точное совпадение
    let s = this.sprites.find((sp) => sp.name === n);
    if (s) return s;

    // потом без учёта регистра
    const lower = n.toLowerCase();
    s = this.sprites.find((sp) => sp.name.toLowerCase() === lower);
    return s || null;
  };

    drawSprite = (ctx, name, x, y) => {
    const sprite = this.getSprite(name)
    if (!sprite || !sprite.img) {
      // спрайт ещё не найден / не распарсился
      return
    }

    const img = sprite.img

    // если картинка ещё грузится или сломалась — просто не рисуем,
    // чтобы не было InvalidStateError
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      return
    }

    ctx.drawImage(
      img,
      sprite.x,
      sprite.y,
      sprite.w,
      sprite.h,
      x,
      y,
      sprite.w,
      sprite.h
    )
  }
}

