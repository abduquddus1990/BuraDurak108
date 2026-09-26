import React from 'react';
import { Suit, SUIT_NAMES_UZ, SUIT_SYMBOLS, SUIT_COLORS } from '../../../../shared/src/types/card';

interface SuitSelectorModalProps {
  isOpen: boolean;
  onSelectSuit: (suit: Suit) => void;
}

export const SuitSelectorModal: React.FC<SuitSelectorModalProps> = ({
  isOpen,
  onSelectSuit,
}) => {
  if (!isOpen) return null;

  const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'SPADES', 'CLUBS'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-center">
        <h2 className="text-lg font-black text-amber-300 font-serif">
          Yangi Mast (Gul) Tanlang
        </h2>
        <p className="text-xs text-amber-200/60">
          Valet yoki Dama tashladingiz. Keyingi yurish qaysi mastda bo'lishini xohlaysiz?
        </p>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {suits.map((suit) => {
            const isRed = suit === 'HEARTS' || suit === 'DIAMONDS';
            return (
              <button
                key={suit}
                onClick={() => onSelectSuit(suit)}
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-amber-500 shadow transition active:scale-95"
              >
                <span className="text-2xl" style={{ color: isRed ? '#dc2626' : '#f8fafc' }}>
                  {SUIT_SYMBOLS[suit]}
                </span>
                <span className="text-xs font-bold text-stone-200">
                  {SUIT_NAMES_UZ[suit]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
