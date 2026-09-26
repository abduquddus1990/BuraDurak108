import React, { useState } from 'react';
import { Trophy, Medal, Crown, X } from 'lucide-react';
import { GameType } from '../../../../shared/src/types/game';

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  ratingElo: number;
  gamesPlayed: number;
  gamesWon: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  // null - hali yuklanmoqda (yoki server bilan aloqa yo'q)
  players: LeaderboardEntry[] | null;
  currentUserId?: string;
  // null - umumiy reyting
  gameType?: GameType | null;
  onChangeGameType?: (gameType: GameType | null) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, players, currentUserId, gameType = null, onChangeGameType }) => {
  const [activeTab, setActiveTab] = useState<'1-10' | '11-20' | '21-30'>('1-10');

  if (!isOpen) return null;

  // Server qaytargan haqiqiy reyting (kamida bitta o'yin o'ynaganlar, ELO bo'yicha)
  const allPlayers = (players || []).map((p, index) => ({
    rank: index + 1,
    id: p.id,
    name: p.displayName,
    elo: p.ratingElo,
    gamesPlayed: p.gamesPlayed,
    wins: p.gamesWon,
  }));

  const getFilteredPlayers = () => {
    if (activeTab === '1-10') return allPlayers.slice(0, 10);
    if (activeTab === '11-20') return allPlayers.slice(10, 20);
    return allPlayers.slice(20, 30);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 relative max-h-[85vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-choyxona-gold" />
          <h2 className="text-base font-black text-amber-200 font-serif">
            Eng Kuchli 30 Talik Reytingi
          </h2>
        </div>

        {/* O'yin turi bo'yicha reyting */}
        {onChangeGameType && (
          <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
            {([
              [null, 'Umumiy'],
              ['BURA', '☕ Bura'],
              ['DURAK', '🛡️ Durak'],
              ['ONE_HUNDRED_EIGHT', '🎯 108'],
            ] as [GameType | null, string][]).map(([g, label]) => (
              <button
                key={label}
                onClick={() => onChangeGameType(g)}
                className={`py-1.5 rounded-xl border transition ${gameType === g ? 'border-sky-400 bg-sky-900/60 text-sky-100' : 'border-stone-700 text-stone-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 3 ta 10 talikni ko'rsatuvchi tablar */}
        <div className="grid grid-cols-3 gap-1 bg-stone-800/90 p-1 rounded-2xl border border-stone-700">
          <button
            onClick={() => setActiveTab('1-10')}
            className={`py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === '1-10' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            Top 1 - 10
          </button>
          <button
            onClick={() => setActiveTab('11-20')}
            className={`py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === '11-20' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            Top 11 - 20
          </button>
          <button
            onClick={() => setActiveTab('21-30')}
            className={`py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === '21-30' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            Top 21 - 30
          </button>
        </div>

        {/* O'yinchilar ro'yxati */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {players === null && (
            <div className="py-8 text-center text-xs text-stone-400">Reyting yuklanmoqda...</div>
          )}
          {players !== null && getFilteredPlayers().length === 0 && (
            <div className="py-8 text-center text-xs text-stone-400">
              Bu oraliqda hali o'yinchilar yo'q. Birinchi bo'ling!
            </div>
          )}
          {getFilteredPlayers().map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                player.id === currentUserId ? 'ring-2 ring-emerald-500/70 ' : ''
              }${
                player.rank === 1
                  ? 'bg-amber-950/70 border-yellow-500/80 shadow-md'
                  : player.rank === 2
                  ? 'bg-stone-800/80 border-slate-400/60'
                  : player.rank === 3
                  ? 'bg-stone-800/80 border-amber-700/60'
                  : 'bg-stone-800/40 border-stone-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                    player.rank === 1
                      ? 'bg-yellow-500 text-stone-950'
                      : player.rank === 2
                      ? 'bg-slate-300 text-stone-950'
                      : player.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-stone-700 text-stone-300'
                  }`}
                >
                  {player.rank}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-amber-100">{player.name}</span>
                  <span className="text-[10px] text-stone-400">O'yinlar: {player.gamesPlayed}</span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-choyxona-gold">ELO {player.elo}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">{player.wins} g'alaba</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
