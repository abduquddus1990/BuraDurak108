// Stress-test: faqat botlar o'ynaydigan ko'plab o'yinlar. O'yin qotib qolsa, xato bersa yoki
// kartalar soni buzilsa (yo'qolsa/ko'payib ketsa) - test yiqiladi.
import { BuraEngine } from '../src/engine/BuraEngine';
import { DurakEngine } from '../src/engine/DurakEngine';
import { OneHundredEightEngine } from '../src/engine/OneHundredEightEngine';
import { BotAI } from '../src/ai/BotAI';
import { GameRules, GameType } from '../../shared/src/types/game';

const GAMES_PER_CONFIG = 60;
const MAX_STEPS = 5000;

const configs: { gameType: GameType; rules: GameRules; players: number[] }[] = [
  { gameType: 'BURA', rules: 'ODDIY', players: [2, 3, 4] },
  { gameType: 'BURA', rules: 'MOLOTKALI', players: [2, 3, 4] },
  { gameType: 'BURA', rules: 'FORTY_ONE', players: [2, 3, 4] },
  { gameType: 'BURA', rules: 'SIX_CARDS', players: [2, 3] },
  { gameType: 'DURAK', rules: 'PEREKIDSIZ', players: [2, 3, 4, 6] },
  { gameType: 'DURAK', rules: 'PEREKIDLI', players: [2, 3, 4, 6] },
  { gameType: 'ONE_HUNDRED_EIGHT', rules: 'KOROL_QARGA', players: [2, 3, 4] },
  { gameType: 'ONE_HUNDRED_EIGHT', rules: 'KOROL_OLMA', players: [2, 3, 4] },
];

let failures = 0;

function runGame(gameType: GameType, rules: GameRules, n: number): string | null {
  const settings = { id: 'sim', gameType, rules, maxPlayers: n, turnTimeoutSeconds: 15, isPrivate: true, deckType: '36' as const };
  const engine: any = gameType === 'BURA' ? new BuraEngine('sim', settings)
    : gameType === 'DURAK' ? new DurakEngine('sim', settings)
    : new OneHundredEightEngine('sim', settings);
  for (let i = 0; i < n; i++) engine.addPlayer({ id: `b${i}`, username: `B${i}`, isBot: true });
  engine.initGame();

  for (let step = 0; step < MAX_STEPS; step++) {
    if (engine.status === 'GAME_OVER') return null;
    if (engine.status === 'ROUND_OVER') {
      for (const p of engine.players) engine.playerReadyForNextRound(p.id);
      continue;
    }
    const active = engine.players[engine.activePlayerIndex];
    let res: any;
    if (engine instanceof BuraEngine) {
      const move = BotAI.makeBuraMove(engine, active.id);
      if (move.action === 'DECLARE' && move.type) res = engine.declareCombination(active.id, move.type);
      else if (move.action === 'PLAY' && move.cards) res = engine.playCards(active.id, move.cards);
      else res = engine.foldOrPass(active.id, move.cards || []);
      if (!res.success) res = engine.foldOrPass(active.id, []);
      // Avtomatik kombinatsiya ham vzyatkani yakunlashi mumkin - shuning uchun holat bo'yicha tekshiramiz
      while (engine.isResolvingTrick) engine.resolveTrick();
      // Bura: kartalar soni saqlanishi (qo'l + stol + koloda + olingan)
      const total = engine.deck.length + engine.tableCards.reduce((s: number, tc: any) => s + 1 + (tc.beatenBy && tc.beatenBy.id !== tc.card.id ? 1 : 0), 0)
        + engine.players.reduce((s: number, p: any) => s + p.hand.length + (p.wonCards?.length || 0), 0);
      if (engine.status === 'PLAYING' && total !== 36) return `Bura kartalar soni buzildi: ${total}`;
    } else if (engine instanceof OneHundredEightEngine) {
      const move = BotAI.make108Move(engine, active.id);
      res = move.action === 'PLAY' && move.card ? engine.playCard(active.id, move.card, move.chosenSuit) : { success: false };
      if (!res.success) res = engine.drawCard(active.id);
      if (!res.success) res = engine.pass(active.id);
    } else {
      const move = BotAI.makeDurakMove(engine, active.id);
      if (move.action === 'ATTACK' && move.card) res = engine.attack(active.id, move.card);
      else if (move.action === 'DEFEND' && move.card && move.targetCardId) res = engine.defend(active.id, move.targetCardId, move.card);
      else if (move.action === 'TAKE') res = engine.takeCards(active.id);
      else res = engine.passOrBita(active.id);
      if (!res.success) {
        const isDefender = engine.players[engine.defenderIndex]?.id === active.id;
        res = isDefender ? engine.takeCards(active.id) : engine.passOrBita(active.id);
      }
      const total = engine.deck.length + engine.tableCards.reduce((s: number, tc: any) => s + 1 + (tc.beatenBy ? 1 : 0), 0)
        + engine.players.reduce((s: number, p: any) => s + p.hand.length, 0);
      if (total > 36) return `Durak kartalar soni ko'payib ketdi: ${total}`;
    }
    if (!res || !res.success) {
      return `Qotib qoldi (qadam ${step}, ${active.id}): ${res?.message}`;
    }
  }
  return `${MAX_STEPS} qadamda tugamadi`;
}

for (const cfg of configs) {
  for (const n of cfg.players) {
    let ok = 0;
    const errors = new Map<string, number>();
    for (let g = 0; g < GAMES_PER_CONFIG; g++) {
      let err: string | null;
      try {
        err = runGame(cfg.gameType, cfg.rules, n);
      } catch (e: any) {
        err = `Exception: ${e.message}`;
      }
      if (err) errors.set(err, (errors.get(err) || 0) + 1);
      else ok++;
    }
    const label = `${cfg.gameType}/${cfg.rules}/${n} kishi`;
    if (errors.size === 0) {
      console.log(`✅ ${label}: ${ok}/${GAMES_PER_CONFIG}`);
    } else {
      failures++;
      console.log(`❌ ${label}: ${ok}/${GAMES_PER_CONFIG}`);
      for (const [e, c] of errors) console.log(`    ${c}x ${e}`);
    }
  }
}

if (failures > 0) process.exit(1);
console.log('\n🎉 Barcha simulyatsiyalar muvaffaqiyatli yakunlandi');
