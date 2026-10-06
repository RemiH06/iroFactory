// ══════════════════════════════════════════════════════
// CARTAS FLOTANTES — suben, giran, brillan en rojo
// ══════════════════════════════════════════════════════
import { cssVar, isDark, updateHexes } from './kit.js';

export const cardsContainer = document.getElementById('tarot-cards');
export const SUITS = ['♠','♥','♦','♣'];
export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const ARCANA_NAMES = ['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World'];
export function randomCard() {
  if (Math.random() < 0.25) {
    return { suit:'★', rank: ARCANA_NAMES[Math.floor(Math.random() * ARCANA_NAMES.length)], arcana: true };
  }
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  return { suit, rank, arcana: false };
}
export function suitColor(suit) {
  if (suit === '♥' || suit === '♦') return cssVar('--hearts');
  if (suit === '♠') return cssVar('--spades');
  if (suit === '♣') return cssVar('--clubs');
  if (suit === '★') return cssVar('--arcana');
  return cssVar('--gold');
}
export function createFloatingCard() {
  const card = document.createElement('div');
  card.className = 'tarot-card';

  const data   = randomCard();
  const color  = suitColor(data.suit);
  const rotStart = (Math.random() - .5) * 30;
  const rotEnd   = rotStart + (Math.random() - .5) * 40;
  const dur = 14 + Math.random() * 12;
  const left     = Math.random() * 90 + 5;

  card.style.setProperty('--rot-start', rotStart + 'deg');
  card.style.setProperty('--rot-end',   rotEnd   + 'deg');
  card.style.left           = left + 'vw';
  card.style.animationDuration = dur + 's';

  // Dorso
  const back = document.createElement('div');
  back.className = 'card-back';
  back.style.background = isDark ? '#1A0608' : '#701018';
  back.style.borderColor = cssVar('--gold');
  back.innerHTML = `<span style="color:${cssVar('--gold')};font-size:24px;opacity:.7">✦</span>`;

  // Frente
  const face = document.createElement('div');
  face.className = 'card-face';
  face.style.background = cssVar('--ivory');
  face.style.borderColor = cssVar('--gold');
  face.innerHTML = `
    <div class="card-suit" style="color:${color}">${data.suit}</div>
    <div class="card-name" style="color:${cssVar('--gold-dk')}">${data.arcana ? data.rank : data.rank + ' ' + data.suit}</div>
  `;

  card.appendChild(back);
  card.appendChild(face);
  cardsContainer.appendChild(card);

  setTimeout(() => card.remove(), dur * 1000);
}
export function mount() {
setInterval(createFloatingCard, 2000);
updateHexes();
}
