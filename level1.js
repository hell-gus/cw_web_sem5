import { GameManager } from './managers/gameManager.js'

console.log('level1.js загружен')

const gm = new GameManager()

gm.init('game', {
  map: './level1.json',
  atlasJson: './img/cat_ginger_atlas.json',
  atlasImg: './img/cat_ginger_atlas.png',
  playerSprite: 'cat_ginger_1',
  startX: 100,
  startY: 100,
})

gm.start()

// для отладки
window.gm = gm
