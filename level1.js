// level1.js
import { GameManager } from './managers/gameManager.js'

console.log('level1.js загружен')

const gm = new GameManager()

// читаем имя игрока из localStorage
let playerName = 'cat'
try {
  const stored = localStorage.getItem('catGamePlayerName')
  if (stored) playerName = stored
} catch (e) {}

// читаем, на какой уровень зашли из game.html?level=1/2
const params = new URLSearchParams(window.location.search)
const levelParam = Number(params.get('level')) || 1

if (levelParam === 2) {
  // зашли сразу на 2 уровень: считаем,
  // что очков за первый нет (score = 0)
  gm.init('game', {
    map: './level2.json',

    playerName,
    level: 2,

    // на ВТОРОМ уровне 7 ключей
    keysTotal: 7,
    keepScore: false, // первый уровень не играли

    // после 2-го сразу к рекордам
    nextLevelConfig: null,
  })
} else {
  // обычный старт с 1 уровня
  gm.init('game', {
    map: './level1.json',

    playerName,
    level: 1,

    // на ПЕРВОМ уровне 5 ключей
    keysTotal: 5,
    keepScore: false,

    // -------- ВТОРОЙ УРОВЕНЬ --------
    nextLevelConfig: {
      map: './level2.json',
      level: 2,

      // на ВТОРОМ уровне 7 ключей
      keysTotal: 7,
      // когда перейдём со 2-го, счёт уже есть — добавляем к нему
      keepScore: true,
    },
  })
}

gm.start()
window.gm = gm
