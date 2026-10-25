import { Game } from './game/game.js';
import * as THREE from 'three';
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game(document.getElementById('gl'), document.getElementById('ui'));
  window.game = game; window.THREE = THREE;
  game.start();
});
