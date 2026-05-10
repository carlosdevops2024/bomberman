/* ═══════════════════════════════════════
   CORPOFFICE — main.js
   Punto de entrada: arranque del juego
═══════════════════════════════════════ */

import { ensureAudio, SFX } from './audio.js';
import { GameScene, W, H }  from './game.js';

document.getElementById('btn-start').addEventListener('click', () => {
  ensureAudio();
  SFX.uiClick();

  const intro = document.getElementById('intro-screen');
  intro.style.transition = 'opacity 0.7s ease';
  intro.style.opacity    = '0';

  setTimeout(() => {
    intro.style.display = 'none';
    document.getElementById('hud').style.display           = 'flex';
    document.getElementById('game-container').style.display = 'block';

    new Phaser.Game({
      type:            Phaser.AUTO,
      width:           W,
      height:          H,
      backgroundColor: '#1a0a00',
      parent:          'game-container',
      physics: {
        default: 'arcade',
        arcade:  { debug: false },
      },
      scene: [GameScene],
    });
  }, 700);
});