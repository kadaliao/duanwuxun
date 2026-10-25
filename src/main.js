import { Game } from './game/game.js';
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game(document.getElementById('gl'), document.getElementById('ui'));
  window.game = game;
  game.start();
});
import * as THREE from 'three';
window.THREE = THREE;
