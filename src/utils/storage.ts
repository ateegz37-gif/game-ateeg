import { HallOfChampionsEntry, Player, Question, RewardConfig } from '../types';

const STORAGE_KEYS = {
  PLAYERS: 'fc_players_v1',
  REWARDS: 'fc_rewards_v1',
  PIN: 'fc_parent_pin_v1',
  CUSTOM_QUESTIONS: 'fc_custom_questions_v1',
  CHAMPIONS: 'fc_hall_of_champions_v1',
  MUTED: 'fc_sound_muted_v1',
} as const;

export const DEFAULT_PLAYERS: Player[] = [
  {
    id: 'p-sara',
    name: 'سارة',
    character: 'bee',
    level: 1,
    points: 320,
    roundsPlayed: 1,
    totalCorrect: 6,
    currentRoundNumber: 0,
    currentRoundPoints: 0,
    currentRoundCorrect: 0,
    readyForRound: 0,
  },
  {
    id: 'p-salem',
    name: 'سالم',
    character: 'geekboy',
    level: 2,
    points: 540,
    roundsPlayed: 2,
    totalCorrect: 11,
    currentRoundNumber: 0,
    currentRoundPoints: 0,
    currentRoundCorrect: 0,
    readyForRound: 0,
  },
  {
    id: 'p-yousef',
    name: 'يوسف',
    character: 'astronaut',
    level: 3,
    points: 410,
    roundsPlayed: 1,
    totalCorrect: 7,
    currentRoundNumber: 0,
    currentRoundPoints: 0,
    currentRoundCorrect: 0,
    readyForRound: 0,
  },
];

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  mode: 'points',
  currency: 'ريال',
  firstPrize: 5000,
  secondPrize: 3000,
  thirdPrize: 1500,
  pointsStep: 100,
  cashPerStep: 500,
  targetTrackPoints: 1000,
};

export const DEFAULT_PIN = '1234';

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadPlayers(): Player[] {
  const saved = safeRead<Player[]>(STORAGE_KEYS.PLAYERS, DEFAULT_PLAYERS);
  return Array.isArray(saved) && saved.length >= 2 ? saved : DEFAULT_PLAYERS;
}

export function savePlayers(players: Player[]): void {
  safeWrite(STORAGE_KEYS.PLAYERS, players);
}

export function loadRewardConfig(): RewardConfig {
  const saved = safeRead<Partial<RewardConfig>>(STORAGE_KEYS.REWARDS, {});
  return { ...DEFAULT_REWARD_CONFIG, ...saved };
}

export function saveRewardConfig(config: RewardConfig): void {
  safeWrite(STORAGE_KEYS.REWARDS, config);
}

export function loadParentPin(): string {
  const saved = safeRead<string>(STORAGE_KEYS.PIN, DEFAULT_PIN);
  return typeof saved === 'string' && saved.length === 4 ? saved : DEFAULT_PIN;
}

export function saveParentPin(pin: string): void {
  safeWrite(STORAGE_KEYS.PIN, pin);
}

export function loadCustomQuestions(): Question[] {
  const saved = safeRead<Question[]>(STORAGE_KEYS.CUSTOM_QUESTIONS, []);
  return Array.isArray(saved) ? saved : [];
}

export function saveCustomQuestions(questions: Question[]): void {
  safeWrite(STORAGE_KEYS.CUSTOM_QUESTIONS, questions);
}

export function loadChampions(): HallOfChampionsEntry[] {
  const saved = safeRead<HallOfChampionsEntry[]>(STORAGE_KEYS.CHAMPIONS, []);
  return Array.isArray(saved) ? saved : [];
}

export function saveChampions(entries: HallOfChampionsEntry[]): void {
  safeWrite(STORAGE_KEYS.CHAMPIONS, entries);
}

export function loadMuted(): boolean {
  return safeRead<boolean>(STORAGE_KEYS.MUTED, false);
}

export function saveMuted(muted: boolean): void {
  safeWrite(STORAGE_KEYS.MUTED, muted);
}

/**
 * Returns players sorted by points descending, then totalCorrect descending.
 */
export function sortPlayersByRank(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.totalCorrect - a.totalCorrect;
  });
}

/**
 * Calculates each player's currently earned monetary reward based on the parent's reward configuration.
 */
export function calculatePlayerCash(
  player: Player,
  allPlayers: Player[],
  config: RewardConfig
): number {
  if (config.mode === 'points') {
    const step = Math.max(1, config.pointsStep);
    const raw = (player.points / step) * config.cashPerStep;
    return Math.round(raw * 100) / 100;
  }

  // Podium mode: Top 3 earn 1st / 2nd / 3rd prize if they have > 0 points
  if (player.points <= 0) return 0;
  const sorted = sortPlayersByRank(allPlayers);
  const rankIndex = sorted.findIndex((p) => p.id === player.id);
  if (rankIndex === 0) return config.firstPrize;
  if (rankIndex === 1) return config.secondPrize;
  if (rankIndex === 2) return config.thirdPrize;
  return 0;
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toFixed(1);
  return `${formatted} ${currency}`;
}
