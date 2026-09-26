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

