import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, sanitizeRoomId } from '../firebase';
import {
  AgeLevel,
  CategoryId,
  ChampionWinner,
  CharacterId,
  FamilyRoom,
  HallOfChampionsEntry,
  Player,
  Question,
  RewardConfig,
  RoundStatus,
  VoiceMessageDoc,
  VoiceTone,
} from '../types';
import { DEFAULT_PIN, DEFAULT_REWARD_CONFIG } from './storage';

export const MAX_ROOM_PLAYERS = 10;
export const DEFAULT_MIN_PLAYERS = 3;
export const DEFAULT_ROUND_DURATION_SEC = 60;
export const COUNTDOWN_DURATION_MS = 3800; // 3.. 2.. 1.. انطلق!
export const DEFAULT_ROOM_CODE = 'ATEEG2026';
export const BOOTSTRAPPED_ADMIN_EMAIL = 'ateegz37@gmail.com';

// Estimated local clock minus Firestore server clock (ms) so all devices count down in lockstep
let clockOffsetMs = 0;

export function calibrateServerClock(serverTimestampMs: number): void {
  if (!Number.isFinite(serverTimestampMs) || serverTimestampMs <= 0) return;
  const sampleOffset = Date.now() - serverTimestampMs;
  // Reject stale documents older than 15 seconds when calibrating
  if (Math.abs(sampleOffset) < 15_000 || clockOffsetMs === 0) {
    // Only accept large offsets if fresh write; smooth small offsets
    if (Math.abs(sampleOffset) < 60_000) {
      clockOffsetMs = sampleOffset;
    }
  }
}

export function getSyncedNowMs(): number {
  return Date.now() - clockOffsetMs;
}

export function isUserRoomAdmin(user: User | null, room: FamilyRoom | null): boolean {
  if (!user || !user.emailVerified) return false;
  if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) return true;
  if (room && room.ownerUid === user.uid) return true;
  return false;
}

function mapRoomDoc(d: Record<string, unknown>): FamilyRoom {
  const statusRaw = String(d.roundStatus ?? 'lobby');
  const roundStatus: RoundStatus =
    statusRaw === 'countdown' || statusRaw === 'playing' || statusRaw === 'results'
      ? statusRaw
      : 'lobby';

  return {
    roomId: String(d.roomId ?? ''),
    roomCode: String(d.roomCode ?? DEFAULT_ROOM_CODE),
    familyName: String(d.familyName ?? 'تحدي أبطال عائلة عتيق'),
    ownerUid: String(d.ownerUid ?? ''),
    parentPin: String(d.parentPin ?? DEFAULT_PIN),
    seasonNumber: Number(d.seasonNumber ?? 1),
    roundStatus,
    roundNumber: Math.max(1, Number(d.roundNumber ?? 1)),
    minPlayersToStart: Math.min(10, Math.max(1, Number(d.minPlayersToStart ?? DEFAULT_MIN_PLAYERS))),
    roundDurationSeconds: Math.min(
      300,
      Math.max(20, Number(d.roundDurationSeconds ?? DEFAULT_ROUND_DURATION_SEC))
    ),
    countdownEndAtMs: Math.max(0, Number(d.countdownEndAtMs ?? 0)),
    roundEndAtMs: Math.max(0, Number(d.roundEndAtMs ?? 0)),
    rewardConfig: {
      mode: d.rewardMode === 'podium' ? 'podium' : 'points',
      currency: String(d.currency ?? DEFAULT_REWARD_CONFIG.currency),
      firstPrize: Number(d.firstPrize ?? DEFAULT_REWARD_CONFIG.firstPrize),
      secondPrize: Number(d.secondPrize ?? DEFAULT_REWARD_CONFIG.secondPrize),
      thirdPrize: Number(d.thirdPrize ?? DEFAULT_REWARD_CONFIG.thirdPrize),
      pointsStep: Number(d.pointsStep ?? DEFAULT_REWARD_CONFIG.pointsStep),
      cashPerStep: Number(d.cashPerStep ?? DEFAULT_REWARD_CONFIG.cashPerStep),
      targetTrackPoints: Number(
        d.targetTrackPoints ?? DEFAULT_REWARD_CONFIG.targetTrackPoints
      ),
    },
  };
}

