import React from 'react';
import { Card, Suit, SUIT_SYMBOLS, SUIT_NAMES_UZ } from '../../../../shared/src/types/card';
import { PlayedTrickCard, GameType } from '../../../../shared/src/types/game';
import { PlayingCard } from '../Cards/PlayingCard';
import { ChoynakPiyola } from './ChoynakPiyola';
import { TableTheme, TABLE_THEMES, TableThemeId, CardBackId } from '../../types/theme';

interface TableCenterProps {
  gameType: GameType;
  deckCount: number;
  trumpCard?: Card;
  trumpSuit: Suit;
  activeSuit?: Suit;
  tableCards: PlayedTrickCard[];
  themeId?: TableThemeId;
  cardBackId?: CardBackId;
  pendingPenaltyCount?: number;
  isLastTrumpRevealed?: boolean;
  revealedTrumpCard?: Card;
  onSelectTrickCard?: (cardId: string) => void;
  eggMultiplier?: number;
  dealerName?: string;
}

export const TableCenter: React.FC<TableCenterProps> = ({
  gameType,
  deckCount,
  trumpCard,
  trumpSuit,
  activeSuit,
  tableCards,
  themeId = 'classic_wood',
  cardBackId = 'paxtagul_gold',
  pendingPenaltyCount = 0,
  isLastTrumpRevealed = false,
  revealedTrumpCard,
  onSelectTrickCard,
  eggMultiplier = 1,
  dealerName,
}) => {
  const theme: TableTheme = TABLE_THEMES[themeId] || TABLE_THEMES.classic_wood;

  // Foydalanuvchi talabiga ko'ra: stolda faqat so'nggi kartalar (maksimal 3 qator / 6 ta karta) ko'rinsin
  const visibleTableCards = tableCards.slice(-6);

  return (
    <div className="flex flex-col items-center gap-1 w-full max-w-sm">
      {/* 108 da faol Mast ko'rsatkichi (Stoldan tashqarida, aniq va katta bo'lib ko'rinadi) */}
      {gameType === 'ONE_HUNDRED_EIGHT' && activeSuit && (
        <div className="flex items-center gap-1.5 bg-stone-900/95 border-2 border-amber-400 px-2.5 py-0.5 rounded-full text-[11px] font-black text-amber-300 shadow-xl animate-pulse">
          <span className="text-stone-300">Buyurtma Mast:</span>
          <span className="text-sm font-black text-white">{SUIT_SYMBOLS[activeSuit]}</span>
          <span>{SUIT_NAMES_UZ[activeSuit]}</span>
        </div>
      )}

      {/* Bura: oldingi qo'l tuxum bo'lgan - bu qo'l jarimalari ko'paytiriladi */}
      {gameType === 'BURA' && eggMultiplier > 1 && (
        <div className="flex items-center gap-1.5 bg-amber-100/95 border-2 border-amber-500 px-2.5 py-0.5 rounded-full text-[11px] font-black text-stone-900 shadow-xl">
          <span>🥚 Tuxum!</span>
          <span>Bu qo'l jarimalari x{eggMultiplier}</span>
        </div>
      )}

      {/* 108: qo'lni kim tarqatgani */}
      {gameType === 'ONE_HUNDRED_EIGHT' && dealerName && (
        <div className="text-[10px] font-semibold text-stone-300">🃏 Tarqatdi: <b className="text-amber-200">{dealerName}</b></div>
      )}

      {/* Bura da Kozir Ko'rsatkichi va So'nggi Krug Yangi Kozeri */}
      {gameType === 'BURA' && isLastTrumpRevealed && (
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 border-2 border-yellow-300 px-2.5 py-0.5 rounded-full text-[11px] font-black text-white shadow-2xl animate-bounce">
          <span>🔥 So'nggi Krug Yangi Kozir:</span>
          <span className="text-sm font-black">{SUIT_SYMBOLS[trumpSuit]}</span>
          <span>{SUIT_NAMES_UZ[trumpSuit]}</span>
        </div>
      )}
      {gameType === 'BURA' && !isLastTrumpRevealed && (
        <div className="flex items-center gap-1.5 bg-stone-900/90 border border-amber-600/60 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-200 shadow">
          <span className="text-stone-400">Kozir:</span>
          <span className="text-xs font-black">{SUIT_SYMBOLS[trumpSuit]}</span>
          <span>{SUIT_NAMES_UZ[trumpSuit]}</span>
          <span className="text-[9px] text-stone-400">(oxirgi yopiq)</span>
        </div>
      )}

      {/* Asosiy Xontaxta Stol Maydoni */}
      <div
        className="relative w-full h-28 sm:h-36 md:h-48 flex items-center justify-center p-2 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden transition-all duration-300"
        style={{
          background: theme.tableBackground,
          borderColor: theme.tableBorder,
          borderWidth: '3px',
          boxShadow: `0 0 25px ${theme.accentGlow}, inset 0 0 35px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Realistik Paxtagul Choynak va Piyola */}
        <div className="absolute top-1.5 right-1.5 z-10 scale-75 sm:scale-90 opacity-90 drop-shadow-2xl">
          <ChoynakPiyola />
        </div>

        {/* Chap tomonda: Koloda va Kozir */}
        <div className="absolute left-2.5 sm:left-4 flex items-center z-10">
          {/* Durak va Burada ochiq kozir koloda tagida aniq ko'rinib turadi */}
          {trumpCard && deckCount > 0 && gameType !== 'ONE_HUNDRED_EIGHT' && (
            <div className="relative -rotate-90 translate-x-3 translate-y-2 z-0">
              <PlayingCard card={trumpCard} size="sm" />
            </div>
          )}
          {deckCount > 0 ? (
            <div className="relative z-10 flex flex-col items-center">
              <PlayingCard isFaceDown cardBackId={cardBackId} size="sm" className="shadow-2xl" />
              <span
                className="text-[10px] font-black mt-1 px-2 py-0.5 rounded-full border shadow"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  color: theme.textColor,
                  borderColor: theme.tableBorder,
                }}
              >
                {deckCount} ta
              </span>
            </div>
          ) : (
            <div className="w-10 h-14 border border-dashed border-white/20 rounded flex items-center justify-center text-[10px] text-stone-400">
              Bo'sh
            </div>
          )}
        </div>

        {/* 108 da 7 yoki 6 lik to'plangan jarima kartalari ogohlantirishi */}
        {gameType === 'ONE_HUNDRED_EIGHT' && pendingPenaltyCount > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-rose-950/90 border border-rose-500 px-3 py-1 rounded-full text-[11px] font-black text-rose-200 shadow-xl animate-bounce">
            <span>⚠️ Jarima Zanjiri:</span>
            <span className="text-amber-300">{pendingPenaltyCount} ta karta!</span>
          </div>
        )}

        {/* Stol markazidagi o'ynalgan kartalar (Faqat so'nggi 3 qator / 6 ta karta ko'rinadi) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-center justify-center z-20 max-w-[180px] sm:max-w-[210px]">
          {visibleTableCards.length === 0 ? (
            <div
              className="col-span-3 text-xs sm:text-sm font-serif italic text-center opacity-40 select-none py-8"
              style={{ color: theme.textColor }}
            >
              Xontaxta bo'sh<br />Navbatdagi yurishni kuting
            </div>
          ) : (
            visibleTableCards.map((trick, idx) => (
              <div
                key={idx}
                className="relative cursor-pointer transition-all duration-500 flex justify-center items-center"
                onClick={() => onSelectTrickCard && onSelectTrickCard(trick.card.id)}
              >
                {/* Asosiy yurilgan karta (yoki urolmay yopiq tashlangan karta) */}
                <PlayingCard
                  card={trick.card}
                  size="sm"
                  isFaceDown={trick.isFaceDown}
                  cardBackId={cardBackId}
                  className="transition-all duration-500"
                />

                {/* Urilgan karta yurilgan kartaning ustiga bosiladi, pastdagi karta biroz ko'rinib turadi */}
                {trick.beatenBy && (
                  <div className="absolute top-1 left-1.5 rotate-3 z-30 shadow-2xl transition-all duration-500">
                    <PlayingCard card={trick.beatenBy} size="sm" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
