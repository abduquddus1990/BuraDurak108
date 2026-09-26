import React, { useState } from 'react';
import { PlayerPublic, GameType } from '../../../../shared/src/types/game';
import { CardBackId } from '../../types/theme';
import { PlayingCard } from '../Cards/PlayingCard';
import { Bot, WifiOff } from 'lucide-react';

interface PlayerSeatProps {
  player: PlayerPublic;
  position: 'top' | 'left' | 'right' | 'bottom';
  isCurrentPlayer?: boolean;
  cardBackId?: CardBackId;
  gameType?: GameType;
  compact?: boolean;
  // Navbat taymeri: 1 - vaqt to'la, 0 - tugadi (faqat navbatdagi o'yinchi uchun)
  timerFraction?: number | null;
  isDealer?: boolean;
}

// Avatar atrofida aylanib kamayuvchi taymer halqasi
const TimerRing: React.FC<{ fraction: number; size: number }> = ({ fraction, size }) => {
  const r = size / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const color = fraction > 0.5 ? '#34d399' : fraction > 0.2 ? '#fbbf24' : '#f43f5e';
  return (
    <svg className="absolute inset-0 -rotate-90 pointer-events-none" width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, fraction)))}
        style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.5s' }}
      />
    </svg>
  );
};

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  position,
  isCurrentPlayer = false,
  cardBackId = 'paxtagul_gold',
  gameType = 'BURA',
  compact = false,
  timerFraction = null,
  isDealer = false,
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarPx = compact ? 28 : 36;
  const disconnected = !player.isBot && player.isConnected === false;
  const isSide = position === 'left' || position === 'right';

  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-0.5' : 'gap-1.5'} transition-all duration-300 ${player.isTurn ? 'scale-105' : 'opacity-90'} ${player.isFolded ? 'opacity-40' : ''}`}>
      <div
        className={`
          relative flex items-center ${compact ? 'gap-1.5 px-1.5 py-0.5' : 'gap-2 px-2 py-1'} rounded-full border-2
          ${player.isTurn ? 'border-amber-400 bg-amber-950/80 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'border-amber-900/40 bg-stone-900/80'}
          backdrop-blur-md
        `}
      >
        <div className="relative shrink-0" style={{ width: avatarPx, height: avatarPx }}>
          <div className="absolute inset-[3px] rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center font-bold text-white shadow overflow-hidden text-[10px]">
            {player.avatarUrl && !avatarFailed ? (
              <img
                src={player.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
              />
            ) : player.isBot ? (
              <Bot className="w-3.5 h-3.5 text-amber-100" />
            ) : (
              player.username.slice(0, 2).toUpperCase()
            )}
          </div>
          {player.isTurn && timerFraction !== null && <TimerRing fraction={timerFraction} size={avatarPx} />}
          {isDealer && (
            <span className="absolute -bottom-1 -right-1 text-[10px] leading-none" title="Tarqatuvchi">🃏</span>
          )}
        </div>

        <div className="flex flex-col text-left leading-tight pr-1">
          <div className="flex items-center gap-1">
            <span className={`${compact ? 'text-[11px] max-w-[70px]' : 'text-xs max-w-[90px]'} font-semibold text-amber-100 truncate`}>
              {player.username}
            </span>
            {isCurrentPlayer && <span className="text-[9px] text-amber-400 font-bold">(Siz)</span>}
          </div>
          {disconnected ? (
            <span className="flex items-center gap-1 text-[9px] text-rose-300 font-bold">
              <WifiOff className="w-3 h-3" /> uzildi · bot o'ynamoqda
            </span>
          ) : (
            <div className={`flex items-center gap-1.5 ${compact ? 'text-[9px]' : 'text-[10px]'} text-amber-300/80`}>
              {gameType === 'BURA' ? (
                <>
                  <span>Ochko: <b className="text-emerald-300">{player.score}</b></span>
                  <span className="text-rose-400 font-bold">Jarima: <b className="text-amber-200">{player.penaltyPoints}</b>/12</span>
                </>
              ) : gameType === 'ONE_HUNDRED_EIGHT' ? (
                <span>
                  {player.isFolded ? 'Chiqib ketdi' : <>Jami: <b className="text-amber-200">{player.penaltyPoints}</b> / 108</>}
                </span>
              ) : (
                <span>
                  Kartalar: <b className="text-amber-200">{player.cardsCount}</b> ta
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {!isCurrentPlayer && (
        <div className={`flex ${isSide ? '-space-x-6' : compact ? '-space-x-5' : '-space-x-4'} items-center`}>
          {Array.from({ length: Math.min(player.cardsCount, isSide ? 4 : 6) }).map((_, i) => (
            <PlayingCard key={i} isFaceDown cardBackId={cardBackId} size="sm" className="rotate-2 transform shadow" />
          ))}
          {player.cardsCount > (isSide ? 4 : 6) && (
            <span className="text-xs text-amber-300 font-bold pl-4">+{player.cardsCount - (isSide ? 4 : 6)}</span>
          )}
        </div>
      )}
    </div>
  );
};