export async function ensureAndJoinRoom(params: {
  roomCode: string;
  user: User;
  playerId: string;
  name: string;
  character: CharacterId;
  level: AgeLevel;
}): Promise<{ roomId: string; room: FamilyRoom; playerId: string }> {
  const rawTrimmed = params.roomCode.trim().slice(0, 24);
  const displayCode = rawTrimmed.length >= 2 ? rawTrimmed : DEFAULT_ROOM_CODE;
  const roomId = sanitizeRoomId(displayCode);
  const roomPath = `rooms/${roomId}`;
  const roomRef = doc(db, 'rooms', roomId);

  let roomData: FamilyRoom;
  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) {
      const payload = {
        roomId,
        roomCode: displayCode,
        familyName: 'تحدي أبطال عائلة عتيق',
        ownerUid: params.user.uid,
        parentPin: DEFAULT_PIN,
        rewardMode: DEFAULT_REWARD_CONFIG.mode,
        currency: DEFAULT_REWARD_CONFIG.currency,
        firstPrize: DEFAULT_REWARD_CONFIG.firstPrize,
        secondPrize: DEFAULT_REWARD_CONFIG.secondPrize,
        thirdPrize: DEFAULT_REWARD_CONFIG.thirdPrize,
        pointsStep: DEFAULT_REWARD_CONFIG.pointsStep,
        cashPerStep: DEFAULT_REWARD_CONFIG.cashPerStep,
        targetTrackPoints: DEFAULT_REWARD_CONFIG.targetTrackPoints,
        seasonNumber: 1,
        roundStatus: 'lobby' as RoundStatus,
        roundNumber: 1,
        minPlayersToStart: DEFAULT_MIN_PLAYERS,
        roundDurationSeconds: DEFAULT_ROUND_DURATION_SEC,
        countdownEndAtMs: 0,
        roundEndAtMs: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(roomRef, payload);
      roomData = {
        roomId,
        roomCode: displayCode,
        familyName: 'تحدي أبطال عائلة عتيق',
        ownerUid: params.user.uid,
        parentPin: DEFAULT_PIN,
        rewardConfig: { ...DEFAULT_REWARD_CONFIG },
        seasonNumber: 1,
        roundStatus: 'lobby',
        roundNumber: 1,
        minPlayersToStart: DEFAULT_MIN_PLAYERS,
        roundDurationSeconds: DEFAULT_ROUND_DURATION_SEC,
        countdownEndAtMs: 0,
        roundEndAtMs: 0,
      };
    } else {
      roomData = mapRoomDoc(snap.data());
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, roomPath);
  }

  // Join or rejoin player while preserving existing cumulative points!
  let effectivePlayerId =
    params.playerId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) ||
    `hero_${params.user.uid.slice(0, 6)}_${Math.random().toString(36).slice(2, 6)}`;
  let playerPath = `rooms/${roomId}/players/${effectivePlayerId}`;
  let playerRef = doc(db, 'rooms', roomId, 'players', effectivePlayerId);
  const cleanName = params.name.trim().slice(0, 24) || 'بطل عتيق';

  try {
    let existingPlayerSnap = await getDoc(playerRef);
    if (
      existingPlayerSnap.exists() &&
      String(existingPlayerSnap.data().ownerUid ?? '') !== params.user.uid
    ) {
      effectivePlayerId = `hero_${params.user.uid.slice(0, 8)}_${Math.random().toString(36).slice(2, 6)}`;
      playerPath = `rooms/${roomId}/players/${effectivePlayerId}`;
      playerRef = doc(db, 'rooms', roomId, 'players', effectivePlayerId);
      existingPlayerSnap = await getDoc(playerRef);
    }

    if (existingPlayerSnap.exists()) {
      await updateDoc(playerRef, {
        name: cleanName,
        character: params.character,
        level: params.level,
        lastActiveMs: Date.now(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const playersQ = query(
        collection(db, 'rooms', roomId, 'players'),
        where('roomId', '==', roomId)
      );
      const allSnap = await getDocs(playersQ);
      if (allSnap.size >= MAX_ROOM_PLAYERS) {
        throw new Error('ROOM_FULL');
      }

      await setDoc(playerRef, {
        id: effectivePlayerId,
        roomId,
        ownerUid: params.user.uid,
        name: cleanName,
        character: params.character,
        level: params.level,
        points: 0,
        roundsPlayed: 0,
        totalCorrect: 0,
        currentRoundNumber: 0,
        currentRoundPoints: 0,
        currentRoundCorrect: 0,
        readyForRound: 0,
        lastActiveMs: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Calibrate server clock using our freshly written player doc
    try {
      const fresh = await getDoc(playerRef);
      const ts = fresh.data()?.updatedAt;
      if (ts && typeof ts.toMillis === 'function') {
        clockOffsetMs = Date.now() - ts.toMillis();
      }
    } catch {
      // non-fatal
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'ROOM_FULL') {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, playerPath);
  }

  return { roomId, room: roomData, playerId: effectivePlayerId };
}

export function subscribeToRoom(
  roomId: string,
  onRoom: (room: FamilyRoom | null) => void,
  onError: (err: unknown) => void
): () => void {
  const path = `rooms/${roomId}`;
  return onSnapshot(
    doc(db, 'rooms', roomId),
    (snap) => {
      if (!snap.exists()) {
        onRoom(null);
        return;
      }
      onRoom(mapRoomDoc(snap.data()));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeToPlayers(
  roomId: string,
  onPlayers: (players: Player[]) => void,
  onError: (err: unknown) => void
): () => void {
  const path = `rooms/${roomId}/players`;
  const q = query(collection(db, 'rooms', roomId, 'players'), where('roomId', '==', roomId));
  return onSnapshot(
    q,
    (snap) => {
      const list: Player[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id ?? docSnap.id),
          ownerUid: String(d.ownerUid ?? ''),
          name: String(d.name ?? 'بطل'),
          character: (d.character as CharacterId) ?? 'geekboy',
          level: (Number(d.level) as AgeLevel) || 1,
          points: Number(d.points ?? 0),
          roundsPlayed: Number(d.roundsPlayed ?? 0),
          totalCorrect: Number(d.totalCorrect ?? 0),
          currentRoundNumber: Number(d.currentRoundNumber ?? 0),
          currentRoundPoints: Number(d.currentRoundPoints ?? 0),
          currentRoundCorrect: Number(d.currentRoundCorrect ?? 0),
          readyForRound: Number(d.readyForRound ?? 0),
          lastActiveMs: Number(d.lastActiveMs ?? 0),
        };
      });
      list.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'ar'));
      onPlayers(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeToVoiceMessages(
  roomId: string,
  onMessages: (msgs: VoiceMessageDoc[]) => void,
  onError: (err: unknown) => void
): () => void {
  const path = `rooms/${roomId}/voiceMessages`;
  const q = query(
    collection(db, 'rooms', roomId, 'voiceMessages'),
    where('roomId', '==', roomId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const msgs: VoiceMessageDoc[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdAtMs =
          d.createdAt && typeof d.createdAt.toMillis === 'function'
            ? d.createdAt.toMillis()
            : Date.now();
        return {
          id: String(d.id ?? docSnap.id),
          roomId: String(d.roomId ?? roomId),
          senderUid: String(d.senderUid ?? ''),
          playerId: String(d.playerId ?? ''),
          playerName: String(d.playerName ?? ''),
          tone: (d.tone as VoiceTone) ?? 'normal',
          phrase: String(d.phrase ?? 'هيا يا أبطال!'),
          mimeType: String(d.mimeType ?? 'audio/webm'),
          audioBase64: String(d.audioBase64 ?? ''),
          durationMs: Number(d.durationMs ?? 2000),
          createdAtMs,
        };
      });
      msgs.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onMessages(msgs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeToCustomQuestions(
  roomId: string,
  onQuestions: (questions: Question[]) => void,
  onError: (err: unknown) => void
): () => void {
  const path = `rooms/${roomId}/customQuestions`;
  const q = query(
    collection(db, 'rooms', roomId, 'customQuestions'),
    where('roomId', '==', roomId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: Question[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const opts = Array.isArray(d.options) ? d.options.map(String) : ['', '', '', ''];
        return {
          id: String(d.id ?? docSnap.id),
          category: (d.category as CategoryId) ?? 'math',
          level: (Number(d.level) as AgeLevel) || 1,
          prompt: String(d.prompt ?? ''),
          visualEmoji: d.visualEmoji ? String(d.visualEmoji) : undefined,
          options: [opts[0] ?? '', opts[1] ?? '', opts[2] ?? '', opts[3] ?? ''],
          correctIndex: Number(d.correctIndex ?? 0),
          fact: d.fact ? String(d.fact) : undefined,
          isCustom: true,
        };
      });
      onQuestions(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

export function subscribeToChampions(
  roomId: string,
  onChampions: (entries: HallOfChampionsEntry[]) => void,
  onError: (err: unknown) => void
): () => void {
  const path = `rooms/${roomId}/champions`;
  const q = query(
    collection(db, 'rooms', roomId, 'champions'),
    where('roomId', '==', roomId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: HallOfChampionsEntry[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id ?? docSnap.id),
          seasonNumber: Number(d.seasonNumber ?? 1),
          dateIso: String(d.dateIso ?? new Date().toISOString()),
          currency: String(d.currency ?? 'ريال'),
          rewardMode: d.rewardMode === 'podium' ? 'podium' : 'points',
          winners: Array.isArray(d.winners) ? (d.winners as ChampionWinner[]) : [],
        };
      });
      list.sort((a, b) => (b.seasonNumber ?? 0) - (a.seasonNumber ?? 0));
      onChampions(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped);
      }
    }
  );
}

// =========================================================================
// Synchronized Live Round State Machine Transactions
// =========================================================================

/**
 * Atomically starts the shared 3.. 2.. 1.. GO! countdown and schedules the exact 60s round window.
 * Idempotent via Firestore transaction so concurrent clients never double-start.
 */
export async function startSynchronizedCountdown(params: {
  roomId: string;
  expectedStatus: 'lobby' | 'results';
  forceFromAnyStatus?: boolean;
}): Promise<boolean> {
  const roomRef = doc(db, 'rooms', params.roomId);
  try {
    let started = false;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = mapRoomDoc(snap.data());
      if (!params.forceFromAnyStatus && room.roundStatus !== params.expectedStatus) {
        return;
      }

      const nextRoundNumber =
        room.roundStatus === 'results' || (params.forceFromAnyStatus && room.roundStatus === 'playing')
          ? room.roundNumber + 1
          : room.roundNumber;

      const syncedNow = getSyncedNowMs();
      const countdownEndAtMs = syncedNow + COUNTDOWN_DURATION_MS;
      const roundEndAtMs = countdownEndAtMs + room.roundDurationSeconds * 1000;

      tx.update(roomRef, {
        roundStatus: 'countdown',
        roundNumber: nextRoundNumber,
        countdownEndAtMs,
        roundEndAtMs,
        updatedAt: serverTimestamp(),
      });
      started = true;
    });
    return started;
  } catch (err) {
    // Non-fatal on contention; another device may have transitioned simultaneously
    console.warn('startSynchronizedCountdown skipped/retried:', err);
    return false;
  }
}

export async function markRoomPlaying(roomId: string, roundNumber: number): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = mapRoomDoc(snap.data());
      if (room.roundStatus !== 'countdown' || room.roundNumber !== roundNumber) return;
      tx.update(roomRef, {
        roundStatus: 'playing',
        updatedAt: serverTimestamp(),
      });
    });
  } catch {
    // Non-fatal contention
  }
}

export async function finishSynchronizedRound(roomId: string, roundNumber: number): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = mapRoomDoc(snap.data());
      if (
        (room.roundStatus !== 'playing' && room.roundStatus !== 'countdown') ||
        room.roundNumber !== roundNumber
      ) {
        return;
      }
      tx.update(roomRef, {
        roundStatus: 'results',
        updatedAt: serverTimestamp(),
      });
    });
  } catch {
    // Non-fatal contention
  }
}

