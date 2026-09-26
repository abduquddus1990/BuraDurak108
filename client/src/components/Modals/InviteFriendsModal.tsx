import React, { useState } from 'react';
import { GameType, GameRules, TableState } from '../../../../shared/src/types/game';
import { FriendItem, OnlineUserInfo, UserProfile } from '../../../../shared/src/types/social';
import { Users, UserPlus, Share2, Copy, Check, Play, Bot, Trophy, Radio, X, BookmarkCheck, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: GameType;
  rules: GameRules;
  playerCount: number;
  currentUser: UserProfile;
  currentUserId?: string;
  currentUserName?: string;
  friends: FriendItem[];
  onlineUsers: OnlineUserInfo[];
  activeRoomId: string | null;
  tableState: TableState | null;
  inviteFeedback?: { success: boolean; message: string } | null;
  onClearFeedback?: () => void;
  onCreateRoom: () => void;
  onGoToTable: () => void;
  onStartWithBots: () => void;
  onAddFriend: (username: string, aliasName: string) => void;
  onInviteUser: (targetUserId?: string, targetUsername?: string) => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  onClose,
  gameType,
  rules,
  playerCount,
  currentUser,
  currentUserId,
  currentUserName,
  friends,
  onlineUsers,
  activeRoomId,
  tableState,
  inviteFeedback,
  onClearFeedback,
  onCreateRoom,
  onGoToTable,
  onStartWithBots,
  onAddFriend,
  onInviteUser,
}) => {
  const [activeTab, setActiveTab] = useState<'CONTACTS' | 'ONLINE' | 'USERNAME'>('CONTACTS');
  const [targetUsername, setTargetUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMyName, setCopiedMyName] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const myUserId = currentUser?.id || currentUserId || '';
  const myUserName = currentUser?.displayName || currentUserName || 'Men';
  const myUsernameTag = currentUser?.username || 'mehmon';

  const getGameLabel = () => {
    if (gameType === 'BURA') return rules === 'SIX_CARDS' ? '☕ 6 Talik Bura' : '☕ 4 Talik Bura';
    if (gameType === 'ONE_HUNDRED_EIGHT') return '🎯 108 O\'yini';
    return '🛡️ Durak';
  };

  const getInviteLink = () => {
    if (!activeRoomId) return '';
    return `https://t.me/BuraKartaBot?startapp=join_${activeRoomId}`;
  };

  const getWebLink = () => {
    if (!activeRoomId) return '';
    return `${window.location.origin}/?joinRoom=${activeRoomId}`;
  };

  const handleCopyLink = () => {
    triggerHaptic('success');
    const link = getInviteLink() || getWebLink();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMyUsername = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(`@${myUsernameTag}`);
    setCopiedMyName(true);
    setTimeout(() => setCopiedMyName(false), 2000);
  };

  const handleShareTelegram = () => {
    triggerHaptic('success');
    const link = getInviteLink() || getWebLink();
    const shareText = encodeURIComponent(
      `🍵 Qadrdonim! Kel birga «Choyxona»da ${getGameLabel()} o'ynaymiz!\nStol kodi: #${activeRoomId}\nQo'shilish uchun havola:`
    );
    const shareUrl = encodeURIComponent(link);
    window.open(`https://t.me/share/url?url=${shareUrl}&text=${shareText}`, '_blank');
  };

  const handleInviteFromInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim()) return;
    triggerHaptic('medium');
    const cleanUsername = targetUsername.trim().replace('@', '');
    if (!activeRoomId) onCreateRoom();
    onInviteUser(undefined, cleanUsername);
    setLocalMsg(`@${cleanUsername} ga taklif yuborildi...`);
    setTimeout(() => setLocalMsg(null), 3000);
    setTargetUsername('');
  };

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    triggerHaptic('success');
    onAddFriend(newUsername.trim().replace('@', ''), aliasName.trim() || newUsername.trim());
    setNewUsername('');
    setAliasName('');
    setShowAddForm(false);
  };

  const roomPlayers = tableState?.players || [];
  const joinedCount = roomPlayers.length || (activeRoomId ? 1 : 0);
  const filteredOnline = onlineUsers
    .filter((u) => u.id !== myUserId)
    .sort((a, b) => (b.ratingElo || 1000) - (a.ratingElo || 1000));

  const displayMessage = inviteFeedback?.message || localMsg;
  const isMessageSuccess = inviteFeedback ? inviteFeedback.success : true;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-600 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col gap-3 relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-choyxona-gold" />
            <h2 className="font-black text-base text-amber-100">Do'stlar Bilan Onlayn Stol</h2>
          </div>
          <span className="text-xs text-amber-400/90 mt-0.5">
            {getGameLabel()} • {rules} • {playerCount} kishilik stol
          </span>
        </div>

        {/* Foydalanuvchining o'z shaxsiy nomini ko'rsatish */}
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl px-3 py-2 flex items-center justify-between shadow-inner">
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10px] text-stone-400">Do'stlaringiz sizni qo'shishi uchun username:</span>
            <span className="text-xs font-black text-amber-300 font-mono">@{myUsernameTag}</span>
          </div>
          <button
            onClick={handleCopyMyUsername}
            className="px-2.5 py-1 rounded-xl bg-stone-900 border border-amber-700/50 hover:border-amber-500 text-stone-200 text-[10px] font-bold flex items-center gap-1 transition"
          >
            {copiedMyName ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
            <span>{copiedMyName ? 'Nusxalandi' : 'Nusxalash'}</span>
          </button>
        </div>

        {activeRoomId ? (
          <div className="bg-stone-950/80 border border-amber-800/60 rounded-2xl p-3 flex flex-col gap-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Stol Kutilmoqda ({joinedCount}/{playerCount} o'rin)
              </span>
              <span className="text-[11px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-700/50">
                #{activeRoomId}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {Array.from({ length: playerCount }).map((_, index) => {
                const player = roomPlayers[index];
                const isMe = player ? player.id === myUserId : index === 0;
                const name = player ? player.username : (index === 0 ? myUserName : null);

                return (
                  <div
                    key={index}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1 min-h-[64px] ${
                      name
                        ? 'border-amber-500/70 bg-amber-950/50 text-amber-100'
                        : 'border-dashed border-stone-700 bg-stone-900/40 text-stone-500'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-[10px] font-black">
                      {name ? name.slice(0, 2).toUpperCase() : (index + 1)}
                    </div>
                    <span className="text-[10px] font-bold truncate max-w-[80px]">
                      {name ? (isMe ? `${name} (Siz)` : name) : "Do'st..."}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleShareTelegram}
                className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Telegramda Ulashish</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="py-2 px-3 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 font-bold text-xs shadow hover:bg-stone-700 flex items-center justify-center gap-1.5"
                title="Havolani nusxalash"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Nusxalandi!' : 'Havola'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-stone-800">
              <button
                onClick={onGoToTable}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-xs shadow hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Stolga O'tish</span>
              </button>

              {joinedCount < playerCount && (
                <button
                  onClick={onStartWithBots}
                  className="py-2 px-2.5 rounded-xl bg-stone-800 border border-amber-600/40 text-amber-300 font-bold text-xs shadow hover:bg-stone-700 flex items-center justify-center gap-1"
                  title="Kutmasdan qolgan o'rinlarga bot qo'shish"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Bot qo'shib boshlash</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-stone-950/70 border border-stone-850 p-3 rounded-2xl flex flex-col items-center text-center gap-2">
            <p className="text-xs text-stone-300">
              Do'stlaringiz bilan birga o'ynash uchun onlayn stol yarating va taklif yuboring.
            </p>
            <button
              onClick={onCreateRoom}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-stone-950" />
              <span>Onlayn Stol Ochish (Do'stlar Uchun)</span>
            </button>
          </div>
        )}

        {/* Taklifnoma yuborish natijasi (Feedback Banner) */}
        {displayMessage && (
          <div
            className={`border text-xs px-3.5 py-2 rounded-2xl text-left shadow-lg flex items-start justify-between gap-2 animate-in fade-in slide-in-from-top-1 ${
              isMessageSuccess
                ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200'
                : 'bg-amber-950/90 border-amber-500/70 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {isMessageSuccess ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col gap-1">
                <span className="leading-snug">{displayMessage}</span>
                {!isMessageSuccess && (
                  <button
                    onClick={handleShareTelegram}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:underline"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Telegram orqali havola ulashish</span>
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setLocalMsg(null);
                if (onClearFeedback) onClearFeedback();
              }}
              className="text-stone-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1 bg-stone-950 p-1 rounded-2xl border border-stone-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('CONTACTS')}
            className={`py-1.5 rounded-xl transition ${
              activeTab === 'CONTACTS' ? 'bg-amber-950 border border-amber-600 text-amber-200' : 'text-stone-400 hover:text-white'
            }`}
          >
            Kontaktlarim
          </button>
          <button
            onClick={() => setActiveTab('ONLINE')}
            className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1 ${
              activeTab === 'ONLINE' ? 'bg-amber-950 border border-amber-600 text-amber-200' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Onlayn ({filteredOnline.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('USERNAME')}
            className={`py-1.5 rounded-xl transition ${
              activeTab === 'USERNAME' ? 'bg-amber-950 border border-amber-600 text-amber-200' : 'text-stone-400 hover:text-white'
            }`}
          >
            @Username
          </button>
        </div>

        {activeTab === 'CONTACTS' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold text-stone-400">Saqlangan Do'stlar:</span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                <span>Kontakt Qo'shish</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddFriendSubmit} className="bg-stone-800/90 border border-amber-800/60 p-2.5 rounded-2xl flex flex-col gap-2 shadow-inner">
                <span className="text-[11px] font-bold text-amber-300">Yangi Kontakt</span>
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
                  placeholder="Do'stingiz ismi (Rustam jo'ram)"
                  className="bg-stone-900 border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-xs shadow hover:brightness-110"
                >
                  Saqlash
                </button>
              </form>
            )}

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              {friends.length === 0 ? (
                <div className="py-6 text-center text-stone-500 text-xs">
                  Hozircha kontaktlar yo'q. Yuqoridagi "Kontakt Qo'shish" tugmasi orqali do'stingizni kiriting!
                </div>
              ) : (
                friends.map((friend) => {
                  const cleanFriendUser = friend.username.replace('@', '').toLowerCase();
                  const matchingOnline = onlineUsers.find(
                    (u) =>
                      u.id !== myUserId &&
                      ((u.username && u.username.replace('@', '').toLowerCase() === cleanFriendUser) ||
                       (u.displayName && u.displayName.toLowerCase() === friend.displayName.toLowerCase()) ||
                       u.id === friend.id)
                  );
                  const isOnlineNow = !!matchingOnline;

                  return (
                    <div
                      key={friend.id}
                      className="bg-stone-800/70 border border-stone-700/50 p-2 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center font-bold text-xs text-amber-200 relative">
                          {friend.displayName.slice(0, 2).toUpperCase()}
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-stone-800 ${
                              isOnlineNow ? 'bg-green-500 animate-pulse' : 'bg-stone-500'
                            }`}
                          />
                        </div>
                        <div className="flex flex-col text-left leading-tight">
                          <span className="text-xs font-bold text-stone-100 flex items-center gap-1">
                            <BookmarkCheck className="w-3 h-3 text-amber-400" />
                            {friend.displayName}
                          </span>
                          <span className="text-[10px] text-stone-400 flex items-center gap-1">
                            <span>@{friend.username}</span>
                            <span>•</span>
                            <span className={isOnlineNow ? 'text-green-400 font-semibold' : 'text-stone-400'}>
                              {isOnlineNow ? '🟢 Hozir onlayn' : '⚪ Oflayn'}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            if (!activeRoomId) onCreateRoom();
                            onInviteUser(
                              matchingOnline ? matchingOnline.id : friend.id,
                              matchingOnline ? matchingOnline.username : friend.username
                            );
                            setLocalMsg(`${friend.displayName} ga taklif yuborildi...`);
                            setTimeout(() => setLocalMsg(null), 3000);
                          }}
                          className={`px-2.5 py-1 rounded-xl font-bold text-[11px] shadow transition ${
                            isOnlineNow
                              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-stone-950 hover:brightness-110'
                              : 'bg-amber-600 hover:bg-amber-500 text-white'
                          }`}
                        >
                          {isOnlineNow ? 'Stolga Chaqirish' : 'Taklif Yuborish'}
                        </button>

                        {!isOnlineNow && (
                          <button
                            onClick={handleShareTelegram}
                            className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow"
                            title="Telegram chatida havola ulashish"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: JONLI ONLAYN O'YINCHILAR */}
        {activeTab === 'ONLINE' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-bold text-stone-400">
                Jonli Onlayn O'yinchilar:
              </span>
              <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                <Trophy className="w-3 h-3" /> ELO reytingi bo'yicha
              </span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              {filteredOnline.length === 0 ? (
                <div className="py-6 text-center text-stone-500 text-xs flex flex-col items-center gap-1">
                  <span>Hozircha boshqa onlayn o'yinchilar yo'q.</span>
                  <span className="text-[11px] text-stone-400">Do'stlaringizga Telegram orqali havola yuboring!</span>
                  <button
                    onClick={handleShareTelegram}
                    className="mt-2 py-1 px-3 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Telegramda Havola Ulashish</span>
                  </button>
                </div>
              ) : (
                filteredOnline.map((user, idx) => (
                  <div
                    key={user.id}
                    className="bg-stone-800/70 border border-stone-700/50 p-2 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-amber-400/80 w-4 text-center">
                        #{idx + 1}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center font-bold text-xs text-amber-200 relative">
                        {user.displayName.slice(0, 2).toUpperCase()}
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-stone-800 ${
                            user.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                      </div>
                      <div className="flex flex-col text-left leading-tight">
                        <span className="text-xs font-bold text-stone-100 truncate max-w-[120px]">
                          {user.displayName}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          @{user.username} • <b className="text-amber-400">{user.ratingElo} ball</b>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        if (!activeRoomId) onCreateRoom();
                        onInviteUser(user.id, user.username);
                        setLocalMsg(`${user.displayName} ga taklif yuborildi...`);
                        setTimeout(() => setLocalMsg(null), 3000);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-bold text-[11px] shadow hover:brightness-110 active:scale-95 transition"
                    >
                      Taklif Etish
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: USERNAME BO'YICHA */}
        {activeTab === 'USERNAME' && (
          <form onSubmit={handleInviteFromInput} className="flex flex-col gap-2.5 py-1 text-left">
            <label className="text-xs font-bold text-stone-300">
              Do'stingizning Telegram yoki o'yindagi usernamesi:
            </label>
            <div className="flex items-center gap-2 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2">
              <span className="text-amber-400 font-bold text-xs">@</span>
              <input
                type="text"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="masalan: mehmon_1234 yoki sardor"
                className="bg-transparent text-xs text-white placeholder-stone-500 focus:outline-none flex-1"
                required
              />
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              💡 Agar do'stingiz hozir o'yinda bo'lsa, uning ekraniga to'g'ridan-to'g'ri taklifnoma chiqadi. Shuningdek, Telegram orqali unga havola ulashishingiz mumkin.
            </p>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-xs shadow hover:brightness-110 active:scale-95 transition"
            >
              Taklif Yuborish
            </button>
          </form>
        )}
      </div>
    </div>
  );
};