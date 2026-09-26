import React from 'react';
import { PlayerPublic, GameType } from '../../../../shared/src/types/game';
import { CardBackId } from '../../types/theme';
import { PlayingCard } from '../Cards/PlayingCard';
import { Bot } from 'lucide-react';

interface PlayerSeatProps {
  player: PlayerPublic;
  position: 'top' | 'left' | 'right' | 'bottom';
  isCurrentPlayer?: boolean;
  cardBackId?: CardBackId;
  gameType?: GameType;
  compact?: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentPlayer = false,
  cardBackId = 'paxtagul_gold',
  gameType = 'BURA',
  compact = false,
}) => {
  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-0.5' : 'gap-1.5'} transition-all duration-300 ${player.isTurn ? 'scale-105' : 'opacity-90'}`}>
      <div
        className={`
          relative flex items-center ${compact ? 'gap-1.5 px-2 py-0.5' : 'gap-2 px-3 py-1.5'} rounded-full border-2 
          ${player.isTurn ? 'border-amber-400 bg-amber-950/80 shadow-[0_0_15px_rgba(234,179,8,0.5)] ring-2 ring-amber-400/50' : 'border-amber-900/40 bg-stone-900/80'}
          backdrop-blur-md
        `}
      >
        <div className={`${compact ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center font-bold text-white shadow relative shrink-0`}>
          {player.isBot ? <Bot className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-amber-100`} /> : player.username.slice(0, 2).toUpperCase()}
          {player.isTurn && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-stone-900 animate-ping" />
          )}
        </div>

        <div className="flex flex-col text-left leading-tight pr-1">
          <div className="flex items-center gap-1">
            <span className={`${compact ? 'text-[11px] max-w-[70px]' : 'text-xs max-w-[90px]'} font-semibold text-amber-100 truncate`}>
              {player.username}
            </span>
            {isCurrentPlayer && <span className="text-[9px] text-amber-400 font-bold">(Siz)</span>}
          </div>
          <div className={`flex items-center gap-1.5 ${compact ? 'text-[9px]' : 'text-[10px]'} text-amber-300/80`}>
            {gameType === 'BURA' ? (
              <span className="text-rose-400 font-bold">
                Jarima: <b className="text-amber-200">{player.penaltyPoints}</b> / 12
              </span>
            ) : gameType === 'ONE_HUNDRED_EIGHT' ? (
              <span>
                Jami: <b className="text-amber-200">{player.score}</b> / 108
              </span>
            ) : (
              <span>
                Kartalar: <b className="text-amber-200">{player.cardsCount}</b> ta
              </span>
            )}
          </div>
        </div>
      </div>

      {!isCurrentPlayer && (
        <div className={`flex ${compact ? '-space-x-5' : '-space-x-4'} items-center`}>
          {Array.from({ length: Math.min(player.cardsCount, 6) }).map((_, i) => (
            <PlayingCard key={i} isFaceDown cardBackId={cardBackId} size="sm" className="rotate-2 transform shadow" />
          ))}
          {player.cardsCount > 6 && (
            <span className="text-xs text-amber-300 font-bold pl-4">+{player.cardsCount - 6}</span>
          )}
        </div>
      )}
    </div>
  );
};
