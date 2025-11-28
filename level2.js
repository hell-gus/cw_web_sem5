// level2.js
import { GameManager } from './managers/gameManager.js'

const gm = new GameManager()

gm.init('game', {
    map: './level2.json',
    atlasJson: './img/cat_ginger_atlas.json',
    atlasImg: './img/cat_ginger_atlas.png',
    playerSprite: 'cat_ginger_1',
    startX: 200,
    startY: 200,
})

gm.start()
