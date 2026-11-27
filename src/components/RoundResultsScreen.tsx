import { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, CheckCircle2, Rocket, Coins, Star, Mic, RotateCcw } from 'lucide-react';
import { ActiveCheer, FamilyRoom, Player } from '../types';
import { getAgeLevelMeta, getCharacterMeta } from '../data/characters';
import { calculatePlayerCash, formatCurrencyAmount, sortPlayersByRank } from '../utils/storage';
import { soundEngine } from '../utils/soundEngine';
import { RaceTrack } from './RaceTrack';

interface RoundResultsScreenProps {
  room: FamilyRoom;
  players: Player[];
  currentPlayerId: string;
  activeCheer: ActiveCheer | null;
  recentBoost: { playerId: string; delta: number } | null;
  isRoomAdmin: boolean;
  onToggleReadyNextRound: (ready: boolean) => Promise<void>;
  onOpenWalkieTalkie: () => void;
  onReturnToLobby?: () => void;
}

const TROPHY_IMAGE_URL = '/src/assets/images/champions_trophy_cup_1795204292866.jpg';

export function RoundResultsScreen({
  room,
  players,
  currentPlayerId,
  activeCheer,
  recentBoost,
  isRoomAdmin,
  onToggleReadyNextRound,
  onOpenWalkieTalkie,
  onReturnToLobby,
}: RoundResultsScreenProps) {
  const [trophyImgError, setTrophyImgError] = useState(false);
  const [busyReady, setBusyReady] = useState(false);

  const nextRoundNumber = room.roundNumber + 1;
  const minNeeded = room.minPlayersToStart;

  // Sort players by THIS ROUND's score first for the Round Podium!
  const roundRanked = [...players].sort((a, b) => {
    const ptsA = a.currentRoundNumber === room.roundNumber ? a.currentRoundPoints : 0;
    const ptsB = b.currentRoundNumber === room.roundNumber ? b.currentRoundPoints : 0;
    if (ptsB !== ptsA) return ptsB - ptsA;
    const corA = a.currentRoundNumber === room.roundNumber ? a.currentRoundCorrect : 0;
    const corB = b.currentRoundNumber === room.roundNumber ? b.currentRoundCorrect : 0;
    if (corB !== corA) return corB - corA;
    return b.points - a.points;
  });

  // Sort players by CUMULATIVE score across all rounds
  const cumulativeRanked = sortPlayersByRank(players);

  const myPlayer = players.find((p) => p.id === currentPlayerId);
  const isMeReady = Boolean(myPlayer && myPlayer.readyForRound === nextRoundNumber);
  const readyPlayers = players.filter((p) => p.readyForRound === nextRoundNumber);
  const readyCount = readyPlayers.length;
  const remainingReady = Math.max(0, minNeeded - readyCount);

  const podiumSlots = [
    {
      player: roundRanked[1],
      rank: 2 as const,
      medal: '🥈',
      heightClass: 'h-28 sm:h-32',
      barClass: 'bg-gradient-to-b from-slate-200 to-slate-300 border-slate-400 text-slate-800',
    },
    {
      player: roundRanked[0],
      rank: 1 as const,
      medal: '🥇',
      heightClass: 'h-36 sm:h-44',
      barClass: 'bg-gradient-to-b from-amber-300 to-amber-400 border-amber-500 text-amber-950',
    },
    {
      player: roundRanked[2],
      rank: 3 as const,
      medal: '🥉',
      heightClass: 'h-24 sm:h-28',
      barClass: 'bg-gradient-to-b from-orange-200 to-orange-300 border-orange-400 text-orange-950',
    },
  ];

  const handleReadyClick = async () => {
    if (busyReady) return;
    soundEngine.playClick();
    setBusyReady(true);
    try {
      await onToggleReadyNextRound(!isMeReady);
    } finally {
      setBusyReady(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Celebration Banner + Ready For Next Round CTA */}
      <section
        aria-label="نتائج الجولة ومنصة التتويج"
        className="rounded-3xl border-2 border-amber-300 bg-white p-5 sm:p-7 shadow-sm space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-100 pb-5">
          <div className="flex items-center gap-4">
            {!trophyImgError ? (
              <img
                src={TROPHY_IMAGE_URL}
                alt="كأس التتويج"
                referrerPolicy="no-referrer"
                onError={() => setTrophyImgError(true)}
                className="h-16 w-16 shrink-0 rounded-2xl border border-amber-200 bg-amber-50 object-contain p-1 mix-blend-multiply"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Trophy className="h-9 w-9" />
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900">
                انتهت الجولة #{room.roundNumber}! 🎉
              </h1>
              <p className="text-sm sm:text-base font-bold text-amber-800">
                أبطال منصة التتويج في هذه الدقيقة المشتعلة — تحدي أبطال عائلة عتيق
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenWalkieTalkie();
              }}
              className="btn-tactile flex items-center gap-1.5 rounded-2xl border-b-4 border-rose-700 bg-rose-500 px-4 py-2.5 font-display text-xs sm:text-sm font-extrabold text-white hover:bg-rose-400 cursor-pointer whitespace-nowrap"
            >
              <Mic className="h-4 w-4" />
              <span>بارك للأبطال 🎙️</span>
            </button>

            {isRoomAdmin && onReturnToLobby && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onReturnToLobby();
                }}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-display text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                <span>العودة لغرفة الانتظار</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Round Podium (Top 3 of THIS Round) */}
        <div className="mx-auto max-w-2xl pt-2">
          <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
            {podiumSlots.map((slot) => {
              if (!slot.player) {
                return (
                  <div key={slot.rank} className="flex flex-col items-center">
                    <div className="mb-2 text-xs font-bold text-slate-400">—</div>
                    <div
                      className={`flex w-full items-center justify-center rounded-t-2xl border-2 border-dashed border-slate-200 bg-slate-50 font-display text-2xl font-black text-slate-300 ${slot.heightClass}`}
                    >
                      {slot.rank}
                    </div>
                  </div>
                );
              }

              const char = getCharacterMeta(slot.player.character);
              const roundPts =
                slot.player.currentRoundNumber === room.roundNumber
                  ? slot.player.currentRoundPoints
                  : 0;
              const roundCorrect =
                slot.player.currentRoundNumber === room.roundNumber
                  ? slot.player.currentRoundCorrect
                  : 0;

              return (
                <motion.div
                  key={`${slot.rank}-${slot.player.id}`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14, delay: slot.rank * 0.08 }}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={`mb-1 text-3xl sm:text-4xl leading-none ${
                      slot.rank === 1 ? 'animate-float-gentle' : ''
                    }`}
                  >
                    {slot.medal}
                  </div>
                  <div className="mb-1.5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50/60 text-3xl sm:text-4xl shadow-xs">
                    {char.emoji}
                  </div>
                  <div className="max-w-full truncate font-display text-sm sm:text-lg font-black text-slate-900">
                    {slot.player.name}
                    {slot.player.id === currentPlayerId ? ' (أنت)' : ''}
                  </div>
                  <div className="mb-2 text-xs font-bold text-emerald-700 tabular-nums">
                    {roundCorrect} إجابة صحيحة
                  </div>

                  <div
                    className={`flex w-full flex-col items-center justify-center rounded-t-2xl border-2 border-b-0 px-2 py-2.5 ${slot.heightClass} ${slot.barClass}`}
                  >
                    <span className="font-display text-2xl sm:text-3xl font-black tabular-nums leading-none">
                      {slot.rank}
                    </span>
                    <span className="mt-1 font-display text-xs sm:text-sm font-black tabular-nums">
                      +{roundPts.toLocaleString('en-US')} نقطة
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* 2. Giant "Ready for Next Round" Synchronized Action Card */}
        <div className="rounded-3xl border-2 border-sky-300 bg-gradient-to-l from-sky-50 via-white to-emerald-50/70 p-5 text-center space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900">
              هل أنتم جاهزون للجولة #{nextRoundNumber}؟
            </h2>
            <p className="text-sm font-bold text-slate-600 tabular-nums">
              {remainingReady > 0 ? (
                <>
                  عندما يضغط{' '}
                  <span className="text-sky-700 font-black">{minNeeded} أبطال</span> على الزر ستبدأ
                  جولة جديدة مدتها {room.roundDurationSeconds} ثانية فوراً (جاهزون الآن:{' '}
                  <span className="text-emerald-700 font-black">
                    {readyCount} / {minNeeded}
                  </span>
                  )
                </>
              ) : (
                <span className="text-emerald-700 font-black">
                  اكتمل الجاهزون! جاري إطلاق العدّ التنازلي للجولة التالية... 🚀
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            disabled={busyReady || remainingReady === 0}
            onClick={handleReadyClick}
            className={`btn-tactile mx-auto flex w-full max-w-md items-center justify-center gap-2.5 rounded-2xl border-b-4 px-8 py-4 font-display text-lg sm:text-xl font-black text-white shadow-sm cursor-pointer disabled:opacity-60 whitespace-nowrap ${
              isMeReady
                ? 'border-emerald-700 bg-emerald-500 hover:bg-emerald-600'
                : 'border-sky-800 bg-sky-600 hover:bg-sky-500'
            }`}
          >
            {isMeReady ? (
              <>
                <CheckCircle2 className="h-6 w-6" />
                <span>أنت جاهز للجولة التالية! ✓</span>
              </>
            ) : (
              <>
                <Rocket className="h-6 w-6" />
                <span>جاهز للجولة التالية 🚀</span>
              </>
            )}
          </button>

          {/* Ready Status Chips (clean inline list) */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs sm:text-sm font-bold">
            {players.map((p) => {
              const ready = p.readyForRound === nextRoundNumber;
              const c = getCharacterMeta(p.character);
              return (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                    ready
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{p.name}</span>
                  <span>{ready ? '✅' : '⏳'}</span>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Cumulative Family Points & Cash Balances Table */}
      <section
        aria-label="الرصيد التراكمي للأبطال"
        className="rounded-3xl border-2 border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900">
            النقاط والرصيد النقدي الإجمالي التراكمي
          </h2>
          <p className="text-sm text-slate-600">
            تُجمع نقاط كل جولة تلقائياً لتقريب كل بطل من صندوق الكنز والجائزة النقدية
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cumulativeRanked.map((p, idx) => {
            const char = getCharacterMeta(p.character);
            const tier = getAgeLevelMeta(p.level);
            const totalCash = calculatePlayerCash(p, players, room.rewardConfig);
            const roundPts = p.currentRoundNumber === room.roundNumber ? p.currentRoundPoints : 0;
            const isMe = p.id === currentPlayerId;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 ${
                  isMe ? 'border-sky-400 bg-sky-50/50' : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-display text-lg font-black text-slate-400 tabular-nums w-6 text-center">
                    #{idx + 1}
                  </span>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl">
                    {char.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-display text-base font-black text-slate-900">
                      {p.name}
                      {isMe ? ' (أنت)' : ''}
                    </div>
                    <div className="text-xs font-bold text-slate-500 tabular-nums">
                      <span className={tier.colorClass}>{tier.name}</span> · في هذه الجولة:{' '}
                      <span className="text-amber-700">+{roundPts}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left shrink-0 tabular-nums">
                  <div className="flex items-center justify-end gap-1 font-display text-sm sm:text-base font-black text-slate-900">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                    <span>{p.points.toLocaleString('en-US')} نقطة</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 font-display text-sm font-extrabold text-emerald-700">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span>{formatCurrencyAmount(totalCash, room.rewardConfig.currency)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Full Cumulative Race Track */}
      <RaceTrack
        players={players}
        currentPlayerId={currentPlayerId}
        rewardConfig={room.rewardConfig}
        activeCheer={activeCheer}
        recentBoost={recentBoost}
      />
    </div>
  );
}
