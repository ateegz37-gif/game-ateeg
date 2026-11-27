import { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Trophy, Coins, Star, Pencil, Wifi } from 'lucide-react';
import { Player, RewardConfig } from '../types';
import { getAgeLevelMeta, getCharacterMeta } from '../data/characters';
import { calculatePlayerCash, formatCurrencyAmount, sortPlayersByRank } from '../utils/storage';
import { soundEngine } from '../utils/soundEngine';

interface PodiumAndPlayersProps {
  players: Player[];
  currentPlayerId: string;
  rewardConfig: RewardConfig;
  onStartMyRound: () => void;
  onEditMyProfile: (player: Player) => void;
}

const TROPHY_IMAGE_URL = '/src/assets/images/champions_trophy_cup_1795204292866.jpg';

export function PodiumAndPlayers({
  players,
  currentPlayerId,
  rewardConfig,
  onStartMyRound,
  onEditMyProfile,
}: PodiumAndPlayersProps) {
  const [trophyImgError, setTrophyImgError] = useState(false);
  const ranked = sortPlayersByRank(players);
  const myPlayer = players.find((p) => p.id === currentPlayerId) ?? players[0];

  const first = ranked[0];
  const second = ranked[1];
  const third = ranked[2];

  const podiumSlots = [
    {
      player: second,
      rank: 2 as const,
      medal: '🥈',
      heightClass: 'h-28 sm:h-32',
      barClass: 'bg-gradient-to-b from-slate-200 to-slate-300 border-slate-400 text-slate-800',
    },
    {
      player: first,
      rank: 1 as const,
      medal: '🥇',
      heightClass: 'h-36 sm:h-40',
      barClass: 'bg-gradient-to-b from-amber-300 to-amber-400 border-amber-500 text-amber-950',
    },
    {
      player: third,
      rank: 3 as const,
      medal: '🥉',
      heightClass: 'h-24 sm:h-28',
      barClass: 'bg-gradient-to-b from-orange-200 to-orange-300 border-orange-400 text-orange-950',
    },
  ];

  const nowMs = Date.now();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
      {/* Simultaneous Play Hero Card + Connected Family Roster */}
      <section
        aria-label="أبطال عائلة عتيق المتصلون"
        className="lg:col-span-7 rounded-3xl border-2 border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
              أبطال عائلة عتيق المتصلون
            </h2>
            <p className="text-sm text-slate-600">
              العب جولتك الآن من جوالك في نفس الوقت دون انتظار دور الآخرين!
            </p>
          </div>
          <span className="text-sm font-bold text-emerald-700 tabular-nums whitespace-nowrap">
            {players.length} / 10 أبطال
          </span>
        </div>

        {/* Highlighted Card for THIS Device's Hero */}
        {myPlayer && (() => {
          const myChar = getCharacterMeta(myPlayer.character);
          const myTier = getAgeLevelMeta(myPlayer.level);
          const myCash = calculatePlayerCash(myPlayer, players, rewardConfig);
          const myRank = ranked.findIndex((p) => p.id === myPlayer.id) + 1;

          return (
            <div className="rounded-2xl border-2 border-sky-400 bg-gradient-to-l from-sky-50 via-white to-amber-50/40 p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-200 bg-white text-3xl shadow-xs">
                    {myChar.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display text-lg sm:text-xl font-black text-slate-900">
                        {myPlayer.name} (أنت)
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          onEditMyProfile(myPlayer);
                        }}
                        title="تعديل اسمي وشخصيتي"
                        aria-label="تعديل اسمي وشخصيتي"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 hover:bg-sky-100 cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-xs font-bold text-slate-600 tabular-nums">
                      <span className={myTier.colorClass}>{myTier.name}</span> · المركز #{myRank} ·{' '}
                      {myPlayer.points.toLocaleString('en-US')} نقطة ·{' '}
                      <span className="text-emerald-700">
                        {formatCurrencyAmount(myCash, rewardConfig.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onStartMyRound();
                  }}
                  className="btn-tactile flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border-b-4 border-sky-800 bg-sky-600 px-6 py-3.5 font-display text-base sm:text-lg font-black text-white hover:bg-sky-500 cursor-pointer whitespace-nowrap"
                >
                  <Play className="h-5 w-5 fill-current" />
                  <span>ابدأ جولتي الآن 🚀</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* All Connected Players Roster */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 flex-1">
          {players.map((player) => {
            const char = getCharacterMeta(player.character);
            const tier = getAgeLevelMeta(player.level);
            const cash = calculatePlayerCash(player, players, rewardConfig);
            const rankIdx = ranked.findIndex((p) => p.id === player.id) + 1;
            const isMe = player.id === currentPlayerId;
            const isOnline = Boolean(player.lastActiveMs && nowMs - player.lastActiveMs < 180000);

            return (
              <div
                key={player.id}
                className={`flex flex-col justify-between gap-2.5 rounded-2xl border-2 p-3.5 transition-colors ${
                  isMe
                    ? 'border-sky-300 bg-sky-50/40'
                    : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${char.laneBorder} bg-white text-2xl`}
                    >
                      {char.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-display text-base font-extrabold text-slate-900">
                          {player.name}
                        </span>
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onEditMyProfile(player);
                            }}
                            aria-label="تعديل بياناتي"
                            className="text-sky-700 hover:text-sky-900 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <span className={`font-bold ${tier.colorClass}`}>{tier.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className={isOnline ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          <Wifi className="inline h-3 w-3 ml-0.5" />
                          {isOnline ? 'متصل الآن' : 'بانتظار العودة'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="font-display text-sm font-black text-slate-500 tabular-nums shrink-0">
                    #{rankIdx}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/70 pt-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1 font-bold text-slate-800 tabular-nums">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                    <span>{player.points.toLocaleString('en-US')} نقطة</span>
                  </div>
                  <div className="flex items-center gap-1 font-extrabold text-emerald-700 tabular-nums">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span>{formatCurrencyAmount(cash, rewardConfig.currency)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top 3 Animated Live Podium */}
      <section
        aria-label="منصة التتويج المباشرة"
        className="lg:col-span-5 rounded-3xl border-2 border-amber-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
              منصة التتويج المباشرة
            </h2>
            <p className="text-sm text-slate-600">تتحدث تلقائياً مع كل إجابة صحيحة أونلاين</p>
          </div>
          {!trophyImgError ? (
            <img
              src={TROPHY_IMAGE_URL}
              alt="كأس أبطال عائلة عتيق الذهبي"
              referrerPolicy="no-referrer"
              onError={() => setTrophyImgError(true)}
              className="h-14 w-14 shrink-0 rounded-2xl object-contain mix-blend-multiply"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Trophy className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="mt-auto grid grid-cols-3 items-end gap-2 sm:gap-3 pt-6">
          {podiumSlots.map((slot) => {
            if (!slot.player) {
              return (
                <div key={slot.rank} className="flex flex-col items-center">
                  <div className="mb-2 text-xs text-slate-400">بانتظار بطل</div>
                  <div
                    className={`w-full ${slot.heightClass} rounded-t-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center font-display text-2xl font-black text-slate-300`}
                  >
                    {slot.rank}
                  </div>
                </div>
              );
            }

            const char = getCharacterMeta(slot.player.character);
            const cash = calculatePlayerCash(slot.player, players, rewardConfig);

            return (
              <motion.div
                key={`${slot.rank}-${slot.player.id}`}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 15 }}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`mb-1 text-2xl sm:text-3xl leading-none ${
                    slot.rank === 1 ? 'animate-float-gentle' : ''
                  }`}
                  aria-hidden="true"
                >
                  {slot.medal}
                </div>
                <div className="mb-1 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border-2 border-slate-100 bg-slate-50 text-3xl shadow-xs">
                  {char.emoji}
                </div>
                <div className="max-w-full truncate font-display text-sm sm:text-base font-extrabold text-slate-900">
                  {slot.player.name}
                </div>
                <div className="mb-2 text-xs font-bold text-emerald-700 tabular-nums">
                  {formatCurrencyAmount(cash, rewardConfig.currency)}
                </div>

                <div
                  className={`flex w-full flex-col items-center justify-center rounded-t-2xl border-2 border-b-0 px-1 py-2 ${slot.heightClass} ${slot.barClass}`}
                >
                  <span className="font-display text-2xl sm:text-3xl font-black tabular-nums leading-none">
                    {slot.rank}
                  </span>
                  <span className="mt-1 text-xs font-extrabold tabular-nums">
                    {slot.player.points.toLocaleString('en-US')} نقطة
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
