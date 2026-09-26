import { BuraEngine } from '../src/engine/BuraEngine';
import { Card } from '../../shared/src/types/card';

function assert(cond: boolean, name: string) {
  if (!cond) {
    console.error('FAILED:', name);
    process.exit(1);
  }
  console.log('PASSED:', name);
}

console.log('--- TEST BURA LAST CARD & NEW TRUMP ---');

const bura = new BuraEngine('test_bura_last', {
  id: 'test_bura_last',
  gameType: 'BURA',
  rules: 'ODDIY',
  maxPlayers: 2,
  turnTimeoutSeconds: 15,
  isPrivate: true,
  deckType: '36',
});

bura.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
bura.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
bura.initGame();
// Tasodifiy tarqatishda Moskva/Bura chiqib qolsa ham test barqaror bo'lishi uchun
bura.status = 'PLAYING';
bura.roundSummary = undefined;

const initialTrump = bura.trumpSuit;
console.log('Boshlangich kozir:', initialTrump);
assert(bura.trumpCard !== undefined, 'Koloda ostida yopiq karta mavjud');

// Kolodani 1 ta karta qoladigan qilib kamaytiramiz:
const knownLastCard: Card = {
  suit: initialTrump === 'HEARTS' ? 'SPADES' : 'HEARTS',
  rank: '10',
  id: 'SPADES_10'
};
bura.deck = [knownLastCard];

// p1 va p2 kartalarini 3 tadan qilib qoyaylik, toki bitta karta olishi kerak bolsin:
bura.players[0].hand = bura.players[0].hand.slice(0, 3);
bura.players[1].hand = bura.players[1].hand.slice(0, 3);

// p1 (Ali) vzyatka yutgach kartalarni toldiradi:
bura.dealCardsInBura(0);

assert(bura.isLastTrumpRevealed === true, 'Oxirgi karta yangi kozer sifatida ochildi');
assert(bura.trumpSuit === knownLastCard.suit, 'Yangi kozir masti almashdi');
assert(bura.deck.length === 0, 'Kolodada 0 ta karta qoldi');
assert(bura.trumpCard === undefined, 'Stolda yotgan tegilmagan kozer qolmadi');
assert(bura.players[0].hand.some(c => c.id === knownLastCard.id), 'Oxirgi karta Ali qoliga otdi');

console.log('Yangi kozer:', bura.trumpSuit);
console.log('Ali qolidagi kartalar:', bura.players[0].hand.length);
console.log('Vali qolidagi kartalar:', bura.players[1].hand.length);

console.log('--- TEST SPECIAL COMBINATION ALERT ---');
// Ali qoliga Molodka (4 ta bir xil mast) beramiz:
const nonTrumpSuit = bura.trumpSuit === 'HEARTS' ? 'DIAMONDS' : 'HEARTS';
const molodkaCards: Card[] = [
  { suit: nonTrumpSuit, rank: '7', id: 'm1' },
  { suit: nonTrumpSuit, rank: '8', id: 'm2' },
  { suit: nonTrumpSuit, rank: '9', id: 'm3' },
  { suit: nonTrumpSuit, rank: '10', id: 'm4' },
];
bura.players[0].hand = [...molodkaCards];
bura.tableCards = [];
bura.activePlayerIndex = 0;

bura.playCards('p1', molodkaCards);
assert(bura.specialCombinationAlert !== null && bura.specialCombinationAlert !== undefined, 'Molodka ochilganda specialCombinationAlert shakllandi');
assert(bura.specialCombinationAlert?.type === 'MOLODKA', 'Kombinatsiya turi MOLODKA');
console.log('SpecialCombinationAlert:', bura.specialCombinationAlert?.title);

console.log('BARCHA TESTLAR 100% MUVAFFAQISHLI OTDI!');
