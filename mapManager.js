'use strict';

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;
const GID_MASK                  = 0x1FFFFFFF;

export class mapManager {
    mapData = null; //хрпнение карты
    tLayer = null; //ссылки на блоки карты
    xCount = 0;
    yCount = 0;
    tSize = {x: 32, y: 32}; //размер блока
    mapSize = {x: 30, y: 30}; //размер карты в пикселях
    tilesets = []; //массив опис блоков карты
    imgLoadCount = 0;
    imgLoaded = false;
    jsonLoaded = false;
    view = { x: 0, y: 0, w: 0, h: 0};

    loadMap(path) {
        const request = new XMLHttpRequest(); // создание ajax-запроса

        request.onreadystatechange = () => {
            if (request.readyState === 4){
                if (request.status === 200 || request.status === 0) {
                    this.parseMap(request.responseText);
                } else {
                    console.error(`Не удалось загрузить карту: ${path}`);
                }
            }
        };

        request.open("GET", path, true); //true асинхронный запрос на path
        request.send();
    };

    parseMap(tilesJSON){
        this.mapData = JSON.parse(tilesJSON);

        this.xCount = this.mapData.width;
        this.yCount = this.mapData.height;

        this.tSize.x = this.mapData.tilewidth;
        this.tSize.y = this.mapData.tileheight;

        this.mapSize.x = this.xCount * this.tSize.x;
        this.mapSize.y = this.xCount * this.tSize.y;

        this.tilesets = [];
        this.imgLoadCount = 0;
        this.imgLoaded = false;


        for (let i = 0; i < this.mapData.tilesets.length; i++){
            const img = new Image();
            const t = this.mapData.tilesets[i];

            img.onload = () => {
                this.imgLoadCount++;
                if (this.imgLoadCount === this.tilesets.length) {//all of the pic was load?
                    this.imgLoaded = true;
                }
            };
            img.src = t.image;

            const ts = {
                firstgid: t.firstgid, //с чего начинается нумерация в дата
                image: img,
                name: t.name,
                xCount: Math.floor(t.imagewidth / t.tilewidth),
                yCount: Math.floor(t.imageheigth / t.tileheight),
                tSize: { x: t.tilewidth, y: t.tileheight}
            };
            this.tilesets.push(ts);
        }

        this.tLayer = null;
        for (let l = 0; l < this.mapData.layers.length; l++){
            const layer = this.mapData.layers[l];
            if (layer.type === 'tilelayer') {
                this.tLayer = layer;
                break;
            }
        }
        this.jsonLoaded = true;
    };

    draw(ctx) {
        if (!this.imgLoaded || !this.jsonLoaded) {
            setTimeout(() => this.draw(ctx), 100);
            return;
        }

        ctx.clearRect(0, 0, this.view.w, this.view.h);

        // все видимые тайловые слои в порядке
        const tileLayers = this.mapData.layers.filter(
            (layer) => layer.type === 'tilelayer' && layer.visible
        );

        for (const layer of tileLayers) {
            const data = layer.data;

            for (let i = 0; i < data.length; i++) {
                const rawId = data[i];
                if (!rawId) continue;

                // флаги флипа
                const flippedH = (rawId & FLIPPED_HORIZONTALLY_FLAG) !== 0;
                const flippedV = (rawId & FLIPPED_VERTICALLY_FLAG) !== 0;
                const flippedD = (rawId & FLIPPED_DIAGONALLY_FLAG) !== 0;

                // чистый gid без флагов
                const gid = rawId & GID_MASK;
                if (gid === 0) continue;

                const tile = this.getTile(gid);
                if (!tile) continue;

                const mapX = (i % this.xCount) * this.tSize.x;
                const mapY = Math.floor(i / this.xCount) * this.tSize.y;

                if (!this.isVisible(mapX, mapY, this.tSize.x, this.tSize.y)) continue;

                const screenX = mapX - this.view.x;
                const screenY = mapY - this.view.y;

                // --- рисуем с учётом флипов ---
                ctx.save();

                // центр тайла
                const cx = screenX + this.tSize.x / 2;
                const cy = screenY + this.tSize.y / 2;

                ctx.translate(cx, cy);

                // диагональный флип = поворот + отражение (как в Tiled)
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

                // возвращаемся к левому-верхнему углу тайла
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



    getTile(tileIndex) { //index of block
        const tileset = this.getTileset(tileIndex);
        if (!tileset) return;

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
        for (let i = this.tilesets.length - 1; i >= 0; i--){
            if (this.tilesets[i].firstgid <= tileIndex) {
                return this.tilesets[i];
            }
        }
        return null;
    }

    isVisible(x, y, width, height) {
        if (x + width < this.view.x) return false;
        if (y + height < this.view.y) return false;
        if (x > this.view.x + this.view.w) return false;
        if (y > this.view.y + this.view.h) return false;
        return true;
    }

};