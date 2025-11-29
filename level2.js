// level2.js
import { GameManager } from './managers/gameManager.js'

console.log('level2.js загружен')

const gm = new GameManager()

gm.init('game', {
  map: './level2.json',
  atlasJson: './img/sprites.json',
  atlasImg: './img/sprites.png',
  keysTotal: 5,
  startX: 224,
  startY: 896,
})

gm.start()
