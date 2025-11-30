// level1.js
import { GameManager } from './managers/gameManager.js'

console.log('level1.js загружен')

const gm = new GameManager()

let playerName = 'Игрок'
try {
  const stored = localStorage.getItem('catGamePlayerName')
  if (stored) playerName = stored
} catch (e) {}

gm.init('game', {
  map: './level1.json',

  atlasJson: './img/cat_ginger_atlas.json',
  atlasImg: './img/Cat.png',
  playerSprite: 'cat_ginger_1',

  playerName,
  level: 1,

  // на ПЕРВОМ уровне 5 ключей
  keysTotal: 5,
  keepScore: false,

  // -------- ВТОРОЙ УРОВЕНЬ --------
  nextLevelConfig: {
    map: './level2.json',
    atlasJson: './img/cat_ginger_atlas.json',
    atlasImg: './img/Cat.png',
    playerSprite: 'cat_ginger_1',
    level: 2,

    // на ВТОРОМ уровне 7 ключей
    keysTotal: 7,
    keepScore: true,
  },
})

gm.start()
window.gm = gm
