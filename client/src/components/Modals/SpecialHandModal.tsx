import React from 'react';
import { SpecialCombination } from '../../../../shared/src/types/game';
import { PlayingCard } from '../Cards/PlayingCard';
import { X } from 'lucide-react';

interface SpecialHandModalProps {
  combinations: SpecialCombination[];
  isOpen: boolean;
  onClose: () => void;
  onDeclare: (type: string) => void;
}

export const SpecialHandModal: React.FC<SpecialHandModalProps> = ({
  combinations,
  isOpen,
  onClose,
  onDeclare,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-900 border-2 border-choyxona-gold rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative">
        {/* Yopish tugmasi */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-black text-amber-300 font-serif">
            Maxsus Qo'llar va Kombinatsiyalar
          </h2>
          <p className="text-xs text-amber-200/60 mt-0.5">
            Qo'lingizdagi maxsus kombinatsiyani tanlang va e'lon qiling:
          </p>
        </div>

        {combinations.length === 0 ? (
          <div className="py-6 text-center text-stone-500 text-xs">
            Hozircha qo'lingizda maxsus kombinatsiya mavjud emas.
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
            {combinations.map((comb, index) => (
              <div
                key={index}
                className="bg-stone-800/80 border border-amber-800/50 hover:border-choyxona-gold p-3 rounded-2xl flex flex-col gap-2 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-sm">
                    {comb.type === 'MOSKVA' && <span className="text-yellow-400">👑 MOSKVA (4 ta Tuz)</span>}
                    {comb.type === 'BURA' && <span className="text-amber-400">⚡ BURA (Kozirlar)</span>}
                    {comb.type === 'MOLODKA' && <span className="text-blue-400">🎯 MOLODKA (Bir xil mast)</span>}
                    {comb.type === 'FORTY_ONE' && <span className="text-emerald-400">💰 41+ ({comb.points} Ochko)</span>}
                  </div>
                  <button
                    onClick={() => {
                      onDeclare(comb.type);
                      onClose();
                    }}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs shadow hover:brightness-110"
                  >
                    Ochish!
                  </button>
                </div>

                {/* Kartalar ko'rinishi */}
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {comb.cards.map((c, i) => (
                    <PlayingCard key={i} card={c} size="sm" isPlayable={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
