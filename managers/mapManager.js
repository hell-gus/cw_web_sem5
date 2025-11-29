'use strict';

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;
const GID_MASK                  = 0x1FFFFFFF;

export class mapManager {
  constructor() {
    this.mapData = null;          // хранение карты
    this.tLayer = null;           // первый слой тайлов
    this.xCount = 0;
    this.yCount = 0;
    this.tSize  = { x: 32, y: 32 };
    this.mapSize = { x: 0, y: 0 };
    this.tilesets = [];
    this.imgLoadCount = 0;
    this.imgLoaded = false;
    this.jsonLoaded = false;
    this.view = { x: 0, y: 0, w: 0, h: 0 }; // окно камеры

    this.gameManager = null;
    this.objects = [];
  }

  // ---------- загрузка карты ----------
  loadMap(path) {
    const request = new XMLHttpRequest();

    request.onreadystatechange = () => {
      if (request.readyState === 4) {
        if (request.status === 200 || request.status === 0) {
          this.parseMap(request.responseText);
        } else {
          console.error(`Не удалось загрузить карту: ${path}`);
        }
      }
    };

    request.open('GET', path, true);
    request.send();
  }

  setGameManager(gameManager) {
    this.gameManager = gameManager;
  }

  // ---------- разбор JSON карты ----------
  parseMap(tilesJSON) {
    this.mapData = JSON.parse(tilesJSON);

    this.xCount = this.mapData.width;
    this.yCount = this.mapData.height;

    this.tSize.x = this.mapData.tilewidth;
    this.tSize.y = this.mapData.tileheight;

    this.mapSize.x = this.xCount * this.tSize.x;
    this.mapSize.y = this.yCount * this.tSize.y;

    this.tilesets = [];
    this.imgLoadCount = 0;
    this.imgLoaded = false;

    for (let i = 0; i < this.mapData.tilesets.length; i++) {
      const t = this.mapData.tilesets[i];
      const img = new Image();

      img.onload = () => {
        this.imgLoadCount++;
        if (this.imgLoadCount === this.tilesets.length) {
          this.imgLoaded = true;
        }
      };
      img.src = t.image;

      const ts = {
        firstgid: t.firstgid,
        image: img,
        name: t.name,
        xCount: Math.floor(t.imagewidth  / t.tilewidth),
        yCount: Math.floor(t.imageheight / t.tileheight),
        tSize: { x: t.tilewidth, y: t.tileheight },
      };
      this.tilesets.push(ts);
    }

    // первый тайловый слой
    this.tLayer = null;
    for (let l = 0; l < this.mapData.layers.length; l++) {
      const layer = this.mapData.layers[l];
      if (layer.type === 'tilelayer') {
        this.tLayer = layer;
        break;
      }
    }

    // кеш "сырых" объектов (если нужно отдельно)
    this.objects = [];
    for (const layer of this.mapData.layers) {
      if (layer.type === 'objectgroup') {
        const objs = layer.objects || [];
        this.objects.push(...objs);
      }
    }

    this.jsonLoaded = true;
  }

  // ---------- отрисовка ----------
  draw(ctx) {
    if (!this.imgLoaded || !this.jsonLoaded) {
      setTimeout(() => this.draw(ctx), 100);
      return;
    }

    ctx.clearRect(0, 0, this.view.w, this.view.h);

    const tileLayers = this.mapData.layers.filter(
      (layer) => layer.type === 'tilelayer' && layer.visible
    );

    for (const layer of tileLayers) {
      const data = layer.data;

      for (let i = 0; i < data.length; i++) {
        const rawId = data[i];
        if (!rawId) continue;

        const flippedH = (rawId & FLIPPED_HORIZONTALLY_FLAG) !== 0;
        const flippedV = (rawId & FLIPPED_VERTICALLY_FLAG) !== 0;
        const flippedD = (rawId & FLIPPED_DIAGONALLY_FLAG) !== 0;

        const gid = rawId & GID_MASK;
        if (gid === 0) continue;

        const tile = this.getTile(gid);
        if (!tile) continue;

        const mapX = (i % this.xCount) * this.tSize.x;
        const mapY = Math.floor(i / this.xCount) * this.tSize.y;

        if (!this.isVisible(mapX, mapY, this.tSize.x, this.tSize.y)) continue;

        const screenX = mapX - this.view.x;
        const screenY = mapY - this.view.y;

        ctx.save();

        const cx = screenX + this.tSize.x / 2;
        const cy = screenY + this.tSize.y / 2;

        ctx.translate(cx, cy);

        if (flippedD) {
          ctx.rotate((90 * Math.PI) / 180);
          ctx.scale(-1, 1);
        }
        if (flippedH) {
          ctx.scale(-1, 1);
        }
        if (flippedV) {
          ctx.scale(1, -1);
        }

        ctx.translate(-this.tSize.x / 2, -this.tSize.y / 2);

        ctx.drawImage(
          tile.img,
          tile.px,
          tile.py,
          this.tSize.x,
          this.tSize.y,
          0,
          0,
          this.tSize.x,
          this.tSize.y
        );

        ctx.restore();
      }
    }
  }

