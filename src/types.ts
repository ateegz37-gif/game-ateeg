export type AgeLevel = 1 | 2 | 3;

export type CategoryId = 'math' | 'english' | 'science' | 'islamic';

export type CharacterId =
  | 'geekboy'
  | 'astronaut'
  | 'superhero'
  | 'dinosaur'
  | 'bee'
  | 'alien'
  | 'rabbit'
  | 'explorer'
  | 'rocket'
  | 'racecar'
  | 'jet'
  | 'unicorn'
  | 'speedboat'
  | 'train';

export type RewardMode = 'podium' | 'points';

export type VoiceTone = 'normal' | 'chipmunk' | 'robot';

export type RoundStatus = 'lobby' | 'countdown' | 'playing' | 'results';

export interface Player {
  id: string;
  ownerUid?: string;
  name: string;
  character: CharacterId;
  level: AgeLevel;
  points: number;
  roundsPlayed: number;
  totalCorrect: number;
  currentRoundNumber: number;
  currentRoundPoints: number;
  currentRoundCorrect: number;
  readyForRound: number;
  lastActiveMs?: number;
}

export interface RewardConfig {
  mode: RewardMode;
  currency: string;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  pointsStep: number; // e.g., every 100 points
  cashPerStep: number; // e.g., = 500 currency
  targetTrackPoints: number; // Points needed to reach 100% treasure chest
}

export interface FamilyRoom {
  roomId: string;
  roomCode: string;
  familyName: string;
  ownerUid: string;
  parentPin: string;
  rewardConfig: RewardConfig;
  seasonNumber: number;
  roundStatus: RoundStatus;
  roundNumber: number;
  minPlayersToStart: number;
  roundDurationSeconds: number;
  countdownEndAtMs: number;
  roundEndAtMs: number;
}

export interface VoiceMessageDoc {
  id: string;
  roomId: string;
  senderUid: string;
  playerId: string;
  playerName: string;
  tone: VoiceTone;
  phrase: string;
  mimeType: string;
  audioBase64: string;
  durationMs: number;
  createdAtMs: number;
}

export interface Question {
  id: string;
  category: CategoryId;
  level: AgeLevel;
  prompt: string;
  visualEmoji?: string;
  options: [string, string, string, string];
  correctIndex: number;
  fact?: string;
  isCustom?: boolean;
}

export interface ChampionWinner {
  rank: 1 | 2 | 3;
  name: string;
  character: CharacterId;
  level: AgeLevel;
  points: number;
  prizeAmount: number;
}

export interface HallOfChampionsEntry {
  id: string;
  seasonNumber?: number;
  dateIso: string;
  currency: string;
  rewardMode: RewardMode;
  winners: ChampionWinner[];
}

export interface ActiveCheer {
  playerId: string;
  playerName?: string;
  tone: VoiceTone;
  phrase: string;
  expiresAt: number;
}

export type AppView = 'join' | 'home' | 'champions' | 'parent';
