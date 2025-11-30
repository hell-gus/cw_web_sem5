// level1.js
import { GameManager } from './managers/gameManager.js'

console.log('level1.js загружен')

const gm = new GameManager()

// имя игрока берём из localStorage (его кладёт login.html)
let playerName = 'Игрок'
try {
  const stored = localStorage.getItem('catGamePlayerName')
  if (stored) playerName = stored
} catch (e) {}

// ИГРА: первый уровень + конфиг второго
gm.init('game', {
  map: './level1.json',

  // атлас анимации кота: JSON тот же, а картинка — Cat.png
  atlasJson: './img/cat_ginger_atlas.json',
  atlasImg: './img/Cat.png',
  playerSprite: 'cat_ginger_1',

  playerName,
  level: 1,
  keepScore: false,

  // конфиг второго уровня
  nextLevelConfig: {
    map: './level2.json',
    atlasJson: './img/cat_ginger_atlas.json',
    atlasImg: './img/Cat.png',
    playerSprite: 'cat_ginger_1',
    level: 2,
    // если нужно иное число ключей на 2 уровне:
    // keysTotal: 3,
  },
})

gm.start()
window.gm = gm
