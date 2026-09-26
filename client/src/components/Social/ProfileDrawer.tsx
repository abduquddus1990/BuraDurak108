import React, { useState } from 'react';
import { UserProfile } from '../../../../shared/src/types/social';
import { ACHIEVEMENTS, AchievementId } from '../../../../shared/src/types/progress';
import { GameType } from '../../../../shared/src/types/game';
import { X, Trophy, Award, Crown, Share2, CalendarCheck, History, Flame } from 'lucide-react';
import { shareText } from '../../services/share';

interface ProfileDrawerProps {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenShop?: () => void;
}

const GAME_LABELS: Record<GameType, string> = { BURA: '☕ Bura', DURAK: '🛡️ Durak', ONE_HUNDRED_EIGHT: '🎯 108' };

const formatDate = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ profile, isOpen, onClose, onOpenShop }) => {
  const [tab, setTab] = useState<'stats' | 'achievements' | 'daily' | 'history'>('stats');
  if (!isOpen) return null;

  const achievements = profile.achievements || {};
  const unlockedCount = Object.keys(achievements).length;
  const isVip = !!profile.vipUntil && profile.vipUntil > Date.now();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm h-full bg-stone-900 border-l-2 border-amber-600 p-4 flex flex-col gap-3 overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-amber-200 font-serif">Mening Profilim</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profil sarlavhasi */}
        <div className="flex items-center gap-3 bg-stone-800/70 border border-stone-700 rounded-2xl p-3">
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center text-lg font-black text-white overflow-hidden shrink-0">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : profile.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-amber-100 truncate flex items-center gap-1">
              {profile.displayName} {isVip && <Crown className="w-4 h-4 text-yellow-400" />}
            </span>
            <span className="text-xs text-stone-400">@{profile.username}</span>
            {profile.clan && <span className="text-[11px] text-sky-300">🏘️ [{profile.clan.tag}] {profile.clan.name}</span>}
            {isVip && <span className="text-[10px] text-yellow-300">VIP: {new Date(profile.vipUntil!).toLocaleDateString()} gacha</span>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-stone-800/70 rounded-xl p-2 border border-stone-700">
            <Trophy className="w-4 h-4 text-amber-400 mx-auto" />
            <div className="text-sm font-black text-amber-200">{profile.ratingElo}</div>
            <div className="text-[9px] text-stone-400">Umumiy ELO</div>
          </div>
          <div className="bg-stone-800/70 rounded-xl p-2 border border-stone-700">
            <Award className="w-4 h-4 text-emerald-400 mx-auto" />
            <div className="text-sm font-black text-emerald-300">{profile.gamesWon}/{profile.gamesPlayed}</div>
            <div className="text-[9px] text-stone-400">G'alaba/O'yin</div>
          </div>
          <div className="bg-stone-800/70 rounded-xl p-2 border border-stone-700">
            <Flame className="w-4 h-4 text-rose-400 mx-auto" />
            <div className="text-sm font-black text-rose-300">{profile.bestStreak || 0}</div>
            <div className="text-[9px] text-stone-400">Eng uzun seriya</div>
          </div>
        </div>

        {/* Bo'limlar */}
        <div className="grid grid-cols-4 gap-1 bg-stone-800/90 p-1 rounded-2xl border border-stone-700 text-[11px] font-bold">
          {([
            ['stats', 'Reyting'],
            ['achievements', `Nishonlar ${unlockedCount}`],
            ['daily', 'Kunlik'],
            ['history', 'Tarix'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`py-1.5 rounded-xl transition ${tab === id ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          <div className="flex flex-col gap-2">
            {(Object.keys(GAME_LABELS) as GameType[]).map((g) => {
              const stats = profile.statsByGame?.[g];
              return (
                <div key={g} className="flex items-center justify-between bg-stone-800/60 border border-stone-700 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-stone-200">{GAME_LABELS[g]}</span>
                  <span className="text-xs text-stone-300">
                    ELO <b className="text-amber-300">{profile.ratings?.[g] ?? 1000}</b> · {stats ? `${stats.won}/${stats.played}` : "hali o'ynalmagan"}
                  </span>
                </div>
              );
            })}
            <p className="text-[10px] text-stone-500">ELO faqat odamlar bilan o'yinda o'zgaradi; botlar bilan o'yin statistikaga yoziladi.</p>
          </div>
        )}

        {tab === 'achievements' && (
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ACHIEVEMENTS) as AchievementId[]).map((id) => {
              const a = ACHIEVEMENTS[id];
              const at = achievements[id];
              return (
                <div key={id} className={`rounded-xl p-2 border text-left ${at ? 'bg-amber-950/60 border-amber-600/70' : 'bg-stone-800/40 border-stone-800 opacity-60'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-lg ${at ? '' : 'grayscale'}`}>{a.icon}</span>
                    <span className="text-[11px] font-bold text-amber-100 leading-tight">{a.title}</span>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">{a.description}</p>
                  {at && (
                    <button
                      onClick={() => shareText(`${a.icon} Choyxona'da "${a.title}" nishonini oldim!`)}
                      className="mt-1 text-[10px] text-sky-300 flex items-center gap-1 hover:underline"
                    >
                      <Share2 className="w-3 h-3" /> Ulashish
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'daily' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-amber-200 font-bold">
              <CalendarCheck className="w-4 h-4" /> Bugungi vazifalar
              <span className="ml-auto text-rose-300">🔥 {profile.daily?.streak || 0} kun ketma-ket</span>
            </div>
            {(profile.daily?.tasks || []).map((task) => {
              const done = task.progress >= task.target;
              return (
                <div key={task.id} className={`rounded-xl px-3 py-2 border ${done ? 'bg-emerald-950/60 border-emerald-600/60' : 'bg-stone-800/60 border-stone-700'}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={done ? 'text-emerald-200 font-bold' : 'text-stone-200'}>{done ? '✅ ' : ''}{task.title}</span>
                    <span className="text-stone-400">{task.progress}/{task.target}</span>
                  </div>
                  <div className="h-1.5 mt-1.5 rounded-full bg-stone-700 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(task.progress / task.target) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {profile.daily?.completed && <p className="text-xs text-emerald-300 text-center">🎉 Bugungi hamma vazifalar bajarildi!</p>}
            <p className="text-[10px] text-stone-500">7 kun ketma-ket bajarsangiz - "Haftalik sadoqat" nishoni.</p>
          </div>
        )}

        {tab === 'history' && (
          <div className="flex flex-col gap-1.5">
            {(profile.history || []).length === 0 && <p className="text-xs text-stone-400 text-center py-4">Hali tugagan partiyalar yo'q.</p>}
            {(profile.history || []).map((h, i) => (
              <div key={i} className="flex items-center justify-between bg-stone-800/60 border border-stone-700 rounded-xl px-3 py-1.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-stone-200">
                    {h.result === 'WIN' ? '🏆' : h.result === 'LOSS' ? '💔' : '🤝'} {GAME_LABELS[h.gameType]}
                  </span>
                  <span className="text-[10px] text-stone-400 truncate">
                    {formatDate(h.at)} · {h.opponents.join(', ')}
                  </span>
                </div>
                <span className={`text-xs font-black ${h.eloDelta > 0 ? 'text-emerald-300' : h.eloDelta < 0 ? 'text-rose-300' : 'text-stone-500'}`}>
                  {h.eloDelta > 0 ? `+${h.eloDelta}` : h.eloDelta !== 0 ? h.eloDelta : h.vsHumans ? '0' : 'bot'}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-stone-500 flex items-center gap-1"><History className="w-3 h-3" /> Oxirgi 20 ta partiya</p>
          </div>
        )}

        {onOpenShop && (
          <button onClick={onOpenShop} className="mt-auto w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs">
            👑 VIP va premium dizaynlar (Stars)
          </button>
        )}
      </div>
    </div>
  );
};
