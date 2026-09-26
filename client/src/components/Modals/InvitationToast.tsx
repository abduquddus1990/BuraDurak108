import React, { useEffect, useState } from 'react';
import { TableInvitation } from '../../../../shared/src/types/social';
import { Users, Check, X } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';

interface InvitationToastProps {
  invitation: TableInvitation | null;
  onAccept: (invitation: TableInvitation) => void;
  onDecline: () => void;
}

export const InvitationToast: React.FC<InvitationToastProps> = ({
  invitation,
  onAccept,
  onDecline,
}) => {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!invitation) return;
    setTimeLeft(15);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [invitation]);

  if (!invitation) return null;

  const getGameLabel = (type: string) => {
    if (type === 'BURA') return '☕ Bura';
    if (type === 'ONE_HUNDRED_EIGHT') return '🎯 108 O\'yini';
    return '🛡️ Durak';
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm animate-in slide-in-from-top duration-300">
      <div className="bg-stone-900/95 border-2 border-amber-500 rounded-3xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-stone-950 font-black shadow">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black text-amber-100 flex items-center gap-1.5">
                <span>{invitation.inviterName}</span>
                <span className="text-[10px] text-amber-400 font-normal">({timeLeft}s)</span>
              </span>
              <span className="text-[11px] text-stone-300">
                Sizni <b className="text-amber-300">{getGameLabel(invitation.gameType)}</b> stoliga taklif qildi!
              </span>
              <span className="text-[9px] text-stone-400">
                Qoida: {invitation.rules} • {invitation.totalPlayers} kishilik
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onDecline();
            }}
            className="text-stone-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic('light');
              onDecline();
            }}
            className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
          >
            Rad etish
          </button>
          <button
            onClick={() => {
              triggerHaptic('success');
              onAccept(invitation);
            }}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-stone-950 text-xs font-black shadow hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1"
          >
            <Check className="w-4 h-4" />
            <span>Qo'shilish</span>
          </button>
        </div>
      </div>
    </div>
  );
};