import Dice from './dice/dice.js';

const container = document.getElementById('content');

const dice = new Dice(container);
dice.begin();
