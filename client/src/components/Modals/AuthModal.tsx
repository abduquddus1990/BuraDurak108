import React, { useEffect, useState } from 'react';
import { UserCog, X, AtSign } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';

// Kirish Telegram orqali avtomatik (serverda initData imzosi tekshiriladi), shuning uchun parol yo'q.
// Bu oyna faqat stolda ko'rinadigan ismni o'zgartiradi.
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (displayName: string) => void;
  promptMessage?: string;
  initialName?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  promptMessage,
  initialName = '',
}) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError('');
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.replace(/\s+/g, ' ').trim();
    if (clean.length < 2 || clean.length > 24) {
      setError("Ism 2 dan 24 gacha belgidan iborat bo'lishi kerak");
      return;
    }
    triggerHaptic('success');
    onSuccess(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-500/50 flex items-center justify-center text-amber-300 mb-2">
            <UserCog className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-amber-200 font-serif">Stoldagi Ismingiz</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Boshqa o'yinchilar sizni shu ism bilan ko'rishadi. Reyting va statistika avtomatik saqlanadi.
          </p>
        </div>

        {promptMessage && (
          <div className="bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs px-3.5 py-2 rounded-2xl text-center shadow">
            {promptMessage}
          </div>
        )}

        {error && (
          <div className="bg-rose-950/80 border border-rose-600/50 text-rose-200 text-xs px-3 py-1.5 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2">
            <AtSign className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              placeholder="masalan: Bura ustasi"
              className="bg-transparent text-xs text-white placeholder-stone-500 focus:outline-none flex-1"
            />
          </div>

          <button
            type="submit"
            className="mt-1 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            Saqlash
          </button>
        </form>
      </div>
    </div>
  );
};
