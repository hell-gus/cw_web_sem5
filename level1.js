// level1.js
import { GameManager } from './managers/gameManager.js'

console.log('level1.js загружен')

const gm = new GameManager()

gm.init('game', {
  map: './level1.json',

  // ВМЕСТО cat_ginger_atlas.* — твой текущий атлас
  atlasJson: './img/sprites.json',
  atlasImg: './img/sprites.png',

  // playerSprite можно не передавать, Player сам берёт sprite6
  keysTotal: 5,
  startX: 224,
  startY: 896,
})

gm.start()
