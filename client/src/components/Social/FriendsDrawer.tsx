import React, { useState } from 'react';
import { FriendItem } from '../../../../shared/src/types/social';
import { Users, UserPlus, Share2, X, BookmarkCheck } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';

interface FriendsDrawerProps {
  friends: FriendItem[];
  isOpen: boolean;
  onClose: () => void;
  onAddFriend: (username: string, aliasName: string) => void;
  onInviteToRoom?: (friendId: string) => void;
}

export const FriendsDrawer: React.FC<FriendsDrawerProps> = ({
  friends,
  isOpen,
  onClose,
  onAddFriend,
  onInviteToRoom,
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const handleShareLink = () => {
    triggerHaptic('success');
    const shareText = encodeURIComponent("Choyxonada Bura, 108 va Durak o'ynaymiz! Stolga qo'shil:");
    const shareUrl = encodeURIComponent("https://t.me/share/url?url=https://t.me/choyxona_games_bot?startapp=invite");
    window.open(`https://t.me/share/url?url=${shareUrl}&text=${shareText}`, '_blank');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    triggerHaptic('success');
    onAddFriend(newUsername.trim().replace('@', ''), aliasName.trim() || newUsername.trim());
    setNewUsername('');
    setAliasName('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border-2 border-amber-600 rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 relative max-h-[85vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-choyxona-gold" />
            <h3 className="font-bold text-base text-amber-100">Do'stlar va Kontaktlar</h3>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 rounded-xl bg-amber-950 border border-amber-700/50 text-amber-300 text-xs font-bold flex items-center gap-1 hover:bg-amber-900"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Qo'shish</span>
          </button>
        </div>

        {/* Username orqali yangi kontakt qo'shish formasi */}
        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="bg-stone-800/90 border border-amber-800/60 p-3 rounded-2xl flex flex-col gap-2 shadow-inner">
            <span className="text-[11px] font-black text-amber-300">Yangi Kontakt Qo'shish</span>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Telegram username (@siz_bura)"
              className="bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
              required
            />
            <input
              type="text"
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
              placeholder="Ilova ichidagi kontakt nomi (masalan: Rustam jo'ram)"
              className="bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs shadow hover:brightness-110"
            >
              Kontakt Sifatida Saqlash
            </button>
          </form>
        )}

        {/* Telegram havola ulashish */}
        <button
          onClick={handleShareLink}
          className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>Telegram orqali do'stni taklif qilish</span>
        </button>

        {/* Do'stlar ro'yxati */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-60">
          {friends.length === 0 ? (
            <div className="py-6 text-center text-stone-500 text-xs">
              Hozircha kontaktlar yo'q. Yuqoridagi "Qo'shish" tugmasi orqali do'stingiz usernamesini kiriting!
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                className="bg-stone-800/80 border border-stone-700/60 p-2.5 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center font-bold text-xs text-amber-200 relative">
                    {friend.displayName.slice(0, 2).toUpperCase()}
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-stone-800 ${
                        friend.status === 'ONLINE'
                          ? 'bg-green-500'
                          : friend.status === 'IN_GAME'
                          ? 'bg-amber-500'
                          : 'bg-stone-500'
                      }`}
                    />
                  </div>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-stone-100 flex items-center gap-1">
                      <BookmarkCheck className="w-3 h-3 text-amber-400" />
                      {friend.displayName}
                    </span>
                    <span className="text-[10px] text-stone-400">@{friend.username} • ELO {friend.ratingElo}</span>
                  </div>
                </div>

                {onInviteToRoom && (
                  <button
                    onClick={() => onInviteToRoom(friend.id)}
                    className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shadow"
                  >
                    Chaqirish
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