  // ---------- тайл / тайлсет ----------
  getTile(tileIndex) {
    const tileset = this.getTileset(tileIndex);
    if (!tileset) return null;

    const id = tileIndex - tileset.firstgid;
    const x = id % tileset.xCount;
    const y = Math.floor(id / tileset.xCount);

    return {
      img: tileset.image,
      px: x * this.tSize.x,
      py: y * this.tSize.y,
    };
  }

  getTileset(tileIndex) {
    for (let i = this.tilesets.length - 1; i >= 0; i--) {
      if (this.tilesets[i].firstgid <= tileIndex) {
        return this.tilesets[i];
      }
    }
    return null;
  }

  // ---------- видимость ----------
  isVisible(x, y, width, height) {
    if (x + width  < this.view.x)            return false;
    if (y + height < this.view.y)            return false;
    if (x > this.view.x + this.view.w)       return false;
    if (y > this.view.y + this.view.h)       return false;
    return true;
  }

  // ---------- objectgroup-слои / сущности ----------
  parseEntities() {
    // ждём, пока карта и тайлы реально загрузились
    if (!this.imgLoaded || !this.jsonLoaded || !this.gameManager) {
      setTimeout(() => this.parseEntities(), 100);
      return;
    }

    const gm = this.gameManager;
    if (!gm.factory) return;

    // очищаем кеш объектов и список сущностей (добавим заново)
    this.objects = [];
    gm.entities = gm.entities || [];

    for (const layer of this.mapData.layers) {
      if (layer.type !== 'objectgroup') continue;

      const entities = layer.objects || [];

      for (const e of entities) {
        try {
          const keyType = e.type || '';
          const keyName = e.name || '';

          // !!! СНАЧАЛА ищем по имени (Enemy1/Enemy2/Enemy3), потом по type (Enemy)
          let EntityClass = null;
          if (keyName && gm.factory[keyName]) {
            EntityClass = gm.factory[keyName];
          } else if (keyType && gm.factory[keyType]) {
            EntityClass = gm.factory[keyType];
          }

          if (!EntityClass) {
            console.warn('Нет класса для объекта карты:', e);
            continue;
          }

          const obj = new EntityClass();

          // имя из Tiled + привязка к spriteName
          if (e.name) {
            obj.name = e.name;
            if ('spriteName' in obj) {
              obj.spriteName = e.name; // Enemy1 → спрайт Enemy1
            }
          } else if (e.type) {
            obj.name = e.type;
          }

          // координаты
          const isTileObject = typeof e.gid === 'number';
          obj.pos_x  = e.x;
          obj.pos_y  = isTileObject ? e.y - e.height : e.y;

          obj.size_x = e.width  || obj.size_x || this.tSize.x;
          obj.size_y = e.height || obj.size_y || this.tSize.y;

          // ссылки на менеджеры
          obj.gameManager   = gm;
          obj.spriteManager = gm.spriteManager;

          if ('physicManager' in obj) {
            obj.physicManager = gm.physicManager;
          }

          // сохраняем
          this.objects.push(obj);
          gm.entities.push(obj);
        } catch (err) {
          console.error('Ошибка создания объекта карты:', e, err);
        }
      }
    }
  }

  // ---------- получить gid тайла по мировым координатам ----------
  getTilesetId(x, y) {
    if (!this.tLayer) return 0;

    const tileX = Math.floor(x / this.tSize.x);
    const tileY = Math.floor(y / this.tSize.y);

    if (tileX < 0 || tileX >= this.xCount || tileY < 0 || tileY >= this.yCount) {
      return 0;
    }

    const idx = tileY * this.xCount + tileX;
    return this.tLayer.data[idx] & GID_MASK;
  }

  // ---------- центрировать камеру ----------
  centerAt(x, y) {
    // по горизонтали
    if (x < this.view.w / 2) {
      this.view.x = 0;
    } else if (x > this.mapSize.x - this.view.w / 2) {
      this.view.x = this.mapSize.x - this.view.w;
    } else {
      this.view.x = x - this.view.w / 2;
    }

    // по вертикали
    if (y < this.view.h / 2) {
      this.view.y = 0;
    } else if (y > this.mapSize.y - this.view.h / 2) {
      this.view.y = this.mapSize.y - this.view.h;
    } else {
      this.view.y = y - this.view.h / 2;
    }
  }

  getObjectsByType(type) {
    return (this.objects || []).filter((o) => o.type === type);
  }

  getObjectsByName(name) {
    return (this.objects || []).filter((o) => o.name === name);
  }
}
