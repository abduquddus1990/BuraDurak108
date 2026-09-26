import React from 'react';
import { UserProfile } from '../../../../shared/src/types/social';
import { Trophy, Award, Flame, Crown, X, User } from 'lucide-react';

interface ProfileDrawerProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ profile, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border-2 border-amber-600 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        {/* Profil Bosh qismi */}
        <div className="flex flex-col items-center text-center gap-2 pt-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-500 p-0.5 shadow-xl relative">
            <div className="w-full h-full rounded-full bg-stone-900 flex items-center justify-center text-2xl font-black text-amber-200">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
            {profile.vipStatus && (
              <Crown className="w-6 h-6 text-yellow-400 absolute -top-2 -right-1 drop-shadow" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-base text-amber-100">{profile.displayName}</h3>
            <p className="text-xs text-stone-400">@{profile.username}</p>
          </div>
        </div>

        {/* Statistika Kartochkalari */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-stone-800/80 border border-amber-900/40 p-3 rounded-2xl flex items-center gap-3">
            <Trophy className="w-6 h-6 text-choyxona-gold" />
            <div className="text-left">
              <span className="text-[10px] text-stone-400 block">ELO Reyting</span>
              <span className="text-sm font-black text-amber-200">{profile.ratingElo}</span>
            </div>
          </div>
          <div className="bg-stone-800/80 border border-amber-900/40 p-3 rounded-2xl flex items-center gap-3">
            <Award className="w-6 h-6 text-emerald-400" />
            <div className="text-left">
              <span className="text-[10px] text-stone-400 block">G'alabalar</span>
              <span className="text-sm font-black text-emerald-300">{profile.gamesWon} / {profile.gamesPlayed}</span>
            </div>
          </div>
        </div>

        {/* VIP va Donat haqida ma'lumot */}
        <div className="bg-gradient-to-r from-amber-950/60 to-stone-800/60 border border-amber-700/50 rounded-2xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>VIP Choyxona Statusi</span>
          </div>
          <p className="text-[11px] text-stone-300 mt-1">
            Reklamasiz o'yin, shaxsiy oltin xontaxta va maxsus taxallus (username) xarid qilish.
          </p>
          <button className="mt-2.5 w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs shadow hover:brightness-110">
            VIP To'plamni Ko'rish (Stars)
          </button>
        </div>
      </div>
    </div>
  );
};
