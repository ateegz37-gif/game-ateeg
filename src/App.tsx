import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Volume2, VolumeX, Mic, ShieldCheck, Wifi } from 'lucide-react';
import {
  ActiveCheer,
  AgeLevel,
  AppView,
  ChampionWinner,
  CharacterId,
  FamilyRoom,
  HallOfChampionsEntry,
  Player,
  Question,
  RewardConfig,
  RoundStatus,
  VoiceTone,
} from './types';
import { BUILT_IN_QUESTIONS } from './data/questions';
import { VOICE_TONES } from './data/characters';
import {
  calculatePlayerCash,
  loadMuted,
  saveMuted,
  sortPlayersByRank,
} from './utils/storage';
import { auth, signInWithGoogle, signOutUser } from './firebase';
import {
  addRoomCustomQuestion,
  awardAndResetRoomSeason,
  base64ToBlob,
  broadcastVoiceMessage,
  DEFAULT_ROOM_CODE,
  deleteRoomCustomQuestion,
  deleteVoiceMessageSafe,
  editPlayerProfile,
  ensureAndJoinRoom,
  finishSynchronizedRound,
  getSyncedNowMs,
  isUserRoomAdmin,
  markRoomPlaying,
  preparePlayerForRound,
  recordSprintAnswer,
  removeRoomPlayer,
  resetRoomToLobby,
  setPlayerReadyForNextRound,
  startSynchronizedCountdown,
  subscribeToChampions,
  subscribeToCustomQuestions,
  subscribeToPlayers,
  subscribeToRoom,
  subscribeToVoiceMessages,
  updatePlayerHeartbeat,
  updateRoomMatchSettings,
  updateRoomPin,
  updateRoomRewardConfig,
} from './utils/roomService';
import { soundEngine } from './utils/soundEngine';
import { LobbyScreen } from './components/LobbyScreen';
import { CountdownOverlay } from './components/CountdownOverlay';
import { LiveSprintRound } from './components/LiveSprintRound';
import { RoundResultsScreen } from './components/RoundResultsScreen';
import { VoiceWalkieTalkie } from './components/VoiceWalkieTalkie';
import { HallOfChampions } from './components/HallOfChampions';
import { ParentDashboard } from './components/ParentDashboard';
import { ConfettiBurst } from './components/ConfettiBurst';
import { EditPlayerModal } from './components/EditPlayerModal';
import { RoomJoinScreen, SavedLocalProfile } from './components/RoomJoinScreen';

const LOCAL_PROFILE_KEY = 'ateeg_online_profile_v1';
const ACTIVE_PLAYER_WINDOW_MS = 5 * 60 * 1000;

function loadSavedProfile(): SavedLocalProfile {
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedLocalProfile>;
      if (parsed.playerId) {
        return {
          playerId: parsed.playerId,
          name: parsed.name || '',
          character: parsed.character || 'geekboy',
          level: (parsed.level as AgeLevel) || 1,
          roomCode: parsed.roomCode || DEFAULT_ROOM_CODE,
        };
      }
    }
  } catch {
    // ignore
  }
  const freshId = `hero_${Math.random().toString(36).slice(2, 10)}`;
  return {
    playerId: freshId,
    name: '',
    character: 'geekboy',
    level: 1,
    roomCode: DEFAULT_ROOM_CODE,
  };
}

