import React, { useState, useEffect, useRef } from 'react';
import { TableState, SpecialCombination, PlayerPublic } from '../../../../shared/src/types/game';
import { Card, Suit } from '../../../../shared/src/types/card';
import { ChatMessage } from '../../../../shared/src/types/chat';
import { TableThemeId, AppBackgroundId, CardBackId, APP_BACKGROUNDS } from '../../types/theme';
import { PlayerSeat } from './PlayerSeat';
import { TableCenter } from './TableCenter';
import { CardHand } from './CardHand';
import { PlayingCard } from '../Cards/PlayingCard';
import { SpecialHandModal } from '../Modals/SpecialHandModal';
import { SuitSelectorModal } from '../Modals/SuitSelectorModal';
import { ThemeSelectorModal } from './ThemeSelectorModal';
import { RoundSummaryModal } from '../Modals/RoundSummaryModal';
import { InGameChat } from '../Chat/InGameChat';
import { requestFullscreenAndLandscape, exitLandscape, triggerHaptic } from '../../services/telegramSdk';
import { canBeatCard } from '../../../../shared/src/utils/deck';
import { getPlayableHint } from '../../../../shared/src/utils/playable';
import { playSound, announce } from '../../services/sound';
import { useUiPrefs } from '../../services/uiPrefs';
import { RulesModal } from '../Modals/RulesModal';
import { ArrowLeft, MessageSquare, Palette, RotateCcw, BookOpen, Volume2, VolumeX, Eye } from 'lucide-react';

interface XontaxtaViewProps {
  tableState: TableState;
  hand: Card[];
  currentUserId: string;
  chatMessages: ChatMessage[];
  currentThemeId: TableThemeId;
  currentBgId: AppBackgroundId;
  currentCardBackId: CardBackId;
  onPlayAction: (action: string, payload: any) => void;
  onSendChatMessage: (text: string, isQuick?: boolean) => void;
  onLeaveRoom: () => void;
  onSelectTheme: (id: TableThemeId) => void;
  onSelectBg: (id: AppBackgroundId) => void;
  onSelectCardBack: (id: CardBackId) => void;
  onReadyNextRound?: () => void;
  onStartWithBots?: () => void;
  onOpenInviteFriends?: () => void;
  chatCooldown?: number;
  availableCombinations?: SpecialCombination[];
  pendingPenaltyCount?: number;
  // Maslahat: tavsiya qilingan kartalar (hintVersion o'zgarganda tanlanadi)
  hintCardIds?: string[];
  hintVersion?: number;
  onRequestHint?: () => void;
}

