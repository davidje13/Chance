import Dice from './dice/dice.js';

const container = document.getElementById('content');
const faviconLink = document.getElementById('favicon');

const dice = new Dice(container);
dice.begin();
faviconLink.setAttribute('href', 'resources/dice/favicon.png');
