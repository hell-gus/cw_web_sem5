// level1.js
import { GameManager } from './managers/gameManager.js'

console.log('level1.js загружен')

const gm = new GameManager()

gm.init('game', {
  map: './level1.json',

  atlasJson: './img/sprites.json',
  atlasImg: './img/sprites.png',

  keysTotal: 5,
  startX: 224,
  startY: 896,

  // >>> конфиг следующего уровня
  nextLevelConfig: {
    map: './level2.json',
    atlasJson: './img/sprites.json',
    atlasImg: './img/sprites.png',
    keysTotal: 7,
    startX: 64,
    startY: 64,
    level: 2,
  },
})

gm.start()

// чтобы посмотреть gm в консоли
window.gm = gm
