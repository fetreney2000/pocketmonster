import { Game } from './src/core/Game.js';

const canvas = document.getElementById('game-canvas');
const game   = new Game(canvas);
game.init().catch(err => {
  console.error('Failed to initialize game:', err);
  document.body.innerHTML = `<div style="color:white;padding:20px;font-family:monospace;">
    <h2>Error starting game</h2>
    <p>${err.message}</p>
    <p>Make sure you are running this from a web server (e.g. <code>npx serve .</code>)</p>
  </div>`;
});
