import { mapManager } from './managers/mapManager.js'
import { SpriteManager } from './managers/spriteManager.js'

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

// --- карта ---
const mm = new mapManager()
mm.view = { x: 0, y: 0, w: canvas.width, h: canvas.height }
mm.loadMap('./level1.json')

// --- спрайты кота ---
const sm = new SpriteManager()
sm.loadAtlas('./img/cat_ginger_atlas.json', './img/cat_ginger_atlas.png')

// имя кадра берём из JSON
// открой cat_ginger_atlas.json и посмотри первый ключ в "frames"
// например там может быть "Cat_Ginger_0" или "Cat_Ginger_0.png"
const TEST_SPRITE_NAME = 'Cat_Ginger_0' // ПОДСТАВЬ своё имя из json

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // фон-карта
  if (mm.mapData) {
    mm.draw(ctx)
  }

  // кот поверх карты
  if (sm.imgLoaded && sm.jsonLoaded) {
    // координаты в пикселях: здесь он будет стоять где-то в центре
    sm.drawSprite(ctx, 'cat_ginger_1', 400, 300)
  }

  requestAnimationFrame(loop)
}

loop()
