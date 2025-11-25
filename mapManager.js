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

        this.tLayer = null;
        for (let l = 0; l < this.mapData.layers.length; l++) {
            const layer = this.mapData.layers[l];
            if (layer.type === 'tilelayer') {
                this.tLayer = layer;
                break;
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
            layer => layer.type === 'tilelayer' && layer.visible
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
                    ctx.rotate(90 * Math.PI / 180);
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

    // ---------- objectgroup-слои ----------
    parseEntities() {
        if (!this.imgLoaded || !this.jsonLoaded) {
            setTimeout(() => this.parseEntities(), 100);
            return;
        }

        for (const layer of this.mapData.layers) {
            if (layer.type !== 'objectgroup') continue;

            const entities = layer.objects || [];

            for (const e of entities) {
                try {
                    const proto = gameManager.factory[e.type];
                    if (!proto) {
                        console.warn(`Unknown entity type: ${e.type}`);
                        continue;
                    }

                    const obj = Object.create(proto);

                    obj.name   = e.name;
                    obj.pos_x  = e.x;
                    obj.pos_y  = e.y;
                    obj.size_x = e.width;
                    obj.size_y = e.height;

                    gameManager.entities.push(obj);

                    if (obj.name === 'player') {
                        gameManager.initPlayer(obj);
                    }
                } catch (ex) {
                    console.log(`Error while creating: [${e.gid}] ${e.type}, ${ex}`);
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
}
