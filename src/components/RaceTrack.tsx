import { useState } from 'react';
import { motion } from 'motion/react';
import { Flag, Coins, Sparkles } from 'lucide-react';
import { ActiveCheer, Player, RewardConfig } from '../types';
import { getAgeLevelMeta, getCharacterMeta } from '../data/characters';
import { calculatePlayerCash, formatCurrencyAmount } from '../utils/storage';

interface RaceTrackProps {
  players: Player[];
  currentPlayerId?: string;
  rewardConfig: RewardConfig;
  activeCheer: ActiveCheer | null;
  recentBoost: { playerId: string; delta: number } | null;
}

const TREASURE_IMAGE_URL = '/src/assets/images/treasure_chest_prize_1795204293160.jpg';

export function RaceTrack({
  players,
  currentPlayerId,
  rewardConfig,
  activeCheer,
  recentBoost,
}: RaceTrackProps) {
  const [treasureImgError, setTreasureImgError] = useState(false);
  const targetPoints = Math.max(100, rewardConfig.targetTrackPoints);

  const prizeHeadline =
    rewardConfig.mode === 'podium'
      ? `المركز الأول: ${formatCurrencyAmount(rewardConfig.firstPrize, rewardConfig.currency)}`
      : `كل ${rewardConfig.pointsStep} نقطة = ${formatCurrencyAmount(rewardConfig.cashPerStep, rewardConfig.currency)}`;

  return (
    <section
      aria-label="مضمار السباق المتحرك"
      className="rounded-3xl border-2 border-sky-200 bg-white p-4 sm:p-6 shadow-sm"
    >
      {/* Header strip */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
            🏁
          </div>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
              مضمار السباق الحي والجوائز
            </h2>
            <p className="text-sm text-slate-600">
              هدف صندوق الكنز:{' '}
              <span className="font-bold text-sky-700 tabular-nums">
                {targetPoints.toLocaleString('en-US')} نقطة
              </span>{' '}
              <span aria-hidden="true">·</span>{' '}
              <span className="font-bold text-amber-700">{prizeHeadline}</span>
            </p>
          </div>
        </div>

        {/* Finish Line Treasure Prize Box */}
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2">
          {!treasureImgError ? (
            <img
              src={TREASURE_IMAGE_URL}
              alt="صندوق الكنز والجائزة النقدية"
              referrerPolicy="no-referrer"
              onError={() => setTreasureImgError(true)}
              className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-0.5 mix-blend-multiply"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-2xl">
              💰
            </div>
          )}
          <div>
            <div className="text-xs font-bold text-amber-800">صندوق الكنز والجائزة النقدية</div>
            <div className="font-display text-sm sm:text-base font-extrabold text-slate-900 tabular-nums">
              {rewardConfig.mode === 'podium'
                ? `${formatCurrencyAmount(rewardConfig.firstPrize, rewardConfig.currency)} للأول`
                : formatCurrencyAmount(
                    Math.round(
                      (targetPoints / Math.max(1, rewardConfig.pointsStep)) *
                        rewardConfig.cashPerStep
                    ),
                    rewardConfig.currency
                  )}
            </div>
          </div>
        </div>
      </div>

      {/* Track Direction Guide: Start on LEFT -> Treasure Finish on RIGHT */}
      <div
        dir="ltr"
        className="mb-2.5 flex items-center justify-between px-2 text-xs font-extrabold text-slate-500"
      >
        <span className="flex items-center gap-1.5 text-emerald-700">
          <Flag className="h-3.5 w-3.5" />
          <span>خط الانطلاق (0%)</span>
        </span>
        <span className="hidden sm:inline tabular-nums">50%</span>
        <span className="flex items-center gap-1 text-amber-700">
          <span>صندوق الكنز والجائزة (100%) 🏆</span>
        </span>
      </div>

      {/* Race Lanes */}
      <div className="space-y-3.5">
        {players.map((player) => {
          const char = getCharacterMeta(player.character);
          const tier = getAgeLevelMeta(player.level);
          const pct = Math.min(100, Math.round((player.points / targetPoints) * 100));
          const cash = calculatePlayerCash(player, players, rewardConfig);
          const isCheering = activeCheer?.playerId === player.id;
          const isBoosted = recentBoost?.playerId === player.id;

          // Smooth left-to-right vehicle placement inside track rails (5% to 90%)
          const vehicleLeftPct = Math.min(90, Math.max(5, pct * 0.85 + 5));

          return (
            <div
              key={player.id}
              className={`rounded-2xl border-2 p-3 transition-colors ${
                isBoosted
                  ? 'border-amber-400 bg-amber-50/75'
                  : `${char.laneBorder} ${char.laneBg}`
              }`}
            >
              {/* Player Stat Summary Row (Exact Requested Format: سالم (120 نقطة) - 600 ريال) */}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                  <span className="text-xl" aria-hidden="true">
                    {char.emoji}
                  </span>
                  <span className="font-display font-black text-slate-900">
                    {player.name}
                    {player.id === currentPlayerId ? ' (أنت)' : ''}
                  </span>
                  <span className="font-bold text-slate-700 tabular-nums">
                    ({player.points.toLocaleString('en-US')} نقطة)
                  </span>
                  <span aria-hidden="true" className="text-slate-400">
                    -
                  </span>
                  <span className="inline-flex items-center gap-1 font-display font-extrabold text-emerald-700 tabular-nums">
                    <Coins className="h-4 w-4 text-amber-500" />
                    {formatCurrencyAmount(cash, rewardConfig.currency)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span className={tier.colorClass}>{tier.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-display text-sm font-black text-sky-700 tabular-nums">
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Horizontal Track Lane: LEFT Start -> RIGHT Treasure Finish */}
              <div
                dir="ltr"
                className="relative h-14 w-full rounded-xl bg-white/95 border border-slate-200/90 overflow-visible"
              >
                {/* Checkered Start Band on LEFT edge */}
                <div
                  aria-hidden="true"
                  className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-xl bg-emerald-400/70"
                />

                {/* Checkered Finish Band on RIGHT edge */}
                <div
                  aria-hidden="true"
                  className="checkered-flag absolute right-0 top-0 bottom-0 w-4 rounded-r-xl opacity-85"
                />

                {/* Dashed road background */}
                <div className="track-road absolute inset-y-0 left-3 right-5 pointer-events-none" />

                {/* Progress Fill Bar growing from LEFT to RIGHT */}
                <motion.div
                  initial={false}
                  animate={{ width: `${Math.max(4, pct)}%` }}
                  transition={{ type: 'spring', stiffness: 75, damping: 16 }}
                  className={`absolute top-1.5 bottom-1.5 left-1.5 rounded-l-lg rounded-r-full bg-gradient-to-r ${char.trackFill} opacity-25`}
                />

                {/* 25%, 50%, 75% subtle tick marks */}
                {[25, 50, 75].map((mark) => (
                  <div
                    key={mark}
                    aria-hidden="true"
                    style={{ left: `${mark}%` }}
                    className="absolute top-0 bottom-0 w-px border-l border-dashed border-slate-300/80"
                  />
                ))}

                {/* Treasure chest finish icon on far RIGHT */}
                <div
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-xl select-none"
                  title="صندوق الكنز والجائزة النقدية"
                >
                  🎁
                </div>

                {/* Moving Cartoon Avatar Token */}
                <motion.div
                  initial={false}
                  animate={{ left: `${vehicleLeftPct}%` }}
                  transition={{ type: 'spring', stiffness: 70, damping: 14 }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center"
                >
                  {/* Animated Walkie-Talkie Speech Bubble above character */}
                  {isCheering && activeCheer && (
                    <motion.div
                      dir="rtl"
                      initial={{ opacity: 0, y: 8, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 whitespace-nowrap rounded-2xl border-2 border-amber-400 bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-md"
                    >
                      <span>🎙️</span>
                      <span>{activeCheer.phrase}</span>
                      <span className="flex items-end gap-0.5 h-3.5" aria-hidden="true">
                        <span className="w-0.5 h-full rounded-full bg-amber-400 animate-wave-1" />
                        <span className="w-0.5 h-full rounded-full bg-sky-400 animate-wave-2" />
                        <span className="w-0.5 h-full rounded-full bg-emerald-400 animate-wave-3" />
                        <span className="w-0.5 h-full rounded-full bg-rose-400 animate-wave-4" />
                      </span>
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-amber-400 bg-slate-900" />
                    </motion.div>
                  )}

                  {/* Recent Points Boost Celebration Tag */}
                  {isBoosted && recentBoost && !isCheering && (
                    <motion.div
                      dir="rtl"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: -2 }}
                      className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-extrabold text-white shadow-sm tabular-nums"
                    >
                      <Sparkles className="h-3 w-3" />
                      +{recentBoost.delta} نقطة!
                    </motion.div>
                  )}

                  {/* Avatar Circle */}
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-white text-2xl shadow-md transition-transform ${
                      isCheering ? 'scale-115 ring-4 ring-amber-300' : ''
                    }`}
                  >
                    <span className={char.flipForRtl ? '-scale-x-100 inline-block' : 'inline-block'}>
                      {char.emoji}
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
