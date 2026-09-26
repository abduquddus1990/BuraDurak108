import React from 'react';
import { UserProfile } from '../../../../shared/src/types/social';
import { Settings, User, CreditCard, Sparkles, MessageCircle, ExternalLink, Crown, X, Star } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';

interface SettingsModalProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  if (!isOpen) return null;

  const handleOpenBot = (botUsername: string) => {
    triggerHaptic('light');
    window.open(`https://t.me/${botUsername}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative max-h-[85vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-choyxona-gold" />
          <h2 className="text-base font-black text-amber-200 font-serif">
            O'yin Sozlamalari va Xizmatlar
          </h2>
        </div>

        {/* 1. Akkaunt Ma'lumotlari */}
        <div className="bg-stone-800/80 border border-stone-700 p-3.5 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-stone-200">Akkaunt Ma'lumotlari</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="text-[11px] text-amber-400 font-bold hover:underline"
            >
              Ismni O'zgartirish
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-700/60 text-xs">
            <div>
              <span className="text-[10px] text-stone-400 block">Username:</span>
              <span className="font-bold text-amber-200">@{profile.username}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block">Reyting / G'alabalar:</span>
              <span className="font-black text-emerald-300">ELO {profile.ratingElo} · {profile.gamesWon}/{profile.gamesPlayed}</span>
            </div>
          </div>
        </div>

        {/* 2. Pro Versiya, Donat va Maxsus Username Sotib Olish (10 000 so'm / 50 Stars) */}
        <div className="bg-gradient-to-br from-amber-950/80 via-stone-900 to-stone-900 border-2 border-yellow-500/80 p-4 rounded-2xl flex flex-col gap-2.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-black text-sm text-yellow-300">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span>PRO Versiya & Donat</span>
            </div>
            <span className="bg-yellow-500 text-stone-950 font-black text-[10px] px-2 py-0.5 rounded-full">
              10 000 SO'M (~50 Stars)
            </span>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed">
            PRO statusi orqali reklamalarni o'chiring, oltin xontaxta skinini oling va o'yin ichida 
            <b> Noyob Username (Taxallus)</b> oching!
          </p>

          <div className="flex gap-2 mt-1">
            <button
              onClick={() => handleOpenBot('StarsUchun_bot')}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs shadow hover:brightness-110 flex items-center justify-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>@StarsUchun_bot dan Olish</span>
            </button>
          </div>

          <span className="text-[10px] text-stone-400 italic text-center">
            Kelajakda: GetGems orqali NFT username ko'rinishida sotish imkoniyati qo'shiladi.
          </span>
        </div>

        {/* 3. Murojaat va Qo'llab-quvvatlash */}
        <div className="bg-stone-800/80 border border-stone-700 p-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-stone-200">Murojaat va Takliflar</span>
              <span className="text-[10px] text-stone-400">Dasturchi va ma'muriyat bilan aloqa</span>
            </div>
          </div>
          <button
            onClick={() => handleOpenBot('ai_loyihachi')}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow flex items-center gap-1"
          >
            <span>@ai_loyihachi</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
