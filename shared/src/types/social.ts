import { GameType } from './game';
import { AchievementId, DailyView, GameHistoryEntry } from './progress';

export interface GameStats {
  played: number;
  won: number;
}

export interface UserProfile {
  id: string;
  telegramId?: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  ratingElo: number; // default: 1000
  gamesPlayed: number;
  gamesWon: number;
  vipStatus: boolean;
  vipExpiresAt?: number;
  clanId?: string;
  clanName?: string;
  customTitle?: string;
  // O'yin turi bo'yicha alohida reyting va statistika
  ratings?: Partial<Record<GameType, number>>;
  statsByGame?: Partial<Record<GameType, GameStats>>;
  achievements?: Partial<Record<AchievementId, number>>; // yutuq -> olingan vaqt
  daily?: DailyView;
  history?: GameHistoryEntry[];
  clan?: { id: string; name: string; tag: string };
  ownedItems?: string[];
  vipUntil?: number;
  bestStreak?: number;
}

export interface FriendItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  ratingElo: number;
  status: 'ONLINE' | 'OFFLINE' | 'IN_GAME';
  currentRoomId?: string;
}

export interface ClanItem {
  id: string;
  name: string; // Masalan: "Chig'atoy Mahallasi", "Samarqand Registon"
  tag: string; // [CHIG], [REG]
  leaderId: string;
  membersCount: number;
  totalElo: number;
  description: string;
  weeklyPoints?: number; // Joriy haftalik liga ochkolari
}

export interface ClanMember {
  id: string;
  displayName: string;
  ratingElo: number;
  isLeader: boolean;
}

export interface ClanDetail extends ClanItem {
  members: ClanMember[];
}

export interface OnlineUserInfo {
  id: string;
  telegramId?: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  ratingElo: number;
  status: 'ONLINE' | 'IN_GAME';
  currentRoomId?: string;
}

export interface TableInvitation {
  id: string;
  roomId: string;
  inviterId: string;
  inviterName: string;
  gameType: string;
  rules: string;
  totalPlayers: number;
  timestamp: number;
}

