import React from 'react';
import { ClanItem } from '../../../../shared/src/types/social';
import { Shield, Trophy, Users, X } from 'lucide-react';

interface ClansDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClansDrawer: React.FC<ClansDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Namunaviy Mahallalar / Klanlar
  const sampleClans: ClanItem[] = [
    {
      id: 'clan_1',
      name: "Chig'atoy Choyxonasi",
      tag: 'CHIG',
      leaderId: 'u1',
      membersCount: 24,
      totalElo: 28400,
      description: "Toshkentning eng qadimiy burchagi ustalari!",
    },
    {
      id: 'clan_2',
      name: 'Samarqand Registon',
      tag: 'REG',
      leaderId: 'u2',
      membersCount: 19,
      totalElo: 22100,
      description: "108 va 6-kartalik Burkozel chempionlari.",
    },
    {
      id: 'clan_3',
      name: 'Vodiy Choyxo\'rlari',
      tag: 'VOD',
      leaderId: 'u3',
      membersCount: 31,
      totalElo: 34900,
      description: "Farg'ona, Andijon, Namangan ahlining umumiy mahallasi.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border-2 border-amber-600 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-choyxona-gold" />
          <h3 className="font-bold text-base text-amber-100">Mahallalar va Klanlar</h3>
        </div>

        <p className="text-xs text-amber-200/60 leading-relaxed">
          O'z mahallangiz yoki do'stlaringiz bilan klan tuzing va umumiy respublika reytingida 1-o'rin uchun kurashing!
        </p>

        {/* Klanlar Reytingi */}
        <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
          {sampleClans.map((clan, idx) => (
            <div
              key={clan.id}
              className="bg-stone-800/90 border border-amber-900/40 p-3 rounded-2xl flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-700">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-xs text-amber-200">{clan.name}</span>
                  <span className="text-[10px] bg-stone-700 text-stone-300 px-1 rounded font-mono">
                    [{clan.tag}]
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-choyxona-gold">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{clan.totalElo}</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 italic">{clan.description}</p>
              <div className="flex items-center justify-between pt-1 text-[10px] text-stone-500 border-t border-stone-700/50">
                <span>A'zolar: {clan.membersCount} ta</span>
                <span className="text-amber-500 font-semibold cursor-pointer hover:underline">
                  Qo'shilish
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
