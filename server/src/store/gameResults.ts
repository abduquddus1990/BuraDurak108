import { GameRoom } from '../rooms/GameRoom';
import { UserStore, PlayerResultEffects } from './UserStore';

/**
 * Tugagan stol natijasini omborga yozadi: kim yutdi/yutqazdi, ELO (kamida 2 odam bo'lsa),
 * tarix, kunlik vazifalar va partiya hodisalaridan kelib chiqadigan yutuqlar.
 * Botlar va omborda yo'q o'yinchilar hisobga olinmaydi.
 */
export function recordRoomResult(room: GameRoom, store: UserStore): Map<string, PlayerResultEffects> {
  const humans = room.engine.players.filter(p => !p.isBot && store.get(p.id)).map(p => p.id);
  if (humans.length === 0) return new Map();
  const { winners, losers } = room.engine.getFinalResults();
  const humanSet = new Set(humans);
  const eventsByPlayer: Record<string, string[]> = {};
  for (const event of room.engine.gameEvents) {
    (eventsByPlayer[event.playerId] = eventsByPlayer[event.playerId] || []).push(event.type);
  }
  return store.recordGameResult({
    gameType: room.settings.gameType,
    rules: room.settings.rules,
    humanPlayerIds: humans,
    winners: winners.filter(id => humanSet.has(id)),
    losers: losers.filter(id => humanSet.has(id)),
    rated: humans.length >= 2,
    playerNames: Object.fromEntries(room.engine.players.map(p => [p.id, p.username])),
    eventsByPlayer,
  });
}
