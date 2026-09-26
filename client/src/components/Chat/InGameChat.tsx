import React, { useState, useEffect } from 'react';
import { ChatMessage, CHOYXONA_QUICK_PHRASES } from '../../../../shared/src/types/chat';
import { Send, X, MessageSquare } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';

interface InGameChatProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string, isQuickPhrase?: boolean) => void;
  cooldownSeconds?: number;
}

export const InGameChat: React.FC<InGameChatProps> = ({
  messages,
  isOpen,
  onClose,
  onSendMessage,
  cooldownSeconds = 0,
}) => {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = (text: string, isQuick: boolean = false) => {
    if (!text.trim() || cooldownSeconds > 0) return;
    triggerHaptic('light');
    onSendMessage(text, isQuick);
    if (!isQuick) setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
      <div className="w-full max-w-lg mx-auto bg-stone-900 border-t-2 border-choyxona-gold rounded-t-3xl p-4 shadow-2xl flex flex-col h-[70vh] max-h-[500px]">
        {/* Yuqori qism: Sarlavha va yopish */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-choyxona-gold" />
            <span className="font-bold text-sm text-amber-200">Choyxona Chati</span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Xabarlar ro'yxati */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 flex flex-col-reverse">
          {[...messages].reverse().map((msg) => (
            <div
              key={msg.id}
              className="bg-stone-800/90 border border-amber-900/30 rounded-2xl px-3 py-1.5 self-start max-w-[85%]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-choyxona-gold">{msg.senderName}</span>
                <span className="text-[9px] text-stone-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-stone-200 mt-0.5 leading-relaxed break-words">{msg.text}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-stone-600 text-xs my-auto">
              Hozircha xabarlar yo'q. Birinchi bo'lib yozing!
            </div>
          )}
        </div>

        {/* Tezkor Choyxona Iboralari (1 marta bosish bilan) */}
        <div className="py-2 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-stone-800/80">
          {CHOYXONA_QUICK_PHRASES.slice(0, 6).map((phrase, i) => (
            <button
              key={i}
              disabled={cooldownSeconds > 0}
              onClick={() => handleSend(phrase, true)}
              className="whitespace-nowrap px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800/60 text-[11px] text-amber-200 hover:bg-amber-900/80 disabled:opacity-50 transition"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Xabar yozish maydoni */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className="flex items-center gap-2 pt-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={cooldownSeconds > 0 ? `Kuting (${cooldownSeconds}s)...` : "Xabar yozing..."}
            disabled={cooldownSeconds > 0}
            maxLength={100}
            className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-choyxona-gold disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={cooldownSeconds > 0 || !inputText.trim()}
            className="p-2 rounded-xl bg-choyxona-gold text-stone-950 font-bold disabled:opacity-40 shadow transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
