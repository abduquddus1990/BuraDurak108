import { Card, Suit } from '../../../shared/src/types/card';
import { PlayerPrivate, RoomSettings, TableState, PlayedTrickCard, SpecialCombinationAlert } from '../../../shared/src/types/game';
import { createDeck36, shuffleDeck } from '../../../shared/src/utils/deck';

export abstract class BaseEngine {
  public roomId: string;
  public settings: RoomSettings;
  public deck: Card[] = [];
  public trumpSuit: Suit = 'SPADES';
  public trumpCard?: Card;
  public isLastTrumpRevealed: boolean = false;
  public revealedTrumpCard?: Card;
  public specialCombinationAlert?: SpecialCombinationAlert | null = null;
  public players: PlayerPrivate[] = [];
  public tableCards: PlayedTrickCard[] = [];
  public activePlayerIndex: number = 0;
  public status: 'WAITING' | 'PLAYING' | 'ROUND_OVER' | 'GAME_OVER' = 'WAITING';
  public winnerId?: string;
  public roundNumber: number = 1;
  public activeSuit?: Suit; // 108 da buyurtma qilingan mast

  constructor(roomId: string, settings: RoomSettings) {
    this.roomId = roomId;
    this.settings = settings;
  }

  public addPlayer(player: Omit<PlayerPrivate, 'hand' | 'score' | 'penaltyPoints' | 'isTurn' | 'isFolded' | 'ready' | 'cardsCount'>): boolean {
    if (this.players.length >= this.settings.maxPlayers) return false;
    this.players.push({
      ...player,
      hand: [],
      score: 0,
      penaltyPoints: 0,
      isTurn: false,
      isFolded: false,
      ready: false,
      cardsCount: 0,
    });
    return true;
  }

  public createAndShuffleDeck(): Card[] {
    return shuffleDeck(createDeck36());
  }

  public initGame(): void {
    this.deck = this.createAndShuffleDeck();
    this.trumpCard = this.deck[this.deck.length - 1];
    this.trumpSuit = this.trumpCard.suit;
    this.status = 'PLAYING';
    this.tableCards = [];
    this.roundNumber = 1;
    this.activePlayerIndex = 0;
  }

  public dealCardsToAll(count: number): void {
    this.dealCardsRoundRobin(count, 0);
  }

  public dealCardsRoundRobin(count: number, starterIndex: number = 0): void {
    let anyCardDealt = true;
    while (anyCardDealt && this.deck.length > 0) {
      anyCardDealt = false;
      for (let i = 0; i < this.players.length; i++) {
        const pIndex = (starterIndex + i) % this.players.length;
        const player = this.players[pIndex];
        if (player.hand.length < count && this.deck.length > 0) {
          const card = this.deck.shift();
          if (card) {
            player.hand.push(card);
            anyCardDealt = true;
          }
        }
      }
    }
    for (const player of this.players) {
      player.cardsCount = player.hand.length;
    }
  }

  public nextTurn(): void {
    let nextIndex = (this.activePlayerIndex + 1) % this.players.length;
    // Faol o'yinchini topish (o'yindan chiqmagan)
    let attempts = 0;
    while (this.players[nextIndex].isFolded && attempts < this.players.length) {
      nextIndex = (nextIndex + 1) % this.players.length;
      attempts++;
    }
    this.activePlayerIndex = nextIndex;
    this.updatePlayerTurns();
  }

  public updatePlayerTurns(): void {
    this.players.forEach((p, index) => {
      p.isTurn = index === this.activePlayerIndex && this.status === 'PLAYING';
      p.cardsCount = p.hand.length;
    });
  }

  public getTableState(): TableState {
    return {
      roomId: this.roomId,
      settings: this.settings,
      status: this.status,
      trumpSuit: this.trumpSuit,
      trumpCard: this.trumpCard,
      deckCount: this.deck.length,
      activePlayerIndex: this.activePlayerIndex,
      players: this.players.map(p => ({
        id: p.id,
        username: p.username,
        avatarUrl: p.avatarUrl,
        isBot: p.isBot,
        cardsCount: p.hand.length,
        score: p.score,
        penaltyPoints: p.penaltyPoints,
        isTurn: p.isTurn,
        isFolded: p.isFolded,
        ready: p.ready,
      })),
      tableCards: this.tableCards,
      activeSuit: this.activeSuit,
      winnerId: this.winnerId,
      roundNumber: this.roundNumber,
      isLastTrumpRevealed: this.isLastTrumpRevealed,
      revealedTrumpCard: this.revealedTrumpCard,
      specialCombinationAlert: this.specialCombinationAlert,
    };
  }

  // O'yin tugagach reyting/statistika uchun: kim yutdi va kim yutqazdi (qolganlar - betaraf)
  public getFinalResults(): { winners: string[]; losers: string[] } {
    if (!this.winnerId) return { winners: [], losers: [] };
    return {
      winners: [this.winnerId],
      losers: this.players.filter(p => p.id !== this.winnerId).map(p => p.id),
    };
  }

  public getPlayerHand(playerId: string): Card[] {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.hand : [];
  }
}
