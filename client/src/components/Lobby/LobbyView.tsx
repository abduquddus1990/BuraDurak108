import React, { useState, useEffect } from 'react';
import { GameType, BuraRules, DurakRules, OneHundredEightRules, GameRules } from '../../../../shared/src/types/game';
import { UserProfile } from '../../../../shared/src/types/social';
import { Bot, Users, Trophy, Shield, Settings, Palette, LogIn } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';

interface LobbyViewProps {
  profile: UserProfile;
  isNightMode: boolean;
  onStartGame: (gameType: GameType, rules: GameRules, totalPlayers: number, isBot: boolean) => void;
  onOpenFriendsTable: (gameType: GameType, rules: GameRules, totalPlayers: number) => void;
  onOpenProfile: () => void;
  onOpenFriends: () => void;
  onOpenClans: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onOpenTheme: () => void;
  onOpenAuth: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  profile,
  isNightMode,
  onStartGame,
  onOpenFriendsTable,
  onOpenProfile,
  onOpenFriends,
  onOpenClans,
  onOpenSettings,
  onOpenLeaderboard,
  onOpenTheme,
  onOpenAuth,
}) => {
  const [selectedGame, setSelectedGame] = useState<GameType>('BURA');
  const [selectedBuraRule, setSelectedBuraRule] = useState<BuraRules>('ODDIY');
  const [selectedDurakRule, setSelectedDurakRule] = useState<DurakRules>('PEREKIDLI');
  const [selected108Rule, setSelected108Rule] = useState<OneHundredEightRules>('KOROL_OLMA');
  const [playerCount, setPlayerCount] = useState<number>(2);

  // 4 ta kartali bura uzog'i 4 kishigacha, 6 talik esa 3 kishigacha
  const getAllowedPlayerCounts = (): number[] => {
    if (selectedGame === 'BURA') {
      if (selectedBuraRule === 'SIX_CARDS') {
        return [2, 3];
      }
      return [2, 3, 4];
    }
    if (selectedGame === 'ONE_HUNDRED_EIGHT') {
      return [2, 3, 4];
    }
    return [2, 3, 4, 6];
  };

  const allowedPlayerCounts = getAllowedPlayerCounts();

  useEffect(() => {
    if (!allowedPlayerCounts.includes(playerCount)) {
      setPlayerCount(allowedPlayerCounts[0]);
    }
  }, [selectedGame, selectedBuraRule]);

  const handleGameSelect = (game: GameType) => {
    triggerHaptic('light');
    setSelectedGame(game);
  };

  const getSelectedRules = (): GameRules => {
    if (selectedGame === 'BURA') return selectedBuraRule;
    if (selectedGame === 'DURAK') return selectedDurakRule;
    return selected108Rule;
  };

  const handleStart = (isBot: boolean) => {
    triggerHaptic('medium');
    onStartGame(selectedGame, getSelectedRules(), playerCount, isBot);
  };

  return (
    <div className="w-full h-full max-w-lg mx-auto flex flex-col justify-between p-3.5 overflow-y-auto no-scrollbar bg-black/35 backdrop-blur-sm">
      {/* 1. Yuqori Bar */}
      <div className="flex items-center justify-between bg-stone-900/90 border border-stone-800 px-3.5 py-2.5 rounded-3xl backdrop-blur-md shadow-xl">
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2 cursor-pointer active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-500 p-0.5 shadow">
            <div className="w-full h-full rounded-full bg-stone-900 flex items-center justify-center font-black text-xs text-amber-200">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-amber-100 truncate max-w-[120px]">{profile.displayName}</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-stone-400 font-mono font-medium">@{profile.username}</span>
              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                <Trophy className="w-2.5 h-2.5" /> {profile.ratingElo}
              </span>
            </div>
          </div>
        </div>

        {/* Asboblar: Reyting, Sozlamalar, Stol, Kirish */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenLeaderboard}
            className="p-2 rounded-2xl bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/60 transition"
            title="Top 30 Reyting"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={onOpenTheme}
            className="p-2 rounded-2xl bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/60 transition"
            title="Stol Dizayni"
          >
            <Palette className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-2xl bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/60 transition"
            title="Sozlamalar va Donat"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAuth}
            className="p-2 rounded-2xl bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700/60 transition"
            title="Kirish"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* 2. O'yinlar Tanlovi (Bura, Durak, 108 O'yini) */}
      <div className="flex flex-col gap-2 my-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs uppercase tracking-wider font-bold text-amber-300/80 text-left">
            O'yinni Tanlang:
          </h2>
          <div className="flex gap-2">
            <button onClick={onOpenFriends} className="text-[11px] text-stone-400 hover:text-amber-300 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Do'stlar
            </button>
            <button onClick={onOpenClans} className="text-[11px] text-stone-400 hover:text-amber-300 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Mahalla
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* BURA (4 ta variant ichida joylashgan) */}
          <div
            onClick={() => handleGameSelect('BURA')}
            className={`
              p-3 rounded-2xl flex flex-col items-center gap-1 cursor-pointer transition border-2 text-center
              ${selectedGame === 'BURA'
                ? 'border-amber-400 bg-amber-950/70 shadow-[0_0_15px_rgba(234,179,8,0.4)] ring-1 ring-amber-400'
                : 'border-stone-800 bg-stone-900/60 opacity-80 hover:opacity-100'}
            `}
          >
            <span className="text-2xl">☕</span>
            <span className="text-xs font-black text-amber-100">Bura</span>
            <span className="text-[9px] text-stone-400">4 xil qoida</span>
          </div>

          {/* DURAK */}
          <div
            onClick={() => handleGameSelect('DURAK')}
            className={`
              p-3 rounded-2xl flex flex-col items-center gap-1 cursor-pointer transition border-2 text-center
              ${selectedGame === 'DURAK'
                ? 'border-amber-400 bg-amber-950/70 shadow-[0_0_15px_rgba(234,179,8,0.4)] ring-1 ring-amber-400'
                : 'border-stone-800 bg-stone-900/60 opacity-80 hover:opacity-100'}
            `}
          >
            <span className="text-2xl">🛡️</span>
            <span className="text-xs font-black text-amber-100">Durak</span>
            <span className="text-[9px] text-stone-400">Olish va Otboy</span>
          </div>

          {/* 108 O'YINI */}
          <div
            onClick={() => handleGameSelect('ONE_HUNDRED_EIGHT')}
            className={`
              p-3 rounded-2xl flex flex-col items-center gap-1 cursor-pointer transition border-2 text-center
              ${selectedGame === 'ONE_HUNDRED_EIGHT'
                ? 'border-amber-400 bg-amber-950/70 shadow-[0_0_15px_rgba(234,179,8,0.4)] ring-1 ring-amber-400'
                : 'border-stone-800 bg-stone-900/60 opacity-80 hover:opacity-100'}
            `}
          >
            <span className="text-2xl">🎯</span>
            <span className="text-xs font-black text-amber-100">108 O'yini</span>
            <span className="text-[9px] text-stone-400">7/6 Zanjiri</span>
          </div>
        </div>
      </div>

      {/* 3. Tanlangan O'yin Qoidalari */}
      <div className="bg-stone-900/70 border border-stone-800 p-3 rounded-3xl flex flex-col gap-2 mb-2 text-left">
        <h3 className="text-xs font-bold text-amber-200">
          Qoidalar va Variatsiyalar:
        </h3>

        {/* BURA VARIANTLARI (6-talik ham shu yerda) */}
        {selectedGame === 'BURA' && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'ODDIY', name: 'Oddiy Bura', desc: '4 ta karta, 31 ochko (41 siz, molotkasiz)' },
              { id: 'MOLOTKALI', name: 'Molotkali Bura', desc: '4 ta karta, 4 ta bir xil mast (41 siz)' },
              { id: 'FORTY_ONE', name: '41 lik Bura', desc: '4 ta karta, 41+ ochko ochish' },
              { id: 'SIX_CARDS', name: '6 Talik Qaytarma', desc: '6 ta karta, doiraviy qaytarish, Moskva' },
            ].map((rule) => (
              <button
                key={rule.id}
                onClick={() => setSelectedBuraRule(rule.id as BuraRules)}
                className={`
                  p-2.5 rounded-xl text-left border transition text-xs flex flex-col justify-between
                  ${selectedBuraRule === rule.id
                    ? 'border-amber-400 bg-amber-950/60 text-amber-100 font-bold shadow'
                    : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:text-stone-200'}
                `}
              >
                <div className="font-bold text-xs">{rule.name}</div>
                <div className="text-[9px] text-stone-400 leading-tight mt-0.5">{rule.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* DURAK */}
        {selectedGame === 'DURAK' && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'PEREKIDLI', name: 'Perekidli (Perevodnoy)', desc: 'O\'tkaziladigan durak' },
              { id: 'PEREKIDSIZ', name: 'Perekidsiz (Podkidnoy)', desc: 'Klassik tashlanadigan' },
            ].map((rule) => (
              <button
                key={rule.id}
                onClick={() => setSelectedDurakRule(rule.id as DurakRules)}
                className={`
                  p-2.5 rounded-xl text-left border transition text-xs
                  ${selectedDurakRule === rule.id
                    ? 'border-amber-400 bg-amber-950/60 text-amber-100 font-bold'
                    : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:text-stone-200'}
                `}
              >
                <div>{rule.name}</div>
                <div className="text-[9px] text-amber-400/60">{rule.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* 108 */}
        {selectedGame === 'ONE_HUNDRED_EIGHT' && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'KOROL_OLMA', name: 'Korol Olma (♥)', desc: '♥ Qirol 5 ta beradi, Dama gul tanlaydi' },
              { id: 'KOROL_QARGA', name: 'Korol Qarg\'a (♠)', desc: '♠ Qirol 4 ta beradi, Valet gul tanlaydi' },
            ].map((rule) => (
              <button
                key={rule.id}
                onClick={() => setSelected108Rule(rule.id as OneHundredEightRules)}
                className={`
                  p-2.5 rounded-xl text-left border transition text-xs
                  ${selected108Rule === rule.id
                    ? 'border-amber-400 bg-amber-950/60 text-amber-100 font-bold'
                    : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:text-stone-200'}
                `}
              >
                <div>{rule.name}</div>
                <div className="text-[9px] text-amber-400/60 leading-tight mt-0.5">{rule.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Odam soni */}
      <div className="flex flex-col gap-1 mb-3 text-left">
        <span className="text-xs font-bold text-amber-300/80 px-1">O'yinchilar Soni:</span>
        <div className={`grid gap-2 ${allowedPlayerCounts.length === 2 ? 'grid-cols-2' : allowedPlayerCounts.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {allowedPlayerCounts.map((count) => (
            <button
              key={count}
              onClick={() => setPlayerCount(count)}
              className={`
                py-2 rounded-xl text-xs font-bold border transition
                ${playerCount === count
                  ? 'border-amber-400 bg-amber-950 text-amber-200'
                  : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:text-white'}
              `}
            >
              {count} kishi
            </button>
          ))}
        </div>
      </div>

      {/* 5. Start Tugmalari */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          onClick={() => handleStart(true)}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Bot className="w-5 h-5 text-stone-900" />
          <span>Botlar Bilan O'ynash (Tezkor)</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenFriendsTable(selectedGame, getSelectedRules(), playerCount);
          }}
          className="w-full py-2.5 rounded-2xl bg-stone-900 border border-amber-600/40 text-amber-300 font-bold text-xs shadow hover:bg-stone-800 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span>Do'stlar Bilan Onlayn Stol</span>
        </button>
      </div>
    </div>
  );
};