export async function resetRoomToLobby(roomId: string): Promise<void> {
  const path = `rooms/${roomId}`;
  try {
    await runTransaction(db, async (tx) => {
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const room = mapRoomDoc(snap.data());
      tx.update(roomRef, {
        roundStatus: 'lobby',
        roundNumber: room.roundNumber + 1,
        countdownEndAtMs: 0,
        roundEndAtMs: 0,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function setPlayerReadyForNextRound(
  roomId: string,
  playerId: string,
  readyRoundNumber: number
): Promise<void> {
  const path = `rooms/${roomId}/players/${playerId}`;
  try {
    await updateDoc(doc(db, 'rooms', roomId, 'players', playerId), {
      readyForRound: Math.max(0, Math.round(readyRoundNumber)),
      lastActiveMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Resets this player's own per-round counter when a fresh synchronized round begins.
 */
export async function preparePlayerForRound(
  roomId: string,
  playerId: string,
  roundNumber: number
): Promise<void> {
  const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists()) return;
      const d = snap.data();
      if (Number(d.currentRoundNumber ?? 0) === roundNumber) return;
      tx.update(playerRef, {
        currentRoundNumber: roundNumber,
        currentRoundPoints: 0,
        currentRoundCorrect: 0,
        roundsPlayed: increment(1),
        lastActiveMs: Date.now(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch {
    // non-fatal
  }
}

/**
 * Records a live sprint correct answer: updates BOTH cumulative total points and current round points atomically!
 */
export async function recordSprintAnswer(params: {
  roomId: string;
  playerId: string;
  roundNumber: number;
  pointsDelta: number;
}): Promise<void> {
  const path = `rooms/${params.roomId}/players/${params.playerId}`;
  const playerRef = doc(db, 'rooms', params.roomId, 'players', params.playerId);
  const safeDelta = Math.max(0, Math.round(params.pointsDelta));

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists()) return;
      const d = snap.data();
      const prevRoundNum = Number(d.currentRoundNumber ?? 0);
      const isSameRound = prevRoundNum === params.roundNumber;

      tx.update(playerRef, {
        points: Number(d.points ?? 0) + safeDelta,
        totalCorrect: Number(d.totalCorrect ?? 0) + 1,
        roundsPlayed: isSameRound ? Number(d.roundsPlayed ?? 0) : Number(d.roundsPlayed ?? 0) + 1,
        currentRoundNumber: params.roundNumber,
        currentRoundPoints: isSameRound ? Number(d.currentRoundPoints ?? 0) + safeDelta : safeDelta,
        currentRoundCorrect: isSameRound ? Number(d.currentRoundCorrect ?? 0) + 1 : 1,
        lastActiveMs: Date.now(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updatePlayerHeartbeat(roomId: string, playerId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'rooms', roomId, 'players', playerId), {
      lastActiveMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Heartbeat failures are non-fatal
  }
}

export async function editPlayerProfile(
  roomId: string,
  playerId: string,
  updates: { name: string; character: CharacterId; level: AgeLevel }
): Promise<void> {
  const path = `rooms/${roomId}/players/${playerId}`;
  try {
    await updateDoc(doc(db, 'rooms', roomId, 'players', playerId), {
      name: updates.name.trim().slice(0, 24),
      character: updates.character,
      level: updates.level,
      lastActiveMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function removeRoomPlayer(roomId: string, playerId: string): Promise<void> {
  const path = `rooms/${roomId}/players/${playerId}`;
  try {
    await deleteDoc(doc(db, 'rooms', roomId, 'players', playerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function updateRoomRewardConfig(
  roomId: string,
  config: RewardConfig
): Promise<void> {
  const path = `rooms/${roomId}`;
  try {
    await updateDoc(doc(db, 'rooms', roomId), {
      rewardMode: config.mode,
      currency: config.currency.trim().slice(0, 20) || 'ريال',
      firstPrize: Math.max(0, Number(config.firstPrize) || 0),
      secondPrize: Math.max(0, Number(config.secondPrize) || 0),
      thirdPrize: Math.max(0, Number(config.thirdPrize) || 0),
      pointsStep: Math.max(1, Number(config.pointsStep) || 100),
      cashPerStep: Math.max(0, Number(config.cashPerStep) || 0),
      targetTrackPoints: Math.max(100, Number(config.targetTrackPoints) || 1000),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateRoomMatchSettings(
  roomId: string,
  settings: { minPlayersToStart: number; roundDurationSeconds: number }
): Promise<void> {
  const path = `rooms/${roomId}`;
  try {
    await updateDoc(doc(db, 'rooms', roomId), {
      minPlayersToStart: Math.min(10, Math.max(1, Math.round(settings.minPlayersToStart))),
      roundDurationSeconds: Math.min(300, Math.max(20, Math.round(settings.roundDurationSeconds))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateRoomPin(roomId: string, newPin: string): Promise<void> {
  if (!/^\d{4}$/.test(newPin)) return;
  const path = `rooms/${roomId}`;
  try {
    await updateDoc(doc(db, 'rooms', roomId), {
      parentPin: newPin,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function addRoomCustomQuestion(
  roomId: string,
  authorUid: string,
  q: Omit<Question, 'id' | 'isCustom'>
): Promise<void> {
  const qId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `rooms/${roomId}/customQuestions/${qId}`;
  try {
    const payload: Record<string, unknown> = {
      id: qId,
      roomId,
      authorUid,
      category: q.category,
      level: q.level,
      prompt: q.prompt.trim().slice(0, 240),
      options: q.options.map((o) => o.trim().slice(0, 120)),
      correctIndex: q.correctIndex,
      createdAt: serverTimestamp(),
    };
    if (q.visualEmoji && q.visualEmoji.trim()) {
      payload.visualEmoji = q.visualEmoji.trim().slice(0, 16);
    }
    if (q.fact && q.fact.trim()) {
      payload.fact = q.fact.trim().slice(0, 240);
    }
    await setDoc(doc(db, 'rooms', roomId, 'customQuestions', qId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteRoomCustomQuestion(
  roomId: string,
  questionId: string
): Promise<void> {
  const path = `rooms/${roomId}/customQuestions/${questionId}`;
  try {
    await deleteDoc(doc(db, 'rooms', roomId, 'customQuestions', questionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function awardAndResetRoomSeason(params: {
  roomId: string;
  awardedByUid: string;
  room: FamilyRoom;
  players: Player[];
  winners: ChampionWinner[];
}): Promise<void> {
  const entryId = `season_${params.room.seasonNumber}_${Date.now()}`;
  const path = `rooms/${params.roomId}/champions/${entryId}`;
  try {
    const batch = writeBatch(db);

    // 1. Archive podium winners into Ateeg Hall of Champions
    if (params.winners.length > 0) {
      batch.set(doc(db, 'rooms', params.roomId, 'champions', entryId), {
        id: entryId,
        roomId: params.roomId,
        awardedByUid: params.awardedByUid,
        seasonNumber: params.room.seasonNumber,
        dateIso: new Date().toISOString(),
        currency: params.room.rewardConfig.currency,
        rewardMode: params.room.rewardConfig.mode,
        winners: params.winners.slice(0, 3),
        createdAt: serverTimestamp(),
      });
    }

    // 2. Increment season number and return room cleanly to lobby
    batch.update(doc(db, 'rooms', params.roomId), {
      seasonNumber: params.room.seasonNumber + 1,
      roundStatus: 'lobby',
      roundNumber: params.room.roundNumber + 1,
      countdownEndAtMs: 0,
      roundEndAtMs: 0,
      updatedAt: serverTimestamp(),
    });

    // 3. Reset all players' scores & per-round counters to 0 for the fresh season
    for (const p of params.players) {
      batch.update(doc(db, 'rooms', params.roomId, 'players', p.id), {
        points: 0,
        roundsPlayed: 0,
        totalCorrect: 0,
        currentRoundNumber: 0,
        currentRoundPoints: 0,
        currentRoundCorrect: 0,
        readyForRound: 0,
        lastActiveMs: Date.now(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType || 'audio/webm' });
}

export async function broadcastVoiceMessage(params: {
  roomId: string;
  senderUid: string;
  playerId: string;
  playerName: string;
  tone: VoiceTone;
  phrase: string;
  blob: Blob;
  durationMs: number;
}): Promise<string> {
  const audioBase64 = await blobToBase64(params.blob);
  if (audioBase64.length > 175000) {
    throw new Error('AUDIO_TOO_LARGE');
  }

  const msgId = `vm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `rooms/${params.roomId}/voiceMessages/${msgId}`;

  try {
    await setDoc(doc(db, 'rooms', params.roomId, 'voiceMessages', msgId), {
      id: msgId,
      roomId: params.roomId,
      senderUid: params.senderUid,
      playerId: params.playerId,
      playerName: params.playerName.trim().slice(0, 24),
      tone: params.tone,
      phrase: params.phrase.trim().slice(0, 40),
      mimeType: (params.blob.type || 'audio/webm').slice(0, 60),
      audioBase64,
      durationMs: Math.min(12000, Math.max(400, Math.round(params.durationMs))),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  return msgId;
}

export async function deleteVoiceMessageSafe(roomId: string, msgId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'rooms', roomId, 'voiceMessages', msgId));
  } catch {
    // Ignore if already deleted by another client
  }
}
