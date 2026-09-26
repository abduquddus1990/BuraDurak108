import React from 'react';
import { RoundSummary } from '../../../../shared/src/types/game';
import { PlayingCard } from '../Cards/PlayingCard';
import { Trophy, CheckCircle, ArrowRight, Skull, RotateCcw, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';

interface RoundSummaryModalProps {
  roundSummary?: RoundSummary;
  currentUserId: string;
  gameType: string;
  onReadyNext: () => void;
  onLeaveRoom: () => void;
  onRematch?: () => void;
  rematchVotes?: string[];
  humanCount?: number;
  onShare?: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  roundSummary,
  currentUserId,
  gameType,
  onReadyNext,
  onLeaveRoom,
  onRematch,
  rematchVotes = [],
  humanCount = 1,
  onShare,
}) => {
  if (!roundSummary) return null;

  const myResult = roundSummary.results.find((r) => r.playerId === currentUserId);
  const isMeReady = myResult?.readyForNext || false;

  const handleReadyClick = () => {
    triggerHaptic('success');
    onReadyNext();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 relative max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Sarlavha */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-500 flex items-center justify-center text-amber-300 mb-1.5 shadow-lg">
            {roundSummary.isGameOver ? (
              <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" />
            ) : (
              <RotateCcw className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <h2 className="text-lg font-black text-amber-200 font-serif">
            {roundSummary.isGameOver ? "Partiya To'liq Yakunlandi!" : `${roundSummary.roundNumber}-Qo'l Natijasi`}
          </h2>
          <span className="text-xs text-stone-400 mt-0.5">{roundSummary.reason}</span>
        </div>

        {/* O'yinchilarning ochiq kartalari va ochkolari hisobi */}
        <div className="flex flex-col gap-2.5">
          {roundSummary.results.map((result) => {
            const isWinner = result.playerId === roundSummary.winnerId;
            const isMe = result.playerId === currentUserId;

            return (
              <div
                key={result.playerId}
                className={`p-3 rounded-2xl border flex flex-col gap-2 transition ${
                  isWinner
                    ? 'bg-amber-950/70 border-yellow-500 shadow-md ring-1 ring-yellow-500/40'
                    : result.isEliminated
                    ? 'bg-rose-950/50 border-rose-800/80 opacity-70'
                    : 'bg-stone-800/80 border-stone-700/80'
                }`}
              >
                {/* O'yinchi nomi va holati */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                        isWinner ? 'bg-yellow-500 text-stone-950' : 'bg-stone-700 text-stone-200'
                      }`}
                    >
                      {isWinner ? '👑' : result.username.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-bold text-xs text-amber-100">
                      {result.username} {isMe && '(Siz)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {/* BURA JARIMALARI (-12 gacha) */}
                    {gameType === 'BURA' && (
                      <div className="flex flex-col items-end leading-tight">
                        <span className="text-emerald-400 font-bold text-[11px]">
                          Vzyatka: {result.roundScore} ball
                        </span>
                        <span className={`text-[10px] font-black ${result.totalPenalty >= 12 ? 'text-rose-400 font-black' : 'text-amber-300'}`}>
                          Jarima: {result.totalPenalty} / 12 {result.roundPenalty > 0 && `(+${result.roundPenalty})`}
                        </span>
                      </div>
                    )}

                    {/* 108 JARIMALARI (108 gacha) */}
                    {gameType === 'ONE_HUNDRED_EIGHT' && (
                      <div className="flex flex-col items-end leading-tight">
                        {result.isEliminated ? (
                          <span className="text-rose-400 font-black flex items-center gap-1 text-[11px]">
                            <Skull className="w-3.5 h-3.5" /> Chiqib ketdi (108+)
                          </span>
                        ) : (
                          <>
                            <span className={`font-bold text-[11px] ${result.roundPenalty < 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                              {result.roundPenalty >= 0 ? `+${result.roundPenalty}` : result.roundPenalty} ochko
                              {result.roundPenalty < 0 && ' (dama bilan chiqdi)'}
                            </span>
                            <span className="text-[10px] text-stone-400 font-semibold">
                              Jami: {result.totalPenalty} / 108
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Yutilgan / Qo'ldagi Ochiq Kartalar Ko'rsatmasi */}
                {result.wonCards.length > 0 ? (
                  <div className="flex flex-col gap-1 pt-1 border-t border-stone-700/50">
                    <span className="text-[10px] font-bold text-stone-400">
                      {gameType === 'BURA' ? 'Olingan vzyatka kartalari:' : 'Qo\'lda qolgan kartalar:'}
                    </span>
                    <div className="flex flex-wrap gap-1 items-center max-h-24 overflow-y-auto no-scrollbar py-1">
                      {result.wonCards.map((card, cIdx) => (
                        <div key={cIdx} className="scale-75 -m-2 origin-top-left">
                          <PlayingCard card={card} size="sm" isPlayable={false} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] italic text-stone-500 pt-1 border-t border-stone-700/50">
                    Hech qanday karta olinmagan (0 ball)
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tugmalar qismi */}
        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-stone-800">
          {!roundSummary.isGameOver ? (
            <button
              onClick={handleReadyClick}
              disabled={isMeReady}
              className={`w-full py-3 rounded-2xl font-black text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                isMeReady
                  ? 'bg-stone-800 text-stone-400 border border-stone-700 cursor-default'
                  : 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:brightness-110 active:scale-95'
              }`}
            >
              {isMeReady ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Siz tayyorsiz (Boshqalar kutilmoqda...)</span>
                </>
              ) : (
                <>
                  <span>Keyingi Qo'lga O'tish</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <>
              {onShare && (
                <button
                  onClick={onShare}
                  className="w-full py-2.5 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow"
                >
                  📤 Natijani do'stlarga ulashish
                </button>
              )}
              {onRematch && (
                <button
                  onClick={onRematch}
                  disabled={rematchVotes.includes(currentUserId)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black text-xs shadow-lg hover:brightness-110 disabled:opacity-60"
                >
                  {rematchVotes.includes(currentUserId)
                    ? `🔁 Boshqalar kutilmoqda (${rematchVotes.length}/${humanCount})`
                    : `🔁 Yana bir partiya${rematchVotes.length > 0 ? ` (${rematchVotes.length}/${humanCount} tayyor)` : ''}`}
                </button>
              )}
              <button
                onClick={onLeaveRoom}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-xs shadow-lg hover:brightness-110"
              >
                Asosiy Menyuga Qaytish
              </button>
            </>
          )}

          {!roundSummary.isGameOver && (
            <button
              onClick={onLeaveRoom}
              className="text-stone-400 text-xs font-bold hover:text-white py-1"
            >
              O'yinni Tark Etish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
