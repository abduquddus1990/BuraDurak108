import React from 'react';
import { Card } from '../../../../shared/src/types/card';
import { CardBackId } from '../../types/theme';
import { PlayingCard } from '../Cards/PlayingCard';
import { triggerHaptic } from '../../services/telegramSdk';
import { PlayableHint } from '../../../../shared/src/utils/playable';

interface CardHandProps {
  hand: Card[];
  selectedCardIds: string[];
  isMyTurn: boolean;
  onToggleCard: (card: Card) => void;
  onPlaySelected: () => void;
  onDrawCard?: () => void;
  onPassOrFold?: () => void;
  onTakeCards?: () => void;
  onOpenSpecialModal?: () => void;
  gameType: string;
  isDefender?: boolean;
  tableCardsCount?: number;
  hasSpecialHands?: boolean;
  pendingPenaltyCount?: number;
  cardBackId?: CardBackId;
  compact?: boolean;
  // Qaysi kartalar bilan yurish mumkinligi (xiralashtirish / yoritish)
  playableHint?: PlayableHint;
  // Botlar bilan o'yinda maslahat so'rash
  onHint?: () => void;
}

export const CardHand: React.FC<CardHandProps> = ({
  hand,
  selectedCardIds,
  isMyTurn,
  onToggleCard,
  onPlaySelected,
  onDrawCard,
  onPassOrFold,
  onTakeCards,
  onOpenSpecialModal,
  gameType,
  isDefender = false,
  tableCardsCount = 0,
  hasSpecialHands = false,
  pendingPenaltyCount = 0,
  cardBackId = 'paxtagul_gold',
  compact = false,
  playableHint = { mode: 'none' },
  onHint,
}) => {
  const handleCardClick = (card: Card) => {
    triggerHaptic('light');
    onToggleCard(card);
  };

  return (
    <div className={`w-full flex flex-col items-center ${compact ? 'gap-1 pb-0.5' : 'gap-2 pb-1.5'}`}>
      {/* Harakat tugmalari (Action Bar) */}
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'} flex-wrap justify-center`}>
        {/* Moskva / Bura / 41+ kombinatsiyasi tugmasi */}
        {hasSpecialHands && (
          <button
            onClick={onOpenSpecialModal}
            className={`${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black shadow-lg animate-pulse hover:brightness-110 flex items-center gap-1`}
          >
            <span>👑</span>
            <span>Kombinatsiya!</span>
          </button>
        )}

        {/* Maslahat (faqat botlar bilan o'yinda) */}
        {onHint && isMyTurn && (
          <button
            onClick={onHint}
            className={`${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-xl bg-sky-900/80 text-sky-100 border border-sky-500/60 font-bold shadow hover:bg-sky-800`}
            title="Qanday yurish kerak?"
          >
            💡
          </button>
        )}

        {/* Tanlangan kartalar bilan yurish / urish */}
        {selectedCardIds.length > 0 && isMyTurn && (
          <button
            onClick={onPlaySelected}
            className={`${compact ? 'px-3.5 py-1 text-xs' : 'px-4 py-1.5 text-xs sm:text-sm'} rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white font-bold shadow-xl hover:brightness-110 flex items-center gap-1.5 border border-emerald-400/40`}
          >
            <span>🎯</span>
            <span>{isDefender ? 'Urish' : 'Yurish'} ({selectedCardIds.length})</span>
          </button>
        )}

        {/* 108 da Bozordan karta olish yoki Jarimani ko'tarish */}
        {gameType === 'ONE_HUNDRED_EIGHT' && isMyTurn && onDrawCard && (
          <button
            onClick={onDrawCard}
            className={`${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-xl font-bold shadow flex items-center gap-1 border ${
              pendingPenaltyCount > 0
                ? 'bg-rose-800 text-white border-rose-400 animate-bounce'
                : 'bg-stone-800 text-amber-300 border-amber-600/40 hover:bg-stone-700'
            }`}
          >
            <span>📥</span>
            <span>
              {pendingPenaltyCount > 0
                ? `Jarima (${pendingPenaltyCount})`
                : 'Bozordan olish'}
            </span>
          </button>
        )}

        {/* DURAK: Himoyachi uchun "Kartalarni Olish" tugmasi */}
        {gameType === 'DURAK' && isDefender && tableCardsCount > 0 && onTakeCards && (
          <button
            onClick={onTakeCards}
            className={`${compact ? 'px-3 py-1 text-[11px]' : 'px-4 py-1.5 text-xs'} rounded-xl bg-gradient-to-r from-rose-700 to-red-800 text-white font-black shadow-lg hover:brightness-110 border border-rose-500/50 flex items-center gap-1`}
          >
            <span>📥</span>
            <span>Olish</span>
          </button>
        )}

        {/* DURAK: Bita (Otboy) yoki Bura: Pas / Tashlash */}
        {onPassOrFold && (
          <button
            onClick={onPassOrFold}
            className={`${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'} rounded-xl bg-stone-900/90 text-amber-200 border border-amber-700/60 font-bold shadow hover:bg-stone-800 flex items-center gap-1`}
          >
            <span>{gameType === 'DURAK' ? '✋ Bita' : 'Pas'}</span>
          </button>
        )}
      </div>

      {/* Qo'ldagi kartalar qatori (Fan Layout - Tartiblangan holda) */}
      <div className={`flex items-center justify-center ${compact ? '-space-x-5' : '-space-x-4 sm:-space-x-5'} px-2 max-w-full overflow-x-auto no-scrollbar ${compact ? 'py-0.5' : 'py-1.5'}`}>
        {hand.map((card, index) => {
          const isSelected = selectedCardIds.includes(card.id);
          const angle = (index - (hand.length - 1) / 2) * 4;

          return (
            <div
              key={card.id}
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: 'bottom center',
              }}
              className="transition-transform duration-200"
            >
              <PlayingCard
                card={card}
                isSelected={isSelected}
                cardBackId={cardBackId}
                onClick={() => handleCardClick(card)}
                size={compact && hand.length > 5 ? 'sm' : 'md'}
                dimmed={playableHint.mode === 'dim' && !playableHint.ids.has(card.id)}
                highlight={playableHint.mode === 'highlight' && playableHint.ids.has(card.id)}
                animation="deal"
                animationDelayMs={Math.min(index, 8) * 45}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