function saveLocalProfile(profile: SavedLocalProfile): void {
  try {
    window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [localProfile, setLocalProfile] = useState<SavedLocalProfile>(() => loadSavedProfile());

  const [view, setView] = useState<AppView>('join');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<FamilyRoom | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  const [champions, setChampions] = useState<HallOfChampionsEntry[]>([]);

  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [walkieOpen, setWalkieOpen] = useState(false);
  const [activeCheer, setActiveCheer] = useState<ActiveCheer | null>(null);
  const [privacyToast, setPrivacyToast] = useState<string | null>(null);
  const [recentBoost, setRecentBoost] = useState<{ playerId: string; delta: number } | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [clockTick, setClockTick] = useState(0);

  const [muted, setMuted] = useState<boolean>(() => {
    const m = loadMuted();
    soundEngine.setMuted(m);
    return m;
  });

  const playedVoiceIdsRef = useRef<Set<string>>(new Set());
  const cheerTimeoutRef = useRef<number | null>(null);
  const boostTimeoutRef = useRef<number | null>(null);
  const privacyTimeoutRef = useRef<number | null>(null);
  const prevScoresRef = useRef<Map<string, number>>(new Map());
  const autoTriggerGuardRef = useRef<string>('');
  const preparedRoundRef = useRef<number>(0);
  const celebratedRoundRef = useRef<number>(0);

  useEffect(() => {
    soundEngine.setMuted(muted);
    saveMuted(muted);
  }, [muted]);

  // Listen to Firebase Google Authentication state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (!firebaseUser) {
        setRoomId(null);
        setRoom(null);
        setPlayers([]);
        setView('join');
      }
    });
    return unsub;
  }, []);

  // Attach real-time Firestore listeners ONLY when signed in & joined a room
  useEffect(() => {
    if (!user || !roomId) return;

    const handleSubError = (err: unknown) => {
      console.error('Realtime room listener error:', err);
    };

    const unsubRoom = subscribeToRoom(
      roomId,
      (r) => {
        if (r) setRoom(r);
      },
      handleSubError
    );

    const unsubPlayers = subscribeToPlayers(
      roomId,
      (list) => {
        list.forEach((p) => {
          const prev = prevScoresRef.current.get(p.id);
          if (prev !== undefined && p.points > prev) {
            const delta = p.points - prev;
            setRecentBoost({ playerId: p.id, delta });
            if (p.id !== localProfile.playerId) {
              soundEngine.playVehicleMove();
            }
            if (boostTimeoutRef.current) window.clearTimeout(boostTimeoutRef.current);
            boostTimeoutRef.current = window.setTimeout(() => setRecentBoost(null), 3500);
          }
          prevScoresRef.current.set(p.id, p.points);
        });
        setPlayers(list);
      },
      handleSubError
    );

    const unsubQuestions = subscribeToCustomQuestions(
      roomId,
      (qs) => setCustomQuestions(qs),
      handleSubError
    );

    const unsubChampions = subscribeToChampions(
      roomId,
      (entries) => setChampions(entries),
      handleSubError
    );

    const unsubVoice = subscribeToVoiceMessages(
      roomId,
      (messages) => {
        const now = Date.now();
        messages.forEach((msg) => {
          if (now - msg.createdAtMs > 12000) {
            deleteVoiceMessageSafe(roomId, msg.id);
            return;
          }
          if (playedVoiceIdsRef.current.has(msg.id)) return;
          playedVoiceIdsRef.current.add(msg.id);

          const blob = base64ToBlob(msg.audioBase64, msg.mimeType);
          const displayMs = Math.max(2400, msg.durationMs + 700);

          setActiveCheer({
            playerId: msg.playerId,
            playerName: msg.playerName,
            tone: msg.tone,
            phrase: msg.phrase,
            expiresAt: Date.now() + displayMs,
          });

          if (cheerTimeoutRef.current) window.clearTimeout(cheerTimeoutRef.current);
          cheerTimeoutRef.current = window.setTimeout(() => {
            setActiveCheer(null);
          }, displayMs);

          soundEngine
            .playProcessedVoiceBlob(blob, msg.tone)
            .catch(() => {})
            .finally(() => {
              if (msg.senderUid === user.uid) {
                window.setTimeout(() => {
                  deleteVoiceMessageSafe(roomId, msg.id);
                  setPrivacyToast('تم بث رسالتك الصوتية وحذفها تلقائياً من قاعدة البيانات للخصوصية!');
                  if (privacyTimeoutRef.current) window.clearTimeout(privacyTimeoutRef.current);
                  privacyTimeoutRef.current = window.setTimeout(() => setPrivacyToast(null), 3500);
                }, Math.max(2500, msg.durationMs + 2500));
              }
            });
        });
      },
      handleSubError
    );

    // Presence heartbeat every 25 seconds so lobby & live players stay active
    const heartbeat = window.setInterval(() => {
      updatePlayerHeartbeat(roomId, localProfile.playerId);
    }, 25000);

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubQuestions();
      unsubChampions();
      unsubVoice();
      window.clearInterval(heartbeat);
    };
  }, [user, roomId, localProfile.playerId]);

  // Synchronized high-frequency clock ticker during countdown / active playing phases
  useEffect(() => {
    if (!room) return;
    if (room.roundStatus !== 'countdown' && room.roundStatus !== 'playing') return;
    const interval = window.setInterval(() => {
      setClockTick((t) => t + 1);
    }, 150);
    return () => window.clearInterval(interval);
  }, [room?.roundStatus, room?.countdownEndAtMs, room?.roundEndAtMs]);

  useEffect(() => {
    return () => {
      if (cheerTimeoutRef.current) window.clearTimeout(cheerTimeoutRef.current);
      if (boostTimeoutRef.current) window.clearTimeout(boostTimeoutRef.current);
      if (privacyTimeoutRef.current) window.clearTimeout(privacyTimeoutRef.current);
    };
  }, []);

  const allQuestions = useMemo(
    () => [...customQuestions, ...BUILT_IN_QUESTIONS],
    [customQuestions]
  );

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === localProfile.playerId) ?? null,
    [players, localProfile.playerId]
  );

  const editingPlayer = useMemo(
    () => players.find((p) => p.id === editingPlayerId) ?? null,
    [players, editingPlayerId]
  );

  const isAdmin = useMemo(() => isUserRoomAdmin(user, room), [user, room]);

  // Active players currently connected in the room
  const activeLobbyPlayers = useMemo(() => {
    const now = Date.now();
    return players.filter(
      (p) =>
        p.id === localProfile.playerId ||
        !p.lastActiveMs ||
        now - p.lastActiveMs < ACTIVE_PLAYER_WINDOW_MS
    );
  }, [players, localProfile.playerId, clockTick]);

  // Authoritative zero-lag phase derived from Firestore state + synchronized server clock
  const effectivePhase: RoundStatus = useMemo(() => {
    if (!room) return 'lobby';
    const syncedNow = getSyncedNowMs();
    if (room.roundStatus === 'countdown' && room.countdownEndAtMs > 0) {
      if (room.roundEndAtMs > 0 && syncedNow >= room.roundEndAtMs) return 'results';
      if (syncedNow >= room.countdownEndAtMs) return 'playing';
      return 'countdown';
    }
    if (room.roundStatus === 'playing' && room.roundEndAtMs > 0) {
      if (syncedNow >= room.roundEndAtMs) return 'results';
      return 'playing';
    }
    return room.roundStatus;
  }, [room, clockTick]);

  const triggerConfetti = () => setConfettiKey((k) => k + 1);

  // =========================================================================
  // Synchronized Live Round Orchestrator (Lobby -> Countdown -> 60s -> Results -> Next!)
  // =========================================================================
  useEffect(() => {
    if (!user || !roomId || !room || !currentPlayer) return;

    // 1. LOBBY -> COUNTDOWN: Auto-launch as soon as minPlayersToStart (default 3) children join!
    if (room.roundStatus === 'lobby' && activeLobbyPlayers.length >= room.minPlayersToStart) {
      const key = `lobby_start_${room.roundNumber}`;
      if (autoTriggerGuardRef.current !== key) {
        autoTriggerGuardRef.current = key;
        startSynchronizedCountdown({ roomId, expectedStatus: 'lobby' });
      }
      return;
    }

    // 2. PREPARE THIS HERO'S PER-ROUND SCORE AT COUNTDOWN / PLAY START
    if (
      (effectivePhase === 'countdown' || effectivePhase === 'playing') &&
      preparedRoundRef.current !== room.roundNumber
    ) {
      preparedRoundRef.current = room.roundNumber;
      preparePlayerForRound(roomId, currentPlayer.id, room.roundNumber);
    }

    // 3. COUNTDOWN -> PLAYING: Sync status to Firestore when countdown hits 0
    if (room.roundStatus === 'countdown' && effectivePhase === 'playing') {
      const key = `mark_playing_${room.roundNumber}`;
      if (autoTriggerGuardRef.current !== key) {
        autoTriggerGuardRef.current = key;
        markRoomPlaying(roomId, room.roundNumber);
      }
      return;
    }

    // 4. PLAYING -> RESULTS: Exact 00:00 stop on all devices simultaneously + Celebration!
    if (
      (room.roundStatus === 'playing' || room.roundStatus === 'countdown') &&
      effectivePhase === 'results'
    ) {
      if (celebratedRoundRef.current !== room.roundNumber) {
        celebratedRoundRef.current = room.roundNumber;
        soundEngine.playRoundEndHorn();
        window.setTimeout(() => {
          soundEngine.playApplauseAndWin();
          triggerConfetti();
        }, 350);
      }
      const key = `finish_round_${room.roundNumber}`;
      if (autoTriggerGuardRef.current !== key) {
        autoTriggerGuardRef.current = key;
        finishSynchronizedRound(roomId, room.roundNumber);
      }
      return;
    }

    // Also celebrate if Firestore flipped to 'results' from another device first
    if (room.roundStatus === 'results' && celebratedRoundRef.current !== room.roundNumber) {
      // Only celebrate if this user participated in this round
      if (preparedRoundRef.current === room.roundNumber) {
        celebratedRoundRef.current = room.roundNumber;
        soundEngine.playRoundEndHorn();
        window.setTimeout(() => {
          soundEngine.playApplauseAndWin();
          triggerConfetti();
        }, 350);
      }
    }

    // 5. RESULTS -> NEXT COUNTDOWN: Auto-launch next 60s round when minPlayersToStart click "جاهز للجولة التالية"!
    if (room.roundStatus === 'results') {
      const nextRound = room.roundNumber + 1;
      const readyCount = players.filter((p) => p.readyForRound === nextRound).length;
      if (readyCount >= room.minPlayersToStart) {
        const key = `results_next_${room.roundNumber}`;
        if (autoTriggerGuardRef.current !== key) {
          autoTriggerGuardRef.current = key;
          startSynchronizedCountdown({ roomId, expectedStatus: 'results' });
        }
      }
    }
  }, [
    user,
    roomId,
    room,
    currentPlayer,
    activeLobbyPlayers.length,
    effectivePhase,
    players,
  ]);

  const handleSignIn = async () => {
    setJoinError(null);
    try {
      await signInWithGoogle();
    } catch {
      setJoinError('تعذر إتمام تسجيل الدخول عبر Google. يرجى السماح بالنافذة المنبثقة والمحاولة مجدداً.');
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setRoomId(null);
    setRoom(null);
    setPlayers([]);
    setView('join');
  };

  const handleJoinRoom = async (data: {
    name: string;
    character: CharacterId;
    level: AgeLevel;
    roomCode: string;
  }) => {
    if (!user) return;
    setJoining(true);
    setJoinError(null);
    try {
      const updatedProfile: SavedLocalProfile = {
        ...localProfile,
        name: data.name,
        character: data.character,
        level: data.level,
        roomCode: data.roomCode,
      };
      saveLocalProfile(updatedProfile);
      setLocalProfile(updatedProfile);

      const res = await ensureAndJoinRoom({
        roomCode: data.roomCode,
        user,
        playerId: updatedProfile.playerId,
        name: data.name,
        character: data.character,
        level: data.level,
      });

      if (res.playerId !== updatedProfile.playerId) {
        const syncedProfile: SavedLocalProfile = { ...updatedProfile, playerId: res.playerId };
        saveLocalProfile(syncedProfile);
        setLocalProfile(syncedProfile);
      }

      prevScoresRef.current.clear();
      autoTriggerGuardRef.current = '';
      preparedRoundRef.current = 0;
      celebratedRoundRef.current = 0;
      setRoom(res.room);
      setRoomId(res.roomId);
      setView('home');
      soundEngine.playCorrect();
    } catch (err) {
      if (err instanceof Error && err.message === 'ROOM_FULL') {
        setJoinError('الغرفة ممتلئة حالياً (الحد الأقصى 10 أطفال في نفس السباق).');
      } else {
        setJoinError('تعذر الانضمام للغرفة. تأكد من اتصال الإنترنت وحاول مرة أخرى.');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleSprintAnswerScored = (pointsDelta: number) => {
    if (!roomId || !room || !currentPlayer) return;
    recordSprintAnswer({
      roomId,
      playerId: currentPlayer.id,
      roundNumber: room.roundNumber,
      pointsDelta,
    }).catch(() => {});
  };

  const handleToggleReadyNextRound = async (ready: boolean) => {
    if (!roomId || !room || !currentPlayer) return;
    await setPlayerReadyForNextRound(roomId, currentPlayer.id, ready ? room.roundNumber + 1 : 0);
  };

  const handleForceStartRound = async () => {
    if (!roomId) return;
    autoTriggerGuardRef.current = '';
    await startSynchronizedCountdown({
      roomId,
      expectedStatus: 'lobby',
      forceFromAnyStatus: true,
    });
    setView('home');
  };

  const handleResetToLobby = async () => {
    if (!roomId) return;
    autoTriggerGuardRef.current = '';
    await resetRoomToLobby(roomId);
    setView('home');
  };

  const handleSaveEditedPlayer = async (
    playerId: string,
    updates: { name: string; character: CharacterId; level: AgeLevel }
  ) => {
    if (!roomId) return;
    await editPlayerProfile(roomId, playerId, updates);
    if (playerId === localProfile.playerId) {
      const next = { ...localProfile, ...updates };
      saveLocalProfile(next);
      setLocalProfile(next);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!roomId) return;
    await removeRoomPlayer(roomId, playerId);
  };

  const handleBroadcastOnlineVoice = async (params: {
    blob: Blob;
    tone: VoiceTone;
    durationMs: number;
  }) => {
    if (!roomId || !user || !currentPlayer) return;
    const toneMeta = VOICE_TONES.find((t) => t.id === params.tone) ?? VOICE_TONES[0];
    await broadcastVoiceMessage({
      roomId,
      senderUid: user.uid,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      tone: params.tone,
      phrase: toneMeta.bubblePhrase,
      blob: params.blob,
      durationMs: params.durationMs,
    });
  };

  const handleAwardAndReset = async () => {
    if (!roomId || !room || !user) return;
    const sorted = sortPlayersByRank(players);
    const winners: ChampionWinner[] = sorted.slice(0, 3).map((p, idx) => ({
      rank: (idx + 1) as 1 | 2 | 3,
      name: p.name,
      character: p.character,
      level: p.level,
      points: p.points,
      prizeAmount: calculatePlayerCash(p, players, room.rewardConfig),
    }));

    await awardAndResetRoomSeason({
      roomId,
      awardedByUid: user.uid,
      room,
      players,
      winners,
    });

    soundEngine.playApplauseAndWin();
    triggerConfetti();
    setView('champions');
  };

  const handleSwitchRoomCodeFromParent = async (newCode: string) => {
    if (!user) return;
    await handleJoinRoom({
      name: currentPlayer?.name || localProfile.name || 'بطل عتيق',
      character: currentPlayer?.character || localProfile.character,
      level: currentPlayer?.level || localProfile.level,
      roomCode: newCode,
    });
  };

  const homeNavLabel =
    effectivePhase === 'playing'
      ? 'الجولة الحية'
      : effectivePhase === 'results'
      ? 'نتائج الجولة'
      : 'غرفة الانتظار';

  return (
    <div className="cartoon-sky-bg relative min-h-screen text-slate-900 flex flex-col overflow-x-hidden">
      {/* Playful Floating Cartoon Stars */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <span className="animate-float-gentle absolute top-24 right-6 text-2xl opacity-35 select-none">
          ⭐
        </span>
        <span className="animate-float-gentle absolute top-40 left-8 text-xl opacity-30 select-none">
          ✨
        </span>
        <span className="animate-float-gentle absolute bottom-28 right-10 text-xl opacity-30 select-none">
          🌟
        </span>
        <span className="animate-float-gentle absolute bottom-20 left-10 text-2xl opacity-30 select-none">
          ⭐
        </span>
      </div>

      {/* Global Confetti & Stars Layer */}
      <ConfettiBurst burstKey={confettiKey} />

      {/* Synchronized Fullscreen 3.. 2.. 1.. انطلق! Countdown Overlay */}
      {view === 'home' && room && effectivePhase === 'countdown' && (
        <CountdownOverlay
          roundNumber={room.roundNumber}
          countdownEndAtMs={room.countdownEndAtMs}
          durationSeconds={room.roundDurationSeconds}
        />
      )}

      {/* Clean 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b-2 border-sky-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:gap-8 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setView(roomId ? 'home' : 'join');
            }}
            className="font-display text-base sm:text-lg font-black tracking-tight text-sky-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            👑 تحدي أبطال عائلة عتيق
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="التنقل الرئيسي"
            className="flex items-center gap-3.5 sm:gap-6 text-xs sm:text-sm font-bold text-slate-600 overflow-x-auto"
          >
            {roomId && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setView('home');
                  }}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                    view === 'home'
                      ? 'text-sky-700 underline decoration-2 underline-offset-8'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {homeNavLabel}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setView('champions');
                  }}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                    view === 'champions'
                      ? 'text-sky-700 underline decoration-2 underline-offset-8'
                      : 'hover:text-slate-900'
                  }`}
                >
                  قاعة الأبطال
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setView('parent');
                  }}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                    view === 'parent'
                      ? 'text-sky-700 underline decoration-2 underline-offset-8'
                      : 'hover:text-slate-900'
                  }`}
                >
                  ولي الأمر
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'تشغيل المؤثرات الصوتية' : 'كتم المؤثرات الصوتية'}
              className="flex items-center gap-1 whitespace-nowrap shrink-0 py-1 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-rose-500" />
              ) : (
                <Volume2 className="h-4 w-4 text-emerald-600" />
              )}
              <span className="hidden md:inline">{muted ? 'صامت' : 'الصوت'}</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="shrink-0">
            {roomId && currentPlayer ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setWalkieOpen(true);
                }}
                className="btn-tactile flex items-center gap-1.5 rounded-xl border-b-4 border-rose-700 bg-rose-500 px-3 sm:px-4 py-2 font-display text-xs sm:text-sm font-extrabold text-white hover:bg-rose-400 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Mic className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">اضغط للتحدث مع الجميع 🎙️</span>
                <span className="sm:hidden">تحدث 🎙️</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 whitespace-nowrap">
                <Wifi className="h-4 w-4" />
                أونلاين
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {privacyToast && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{privacyToast}</span>
          </div>
        )}

        {view === 'join' && (
          <RoomJoinScreen
            user={user}
            authLoading={authLoading}
            initialProfile={localProfile}
            joining={joining}
            errorMsg={joinError}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {/* SYNCHRONIZED LIVE ROUND VIEWS (Lobby / Countdown / 60s Live Sprint / Round Results) */}
        {view === 'home' && room && (effectivePhase === 'lobby' || effectivePhase === 'countdown') && (
          <LobbyScreen
            room={room}
            players={players}
            activePlayersCount={activeLobbyPlayers.length}
            currentPlayerId={localProfile.playerId}
            activeCheer={activeCheer}
            recentBoost={recentBoost}
            isRoomAdmin={isAdmin}
            onEditMyProfile={(p) => setEditingPlayerId(p.id)}
            onOpenWalkieTalkie={() => setWalkieOpen(true)}
            onSwitchRoom={() => setView('join')}
            onForceStartNow={handleForceStartRound}
          />
        )}

        {view === 'home' && room && effectivePhase === 'playing' && currentPlayer && (
          <LiveSprintRound
            room={room}
            player={currentPlayer}
            players={players}
            allQuestions={allQuestions}
            activeCheer={activeCheer}
            recentBoost={recentBoost}
            onAnswerScored={handleSprintAnswerScored}
            onOpenWalkieTalkie={() => setWalkieOpen(true)}
          />
        )}

        {view === 'home' && room && effectivePhase === 'results' && (
          <RoundResultsScreen
            room={room}
            players={players}
            currentPlayerId={localProfile.playerId}
            activeCheer={activeCheer}
            recentBoost={recentBoost}
            isRoomAdmin={isAdmin}
            onToggleReadyNextRound={handleToggleReadyNextRound}
            onOpenWalkieTalkie={() => setWalkieOpen(true)}
            onReturnToLobby={handleResetToLobby}
          />
        )}

        {view === 'champions' && (
          <HallOfChampions
            entries={champions}
            onBackHome={() => {
              soundEngine.playClick();
              setView('home');
            }}
          />
        )}

        {view === 'parent' && room && (
          <ParentDashboard
            room={room}
            isRoomAdmin={isAdmin}
            players={players}
            customQuestions={customQuestions}
            builtInCount={BUILT_IN_QUESTIONS.length}
            onUpdatePin={(newPin) => updateRoomPin(room.roomId, newPin)}
            onUpdateRewardConfig={(cfg: RewardConfig) => updateRoomRewardConfig(room.roomId, cfg)}
            onUpdateMatchSettings={(settings) => updateRoomMatchSettings(room.roomId, settings)}
            onForceStartRound={handleForceStartRound}
            onResetToLobby={handleResetToLobby}
            onSwitchRoomCode={handleSwitchRoomCodeFromParent}
            onEditPlayer={(p) => setEditingPlayerId(p.id)}
            onRemovePlayer={handleRemovePlayer}
            onAddCustomQuestion={(q) =>
              user ? addRoomCustomQuestion(room.roomId, user.uid, q) : Promise.resolve()
            }
            onDeleteCustomQuestion={(id) => deleteRoomCustomQuestion(room.roomId, id)}
            onAwardAndReset={handleAwardAndReset}
            onExit={() => setView('home')}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="relative z-10 border-t border-sky-100 bg-white py-4 text-center text-xs font-medium text-slate-500">
        تحدي أبطال عائلة عتيق (Ateeg Family Champions) · جولات حية متزامنة أونلاين عبر Firebase · بنك
        يضم <span className="font-bold text-slate-700 tabular-nums">{allQuestions.length}</span>{' '}
        سؤالاً تعليمياً
      </footer>

      {/* Global Online Walkie-Talkie Modal */}
      <VoiceWalkieTalkie
        isOpen={walkieOpen}
        onClose={() => setWalkieOpen(false)}
        currentPlayer={currentPlayer}
        onBroadcastOnline={handleBroadcastOnlineVoice}
      />

      {/* Global Player Edit Modal */}
      {room && (
        <EditPlayerModal
          player={editingPlayer}
          allPlayers={players}
          rewardConfig={room.rewardConfig}
          canDelete={view === 'parent' && isAdmin}
          onSave={handleSaveEditedPlayer}
          onDelete={handleRemovePlayer}
          onClose={() => setEditingPlayerId(null)}
        />
      )}
    </div>
  );
}
