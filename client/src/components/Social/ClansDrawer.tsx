import React, { useEffect, useState } from 'react';
import { ClanDetail, ClanItem } from '../../../../shared/src/types/social';
import { nextWeekStartMs } from '../../../../shared/src/types/progress';
import { Shield, Trophy, Users, X, Crown, LogOut } from 'lucide-react';

interface ClansDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clans: ClanItem[] | null; // null - yuklanmoqda
  myClan: ClanDetail | null;
  isOnline: boolean;
  onRefresh: () => void;
  onCreate: (name: string, tag: string) => void;
  onJoin: (clanId: string) => void;
  onLeave: () => void;
}

const formatCountdown = (ms: number) => {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? `${days} kun ${hours} soat` : `${hours} soat`;
};

export const ClansDrawer: React.FC<ClansDrawerProps> = ({ isOpen, onClose, clans, myClan, isOnline, onRefresh, onCreate, onJoin, onLeave }) => {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) onRefresh();
  }, [isOpen]);

  if (!isOpen) return null;
  const leagueEndsIn = nextWeekStartMs(Date.now()) - Date.now();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm h-full bg-stone-900 border-l-2 border-sky-600 p-4 flex flex-col gap-3 overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-sky-200 font-serif flex items-center gap-2">
            <Shield className="w-5 h-5" /> Mahallalar Ligasi
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[11px] text-stone-300 bg-sky-950/50 border border-sky-800/60 rounded-xl p-2.5 leading-snug">
          Har hafta mahallalar ochko to'playdi: a'zo odamga qarshi yutsa <b>+3</b>, botga qarshi <b>+1</b>.
          Hafta tugashiga: <b className="text-sky-200">{formatCountdown(leagueEndsIn)}</b> (dushanba kuni yangi hafta).
        </div>

        {!isOnline && <p className="text-xs text-rose-300 text-center">Mahallalar uchun serverga ulanish kerak.</p>}

        {/* Mening mahallam */}
        {myClan ? (
          <div className="bg-stone-800/70 border border-sky-700/60 rounded-2xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-100">
                [{myClan.tag}] {myClan.name}
              </span>
              <span className="text-xs text-amber-300 font-black">{myClan.weeklyPoints || 0} ochko</span>
            </div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar">
              {myClan.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs text-stone-300">
                  <span className="flex items-center gap-1">
                    {m.isLeader && <Crown className="w-3 h-3 text-yellow-400" />} {m.displayName}
                  </span>
                  <span className="text-amber-300/80">{m.ratingElo}</span>
                </div>
              ))}
            </div>
            <button onClick={onLeave} className="self-end text-[11px] text-rose-300 flex items-center gap-1 hover:underline">
              <LogOut className="w-3 h-3" /> Mahalladan chiqish
            </button>
          </div>
        ) : (
          isOnline && (
            <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-3 flex flex-col gap-2">
              {!isCreating ? (
                <button onClick={() => setIsCreating(true)} className="w-full py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold">
                  + O'z mahallangizni oching
                </button>
              ) : (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onCreate(name, tag);
                  }}
                >
                  <input
                    value={name}
                    maxLength={30}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nomi (masalan: Chig'atoy Mahallasi)"
                    className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <input
                    value={tag}
                    maxLength={5}
                    onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="Teg: 2-5 harf (masalan: CHIG)"
                    className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold">
                      Bekor
                    </button>
                    <button type="submit" className="flex-1 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold">
                      Ochish
                    </button>
                  </div>
                </form>
              )}
            </div>
          )
        )}

        {/* Haftalik reyting */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300/90 mt-1">
          <Trophy className="w-4 h-4" /> Haftalik jadval
        </div>
        {clans === null && <p className="text-xs text-stone-400 text-center py-4">Yuklanmoqda...</p>}
        {clans !== null && clans.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-4">Hali mahallalar yo'q - birinchisini siz oching!</p>
        )}
        <div className="flex flex-col gap-1.5">
          {(clans || []).map((clan, index) => (
            <div key={clan.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${myClan?.id === clan.id ? 'bg-sky-950/60 border-sky-600' : 'bg-stone-800/50 border-stone-800'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${index === 0 ? 'bg-yellow-500 text-stone-950' : index === 1 ? 'bg-slate-300 text-stone-950' : index === 2 ? 'bg-amber-700 text-white' : 'bg-stone-700 text-stone-300'}`}>
                {index + 1}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-stone-100 truncate">
                  [{clan.tag}] {clan.name}
                </span>
                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {clan.membersCount} a'zo
                </span>
              </div>
              <span className="text-xs font-black text-amber-300">{clan.weeklyPoints || 0}</span>
              {!myClan && isOnline && (
                <button onClick={() => onJoin(clan.id)} className="text-[10px] font-bold text-sky-300 border border-sky-700 rounded-lg px-2 py-1 hover:bg-sky-900">
                  Qo'shilish
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