export const XontaxtaView: React.FC<XontaxtaViewProps> = ({
  tableState,
  hand,
  currentUserId,
  chatMessages,
  currentThemeId,
  currentBgId,
  currentCardBackId,
  onPlayAction,
  onSendChatMessage,
  onLeaveRoom,
  onSelectTheme,
  onSelectBg,
  onSelectCardBack,
  onReadyNextRound = () => {},
  onStartWithBots,
  onOpenInviteFriends,
  chatCooldown = 0,
  availableCombinations = [],
  pendingPenaltyCount = 0,
  hintCardIds,
  hintVersion = 0,
  onRequestHint,
}) => {
  const { sound, setPref } = useUiPrefs();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [showLastTrick, setShowLastTrick] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState(false);
  const [isSuitModalOpen, setIsSuitModalOpen] = useState(false);
  const [pendingPlayedCard, setPendingPlayedCard] = useState<Card | null>(null);
  const [dismissedAlertTimestamp, setDismissedAlertTimestamp] = useState<number | null>(null);

  // Foydalanuvchi talabi: o'yinga kirganda albomniy ekranga aylansin
  const [isForcedLandscape, setIsForcedLandscape] = useState(true);
  const [showRotationHint, setShowRotationHint] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  useEffect(() => {
    // 1. Telegram / Browser orqali to'liq ekran va albom (landscape) rejimini so'rash
    requestFullscreenAndLandscape();

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const hintTimer = setTimeout(() => {
      setShowRotationHint(false);
    }, 4500);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(hintTimer);
      exitLandscape();
    };
  }, []);

  const isPhysicallyPortrait = windowSize.height > windowSize.width;
  const applyRotation = isPhysicallyPortrait && isForcedLandscape;
  const isLandscapeMode = !isPhysicallyPortrait || applyRotation;

  // Kombinatsiya ochilganda 7 soniyadan so'ng yoki tugma bosilganda bildirishnomani yopish
  useEffect(() => {
    if (tableState.specialCombinationAlert) {
      const timer = setTimeout(() => {
        setDismissedAlertTimestamp(tableState.specialCombinationAlert?.timestamp || null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [tableState.specialCombinationAlert?.timestamp]);

  // Navbat taymeri: server qolgan vaqtni yuboradi (soatlar farqiga bog'liq bo'lmaslik uchun), biz mahalliy sanaymiz
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (tableState.turnRemainingMs === undefined || tableState.turnRemainingMs === null) {
      setSecondsLeft(null);
      return;
    }
    const deadline = Date.now() + tableState.turnRemainingMs;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [tableState]);

  const currentAlert = tableState.specialCombinationAlert;
  const showAlert = currentAlert && dismissedAlertTimestamp !== currentAlert.timestamp;

  const activePlayer = tableState.players[tableState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === currentUserId && tableState.status === 'PLAYING';
  const isDefender = tableState.settings.gameType === 'DURAK' && tableState.currentDefenderId === currentUserId;
  // Durak: himoyachi urayotgan paytda boshqa hujumchilar ham mos nominaldagi karta tashlashi mumkin
  // (server kim tashlay olishini - qo'shnilik va karta soni cheklovlarini - o'zi tekshiradi)
  const canThrowIn =
    tableState.settings.gameType === 'DURAK' &&
    tableState.status === 'PLAYING' &&
    !isDefender &&
    tableState.tableCards.length > 0 &&
    !!tableState.players.find((p) => p.id === currentUserId && p.cardsCount > 0);
  const canPlayNow = isMyTurn || canThrowIn;

  // Yurish mumkin bo'lgan kartalar (ko'rsatkich - yakuniy tekshiruv serverda)
  const playableHint = getPlayableHint(tableState, hand, currentUserId, canPlayNow);

  // Maslahat kelganda tavsiya qilingan kartalarni avtomatik tanlab qo'yamiz
  useEffect(() => {
    if (hintCardIds && hintCardIds.length > 0) setSelectedCardIds(hintCardIds);
  }, [hintVersion]);

  // Navbat taymeri halqasi uchun (1 - to'liq vaqt)
  const timerFraction =
    secondsLeft !== null && tableState.status === 'PLAYING'
      ? secondsLeft / Math.max(1, tableState.settings.turnTimeoutSeconds)
      : null;

  // --- Ovoz effektlari: holat o'zgarishiga qarab ---
  const prevStateRef = useRef<TableState | null>(null);
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = tableState;
    if (!prev || !sound) return;

    const alert = tableState.specialCombinationAlert;
    if (alert && alert.timestamp !== prev.specialCombinationAlert?.timestamp) {
      playSound('alert');
      const spoken: Record<string, string> = { MOSKVA: 'Moskva!', BURA: 'Bura!', MOLODKA: 'Molodka!', FORTY_ONE: 'Qirq bir!' };
      announce(spoken[alert.type] || alert.title);
      return;
    }
    if (tableState.roundSummary && !prev.roundSummary) {
      if (tableState.roundSummary.reason?.includes('TUXUM')) {
        announce('Tuxum!');
        playSound('alert');
      } else {
        playSound(tableState.roundSummary.winnerId === currentUserId ? 'win' : 'lose');
      }
      return;
    }
    if (tableState.status === 'GAME_OVER' && prev.status !== 'GAME_OVER' && !tableState.roundSummary) {
      playSound(tableState.winnerId === currentUserId ? 'win' : 'lose');
      return;
    }
    if (tableState.status === 'PLAYING' && (prev.status !== 'PLAYING' || prev.roundNumber !== tableState.roundNumber)) {
      playSound('deal');
      return;
    }
    if (tableState.tableCards.length !== prev.tableCards.length || tableState.tableCards.some((tc, i) => !!tc.beatenBy !== !!prev.tableCards[i]?.beatenBy)) {
      playSound('card');
    }
    const wasMyTurn = prev.players[prev.activePlayerIndex]?.id === currentUserId && prev.status === 'PLAYING';
    if (isMyTurn && !wasMyTurn) {
      playSound('turn');
      triggerHaptic('light');
    }
  }, [tableState]);

  // --- O'rindiqlar: raqiblar men o'tirgan joydan soat mili bo'yicha stol atrofiga joylashadi ---
  const myIndex = tableState.players.findIndex((p) => p.id === currentUserId);
  const opponentsInOrder: PlayerPublic[] = [];
  for (let k = 1; k < tableState.players.length; k++) {
    opponentsInOrder.push(tableState.players[(Math.max(0, myIndex) + k) % tableState.players.length]);
  }
  if (myIndex === -1 && tableState.players[0]) opponentsInOrder.unshift(tableState.players[0]);
  let leftSeat: PlayerPublic | undefined;
  let rightSeat: PlayerPublic | undefined;
  let topSeats: PlayerPublic[] = opponentsInOrder;
  if (opponentsInOrder.length >= 2) {
    leftSeat = opponentsInOrder[0];
    rightSeat = opponentsInOrder[opponentsInOrder.length - 1];
    topSeats = opponentsInOrder.slice(1, -1);
  }
  const renderSeat = (player: PlayerPublic, position: 'top' | 'left' | 'right') => (
    <PlayerSeat
      key={player.id}
      player={player}
      position={position}
      cardBackId={currentCardBackId}
      gameType={tableState.settings.gameType}
      compact={isLandscapeMode}
      timerFraction={player.isTurn ? timerFraction : null}
      isDealer={tableState.dealerId === player.id}
    />
  );

  // Durak: qo'ldan karta tanlangach, stoldagi urilmagan kartaga bosib aynan uni urish
  const selectedDefenseCard = isDefender && selectedCardIds.length === 1 ? hand.find((c) => c.id === selectedCardIds[0]) : undefined;
  const targetableIds = selectedDefenseCard
    ? new Set(
        tableState.tableCards
          .filter((tc) => !tc.beatenBy && canBeatCard(tc.card, selectedDefenseCard, tableState.trumpSuit))
          .map((tc) => tc.card.id)
      )
    : undefined;
  const handleSelectTrickCard = (cardId: string) => {
    if (!selectedDefenseCard || !targetableIds?.has(cardId)) return;
    onPlayAction('DEFEND', { card: selectedDefenseCard, targetCardId: cardId });
    setSelectedCardIds([]);
  };

  const otherPlayers = tableState.players.filter((p) => p.id !== currentUserId);
  const me = tableState.players.find((p) => p.id === currentUserId) || {
    id: currentUserId,
    username: 'Men',
    cardsCount: hand.length,
    score: 0,
    penaltyPoints: 0,
    isTurn: isMyTurn,
    isFolded: false,
    ready: true,
    isBot: false,
  };

  const handleToggleCard = (card: Card) => {
    setSelectedCardIds((prev) =>
      prev.includes(card.id) ? prev.filter((id) => id !== card.id) : [...prev, card.id]
    );
  };

  // Yurish / Urish
  const handlePlaySelected = () => {
    if (!canPlayNow || selectedCardIds.length === 0) return;

    const cardsToPlay = hand.filter((c) => selectedCardIds.includes(c.id));

    // 108 da Valet yoki Dama tashlanganda mast tanlash
    if (tableState.settings.gameType === 'ONE_HUNDRED_EIGHT' && cardsToPlay.length === 1) {
      const card = cardsToPlay[0];
      const isValetVar1 = tableState.settings.rules === 'KOROL_QARGA' && card.rank === 'J';
      const isDamaVar2 = tableState.settings.rules === 'KOROL_OLMA' && card.rank === 'Q';

      if (isValetVar1 || isDamaVar2) {
        setPendingPlayedCard(card);
        setIsSuitModalOpen(true);
        setSelectedCardIds([]);
        return;
      }
    }

    if (tableState.settings.gameType === 'BURA') {
      onPlayAction('PLAY_CARDS', { cards: cardsToPlay });
    } else if (tableState.settings.gameType === 'ONE_HUNDRED_EIGHT') {
      onPlayAction('PLAY_CARD', { card: cardsToPlay[0] });
    } else if (tableState.settings.gameType === 'DURAK') {
      if (isDefender) {
        const card = cardsToPlay[0];
        const tableCards = tableState.tableCards;
        // Perekidli: urilmagan stol kartalari bilan bir xil nominal -> hujumni keyingi o'yinchiga o'tkazish
        const canTransfer =
          tableState.settings.rules === 'PEREKIDLI' &&
          tableCards.length > 0 &&
          tableCards.every((tc) => !tc.beatenBy && tc.card.rank === card.rank);
        if (canTransfer) {
          onPlayAction('TRANSFER', { card });
        } else {
          // Tanlangan karta ura oladigan birinchi urilmagan kartani nishonga olamiz
          const unbeaten = tableCards.filter((tc) => !tc.beatenBy);
          const targetTrick =
            unbeaten.find((tc) => canBeatCard(tc.card, card, tableState.trumpSuit)) || unbeaten[0];
          if (targetTrick) {
            onPlayAction('DEFEND', { card, targetCardId: targetTrick.card.id });
          }
        }
      } else {
        onPlayAction('ATTACK', { card: cardsToPlay[0] });
      }
    }

    setSelectedCardIds([]);
  };

  const handleSelectSuit = (suit: Suit) => {
    if (pendingPlayedCard) {
      onPlayAction('PLAY_CARD', { card: pendingPlayedCard, chosenSuit: suit });
      setPendingPlayedCard(null);
      setIsSuitModalOpen(false);
    }
  };

  const handleDrawCard = () => {
    if (isMyTurn) {
      onPlayAction('DRAW_CARD', {});
    }
  };

  // DURAK: Himoyachi kartalarni olishi
  const handleTakeCards = () => {
    onPlayAction('TAKE', {});
  };

  // Bita / Pas / Tashlash
  const handlePassOrFold = () => {
    if (tableState.settings.gameType === 'BURA') {
      if (!isMyTurn) return;
      // Tanlanmagan yoki soni mos kelmasa, server eng arzon kartalarni o'zi tanlaydi
      const cardsToFold = hand.filter((c) => selectedCardIds.includes(c.id));
      onPlayAction('FOLD', { cards: cardsToFold });
      setSelectedCardIds([]);
    } else if (tableState.settings.gameType === 'DURAK') {
      // Durakda har qanday vaziyatda hujum tugaganda yoki stol urilganda Bita beriladi
      onPlayAction('PASS', {});
    } else if (tableState.settings.gameType === 'ONE_HUNDRED_EIGHT') {
      if (!isMyTurn) return;
      onPlayAction('PASS', {});
    }
  };

  const handleDeclareCombination = (type: string) => {
    onPlayAction('DECLARE_COMBINATION', { type });
  };

  const bgTheme = APP_BACKGROUNDS[currentBgId] || APP_BACKGROUNDS.choyxona_night;

  const containerStyle: React.CSSProperties = applyRotation
    ? {
        position: 'fixed',
        top: 0,
        left: `${windowSize.width}px`,
        width: `${windowSize.height}px`,
        height: `${windowSize.width}px`,
        transform: 'rotate(90deg)',
        transformOrigin: 'top left',
        overflow: 'hidden',
        zIndex: 50,
      }
    : {
        width: '100%',
        height: '100%',
      };

  return (
    <div
      style={containerStyle}
      className={`flex flex-col justify-between relative select-none overflow-hidden ${bgTheme.backgroundClass}`}
    >
      {/* Telefonni yonboshga burish haqida yengil xabarnoma */}
      {showRotationHint && applyRotation && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-40 bg-stone-900/95 border border-amber-500/80 px-3 py-1 rounded-full shadow-2xl flex items-center gap-2 text-[11px] font-bold text-amber-200 animate-pulse">
          <span>🔄</span>
          <span>Telefoningizni yonboshga (albom holatida) ushlang</span>
        </div>
      )}

      {/* 1. Yuqori Asboblar Paneli */}
      <div className="flex items-center justify-between px-3 py-1.5 z-30 bg-stone-950/70 backdrop-blur-md border-b border-stone-800 shrink-0">
        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1 text-xs text-amber-300 font-bold px-2 py-1 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Chiqish</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] text-amber-400/80 uppercase tracking-widest font-serif block">
            {tableState.settings.gameType === 'BURA'
              ? (tableState.settings.rules === 'SIX_CARDS' ? '6 Talik Qaytarma' : '4 Talik Bura')
              : tableState.settings.gameType === 'ONE_HUNDRED_EIGHT'
              ? '108 O\'yini'
              : 'Durak'}
          </span>
          <span className="text-xs font-black text-amber-200">
            {tableState.settings.rules}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Albom / Portret tugmasi (telefon vertikal turganda qulay almashtirish uchun) */}
          {isPhysicallyPortrait && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsForcedLandscape((prev) => !prev);
              }}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 active:scale-95 transition shadow"
              title={isForcedLandscape ? "Portretga qaytish" : "Albom rejimiga o'tish"}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isForcedLandscape ? 'Portret' : 'Albom'}</span>
            </button>
          )}

          {tableState.lastTrick && tableState.status === 'PLAYING' && (
            <button
              onClick={() => setShowLastTrick(true)}
              className="p-1.5 rounded-xl bg-stone-900 text-stone-300 hover:text-amber-300 border border-stone-800"
              title="Oxirgi vzyatka"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setPref('sound', !sound)}
            className="p-1.5 rounded-xl bg-stone-900 text-stone-300 hover:text-amber-300 border border-stone-800"
            title={sound ? "Ovozni o'chirish" : 'Ovozni yoqish'}
          >
            {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsRulesOpen(true)}
            className="p-1.5 rounded-xl bg-stone-900 text-stone-300 hover:text-amber-300 border border-stone-800"
            title="Qoidalar"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="p-1.5 rounded-xl bg-stone-900 text-stone-300 hover:text-amber-300 border border-stone-800"
            title="Dizayn va Ranglar"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsChatOpen(true)}
            className="p-1.5 rounded-xl bg-stone-900 text-amber-300 border border-stone-800 relative"
          >
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Xontaxta Stol Maydoni */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-1 sm:p-2 relative overflow-hidden">
        {topSeats.length > 0 && (
          <div className="w-full flex justify-around items-start mb-1 shrink-0">
            {topSeats.map((player) => renderSeat(player, 'top'))}
          </div>
        )}

        <div className="flex-1 min-h-0 w-full flex items-center justify-between gap-1">
          <div className="shrink-0 flex items-center">{leftSeat && renderSeat(leftSeat, 'left')}</div>
          <div className="flex-1 min-w-0 h-full flex flex-col items-center justify-center">

        {/* Xontaxta Markazi */}
        {tableState.status === 'WAITING' ? (
          <div className="bg-stone-900/95 border-2 border-amber-500 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center gap-2.5 max-w-xs z-30 my-auto">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs sm:text-sm font-black text-amber-100">
                Do'stlar Kutilmoqda ({tableState.players.length}/{tableState.settings.maxPlayers})
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-300">
              Stol kodi: <b className="text-amber-300 font-mono">#{tableState.roomId}</b>
            </p>
            <div className="flex flex-col w-full gap-2 pt-1">
              {onOpenInviteFriends && (
                <button
                  onClick={onOpenInviteFriends}
                  className="w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-xs shadow hover:brightness-110 active:scale-95 transition"
                >
                  Do'stlarni Taklif Qilish
                </button>
              )}
              {onStartWithBots && tableState.players[0]?.id === currentUserId && tableState.players.length < tableState.settings.maxPlayers && (
                <button
                  onClick={onStartWithBots}
                  className="w-full py-1.5 sm:py-2 rounded-xl bg-stone-800 border border-stone-700 text-amber-300 font-bold text-xs hover:bg-stone-700 active:scale-95 transition"
                >
                  Qolgan o'rinlarga bot qo'shib boshlash
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center my-auto w-full">
            <TableCenter
              gameType={tableState.settings.gameType}
              deckCount={tableState.deckCount}
              trumpCard={tableState.trumpCard}
              trumpSuit={tableState.trumpSuit}
              activeSuit={tableState.activeSuit}
              tableCards={tableState.tableCards}
              themeId={currentThemeId}
              cardBackId={currentCardBackId}
              pendingPenaltyCount={pendingPenaltyCount}
              isLastTrumpRevealed={tableState.isLastTrumpRevealed}
              revealedTrumpCard={tableState.revealedTrumpCard}
              eggMultiplier={tableState.eggMultiplier}
              dealerName={tableState.players.find((p) => p.id === tableState.dealerId)?.username}
              targetableIds={targetableIds}
              onSelectTrickCard={handleSelectTrickCard}
            />

            {/* Navbat bildirishnomasi */}
            <div className="mt-0.5 text-center shrink-0">
              {isMyTurn ? (
                <span className="px-3 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-[11px] font-black shadow-lg animate-bounce">
                  Sizning navbatingiz!{secondsLeft !== null && ` (${secondsLeft}s)`}
                </span>
              ) : (
                <span className={`text-[11px] font-semibold ${secondsLeft !== null && secondsLeft <= 5 ? 'text-rose-300' : 'text-stone-400'}`}>
                  {activePlayer ? `${activePlayer.username} o'ylamoqda...` : 'Kutilmoqda...'}
                  {secondsLeft !== null && ` ${secondsLeft}s`}
                </span>
              )}
              {targetableIds && targetableIds.size > 0 && (
                <span className="block text-[10px] text-emerald-300 mt-0.5">Stoldagi yashil kartani bosib aynan uni uring</span>
              )}
            </div>
          </div>
        )}
          </div>
          <div className="shrink-0 flex items-center">{rightSeat && renderSeat(rightSeat, 'right')}</div>
        </div>
      </div>

      {/* 3. O'yinchi O'rindig'i va Qo'lidagi Kartalar (Ekranning pastida 100% mustahkam ko'rinadi) */}
      {isLandscapeMode ? (
        <div className="w-full flex items-end justify-between px-2 sm:px-4 z-20 shrink-0 pb-1">
          {/* Chap burchakda: O'yinchi Profili (Siz) */}
          <div className="shrink-0 mb-0.5">
            <PlayerSeat
              player={me}
              position="bottom"
              isCurrentPlayer={true}
              timerFraction={isMyTurn ? timerFraction : null}
              isDealer={tableState.dealerId === currentUserId}
              cardBackId={currentCardBackId}
              gameType={tableState.settings.gameType}
              compact={true}
            />
          </div>

          {/* Markazda: Qo'ldagi kartalar va uning ustidagi harakat tugmalari */}
          <div className="flex-1 flex flex-col items-center max-w-lg mx-auto">
            <CardHand
              hand={hand}
              selectedCardIds={selectedCardIds}
              isMyTurn={canPlayNow}
              onToggleCard={handleToggleCard}
              onPlaySelected={handlePlaySelected}
              onDrawCard={tableState.settings.gameType === 'ONE_HUNDRED_EIGHT' ? handleDrawCard : undefined}
              onPassOrFold={handlePassOrFold}
              onTakeCards={handleTakeCards}
              onOpenSpecialModal={() => setIsSpecialModalOpen(true)}
              gameType={tableState.settings.gameType}
              isDefender={isDefender}
              tableCardsCount={tableState.tableCards.length}
              hasSpecialHands={availableCombinations.length > 0}
              pendingPenaltyCount={pendingPenaltyCount}
              cardBackId={currentCardBackId}
              compact={true}
              playableHint={playableHint}
              onHint={onRequestHint}
            />
          </div>

          {/* O'ng burchakda: Balans ushlab turuvchi bo'sh joy */}
          <div className="shrink-0 w-12 sm:w-20 pointer-events-none" />
        </div>
      ) : (
        <div className="w-full flex flex-col items-center z-20 shrink-0 pb-2">
          <PlayerSeat
            player={me}
            position="bottom"
            isCurrentPlayer={true}
            timerFraction={isMyTurn ? timerFraction : null}
            isDealer={tableState.dealerId === currentUserId}
            cardBackId={currentCardBackId}
            gameType={tableState.settings.gameType}
            compact={false}
          />
          <CardHand
            hand={hand}
            selectedCardIds={selectedCardIds}
            isMyTurn={canPlayNow}
            onToggleCard={handleToggleCard}
            onPlaySelected={handlePlaySelected}
            onDrawCard={tableState.settings.gameType === 'ONE_HUNDRED_EIGHT' ? handleDrawCard : undefined}
            onPassOrFold={handlePassOrFold}
            onTakeCards={handleTakeCards}
            onOpenSpecialModal={() => setIsSpecialModalOpen(true)}
            gameType={tableState.settings.gameType}
            isDefender={isDefender}
            tableCardsCount={tableState.tableCards.length}
            hasSpecialHands={availableCombinations.length > 0}
            pendingPenaltyCount={pendingPenaltyCount}
            cardBackId={currentCardBackId}
            compact={false}
            playableHint={playableHint}
            onHint={onRequestHint}
          />
        </div>
      )}

      {/* MODALLAR */}
      <SpecialHandModal
        combinations={availableCombinations}
        isOpen={isSpecialModalOpen}
        onClose={() => setIsSpecialModalOpen(false)}
        onDeclare={handleDeclareCombination}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} initialGame={tableState.settings.gameType} />

      {/* Oxirgi vzyatkani ko'rish */}
      {showLastTrick && tableState.lastTrick && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowLastTrick(false)}>
          <div className="bg-stone-900/95 border-2 border-amber-500 rounded-3xl p-4 flex flex-col items-center gap-2 anim-pop">
            <span className="text-xs font-black text-amber-200">
              Oxirgi vzyatka: {tableState.players.find((p) => p.id === tableState.lastTrick!.winnerId)?.username}
            </span>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
              {tableState.lastTrick.cards.map((tc, i) => (
                <div key={i} className="relative">
                  <PlayingCard card={tc.card} isFaceDown={tc.isFaceDown} cardBackId={currentCardBackId} size="sm" />
                  {tc.beatenBy && tc.beatenBy.id !== tc.card.id && (
                    <div className="absolute top-1 left-1.5 rotate-3">
                      <PlayingCard card={tc.beatenBy} size="sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="text-[10px] text-stone-400">Yopish uchun bosing</span>
          </div>
        </div>
      )}

      <SuitSelectorModal
        isOpen={isSuitModalOpen}
        onSelectSuit={handleSelectSuit}
      />

      <ThemeSelectorModal
        currentThemeId={currentThemeId}
        currentBgId={currentBgId}
        currentCardBackId={currentCardBackId}
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        onSelectTheme={onSelectTheme}
        onSelectBg={onSelectBg}
        onSelectCardBack={onSelectCardBack}
      />

      <InGameChat
        messages={chatMessages}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSendMessage={onSendChatMessage}
        cooldownSeconds={chatCooldown}
      />

      {/* Raund Yakuni va Kartalarni Ochiq Sanash Modali */}
      {tableState.roundSummary ? (
        <RoundSummaryModal
          roundSummary={tableState.roundSummary}
          currentUserId={currentUserId}
          gameType={tableState.settings.gameType}
          onReadyNext={onReadyNextRound}
          onLeaveRoom={onLeaveRoom}
        />
      ) : (
        (tableState.status === 'ROUND_OVER' || tableState.status === 'GAME_OVER') && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-stone-900 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-3">
              <span className="text-4xl animate-bounce">🏆</span>
              <h2 className="text-xl font-black text-amber-200 font-serif">
                {tableState.status === 'GAME_OVER' ? "Partiya Yakunlandi!" : "Raund Tugadi!"}
              </h2>
              <p className="text-sm text-stone-300">
                G'olib:{' '}
                <b className="text-amber-400">
                  {tableState.players.find((p) => p.id === tableState.winnerId)?.username || 'Noma\'lum'}
                </b>
              </p>
              <button
                onClick={onLeaveRoom}
                className="mt-3 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-sm shadow hover:brightness-110"
              >
                Asosiy Menyuga Qaytish
              </button>
            </div>
          </div>
        )
      )}
      {/* Maxsus Kombinatsiya Ochilganda Barcha O'yinchilarga Ko'rinadigan Qalqib Chiquvchi Banner */}
      {showAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm bg-stone-900/95 border-2 border-amber-400 rounded-3xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center text-center gap-3 relative">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-inner animate-pulse">
              {currentAlert.type === 'MOSKVA' ? '👑' : currentAlert.type === 'BURA' ? '🔥' : currentAlert.type === 'MOLODKA' ? '🔨' : '⚡'}
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                {currentAlert.playerName} kombinatsiya ochdi!
              </span>
              <h3 className="text-xl font-black text-white font-serif drop-shadow mt-1">
                {currentAlert.title}
              </h3>
              <p className="text-xs text-stone-300 mt-1 max-w-[260px] leading-relaxed">
                {currentAlert.description}
              </p>
            </div>

            {/* Ochilgan 4 ta karta barchaga yaqqol ko'rinishi */}
            {currentAlert.cards && currentAlert.cards.length > 0 && (
              <div className="flex items-center justify-center gap-2 my-2 p-2.5 bg-black/60 rounded-2xl border border-amber-500/40 shadow-inner">
                {currentAlert.cards.map((c) => (
                  <div key={c.id} className="transition-transform hover:scale-105 shadow-xl">
                    <PlayingCard card={c} size="md" />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setDismissedAlertTimestamp(currentAlert.timestamp)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-stone-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition"
            >
              Tushunarli
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
