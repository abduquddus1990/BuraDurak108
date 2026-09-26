import React from 'react';
import { Card, SUIT_SYMBOLS } from '../../../../shared/src/types/card';
import { CardBackId, CARD_BACK_THEMES } from '../../types/theme';

interface PlayingCardProps {
  card?: Card;
  isFaceDown?: boolean;
  isSelected?: boolean;
  isPlayable?: boolean;
  cardBackId?: CardBackId;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isFaceDown = false,
  isSelected = false,
  isPlayable = true,
  cardBackId = 'paxtagul_gold',
  onClick,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-md overflow-hidden',
    md: 'w-14 h-20 text-xs sm:text-sm rounded-lg overflow-hidden',
    lg: 'w-20 h-28 text-base rounded-xl overflow-hidden',
  };

  const cardBack = CARD_BACK_THEMES[cardBackId] || CARD_BACK_THEMES.paxtagul_gold;

  if (isFaceDown || !card) {
    return (
      <div
        className={`${sizeClasses[size]} ${cardBack.backgroundClass} shadow-md flex items-center justify-center p-1 relative border transition-all ${className}`}
        style={{ borderColor: cardBack.borderColor }}
      >
        <div
          className="w-full h-full border border-dashed rounded flex flex-col items-center justify-center relative overflow-hidden"
          style={{ borderColor: `${cardBack.borderColor}55` }}
        >
          <span className="text-base sm:text-lg drop-shadow">{cardBack.symbol}</span>
        </div>
      </div>
    );
  }

  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      className={`
        ${sizeClasses[size]} 
        bg-amber-50 text-slate-900 border-2 font-bold select-none cursor-pointer flex flex-col justify-between ${size === 'sm' ? 'p-1' : 'p-1.5'} relative
        ${isSelected ? 'border-amber-400 -translate-y-3 shadow-xl ring-2 ring-amber-400' : 'border-amber-200/80 shadow-md'}
        ${!isPlayable ? 'opacity-70 cursor-not-allowed filter grayscale-[30%]' : 'hover:-translate-y-2'}
        transition-all duration-500 ease-out
        ${className}
      `}
      style={{ color: isRed ? '#dc2626' : '#0f172a' }}
    >
      {size === 'sm' ? (
        <div className="w-full h-full flex flex-col justify-between relative overflow-hidden">
          {/* Yuqori burchak: Nominal va Gul */}
          <div className="flex items-center gap-0.5 leading-none">
            <span className="text-[11px] font-black">{card.rank}</span>
            <span className="text-[9px] leading-none">{symbol}</span>
          </div>

          {/* Markaziy suv belgisi */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <span className="text-xl font-black">{symbol}</span>
          </div>

          {/* Pastki o'ng burchak (Aylantirilgan, karta chegarasidan chiqmaydi) */}
          <div className="flex items-center gap-0.5 leading-none self-end rotate-180">
            <span className="text-[11px] font-black">{card.rank}</span>
            <span className="text-[9px] leading-none">{symbol}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center leading-none">
            <span className="text-xs sm:text-sm font-black">{card.rank}</span>
            <span className="text-[10px] sm:text-xs">{symbol}</span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <span className="text-3xl sm:text-4xl">{symbol}</span>
          </div>

          <div className="flex flex-col items-center leading-none rotate-180">
            <span className="text-xs sm:text-sm font-black">{card.rank}</span>
            <span className="text-[10px] sm:text-xs">{symbol}</span>
          </div>
        </>
      )}
    </div>
  );
};
