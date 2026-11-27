import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Copy,
  Check,
  DoorOpen,
  Pencil,
  Mic,
  Wifi,
  Clock,
  Rocket,
  Coins,
} from 'lucide-react';
import { ActiveCheer, FamilyRoom, Player } from '../types';
import { getAgeLevelMeta, getCharacterMeta } from '../data/characters';
import { calculatePlayerCash, formatCurrencyAmount } from '../utils/storage';
import { MAX_ROOM_PLAYERS } from '../utils/roomService';
import { soundEngine } from '../utils/soundEngine';
import { RaceTrack } from './RaceTrack';
import { ATEEG_EMBLEM_URL } from './WelcomeScreen';

interface LobbyScreenProps {
  room: FamilyRoom;
  players: Player[];
  activePlayersCount: number;
  currentPlayerId: string;
  activeCheer: ActiveCheer | null;
  recentBoost: { playerId: string; delta: number } | null;
  isRoomAdmin: boolean;
  onEditMyProfile: (player: Player) => void;
  onOpenWalkieTalkie: () => void;
  onSwitchRoom: () => void;
  onForceStartNow?: () => void;
}

export function LobbyScreen({
  room,
  players,
  activePlayersCount,
  currentPlayerId,
  activeCheer,
  recentBoost,
  isRoomAdmin,
  onEditMyProfile,
  onOpenWalkieTalkie,
  onSwitchRoom,
  onForceStartNow,
}: LobbyScreenProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [emblemImgError, setEmblemImgError] = useState(false);

  const minNeeded = room.minPlayersToStart;
  const remainingNeeded = Math.max(0, minNeeded - activePlayersCount);
  const fillPct = Math.min(100, Math.round((activePlayersCount / Math.max(1, minNeeded)) * 100));
  const emptySlotsCount = Math.max(0, minNeeded - players.length);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopiedCode(true);
      soundEngine.playCorrect();
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Ateeg Family Banner + Room Code Share */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-amber-200 bg-gradient-to-l from-white via-sky-50/60 to-amber-50/70 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-300 bg-white p-1 shadow-xs">
            {!emblemImgError ? (
              <img
                src={ATEEG_EMBLEM_URL}
                alt="شعار عائلة عتيق"
                referrerPolicy="no-referrer"
                onError={() => setEmblemImgError(true)}
                className="h-full w-full object-contain mix-blend-multiply"
              />
            ) : (
              <span className="text-3xl">👑</span>
            )}
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-3xl font-black text-slate-900">
              تحدي أبطال عائلة عتيق
            </h1>
            <p className="text-xs sm:text-sm font-bold text-sky-700">
              غرفة الانتظار للانطلاق · رمز الغرفة:{' '}
              <span dir="ltr" className="font-black text-amber-800">
                {room.roomCode}
              </span>{' '}
              · الجولة القادمة #{room.roundNumber} · الموسم {room.seasonNumber}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="btn-tactile flex items-center gap-1.5 rounded-2xl border-2 border-sky-200 bg-white px-4 py-2.5 font-display text-xs sm:text-sm font-extrabold text-sky-800 hover:bg-sky-50 cursor-pointer whitespace-nowrap"
          >
            {copiedCode ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copiedCode ? 'تم نسخ رمز الغرفة!' : 'نسخ رمز الغرفة للدعوة'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onSwitchRoom();
            }}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 font-display text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <DoorOpen className="h-4 w-4" />
            <span>تبديل الغرفة</span>
          </button>
        </div>
      </div>

      {/* Focal Anchor: Synchronized Lobby Waiting Card */}
      <section
        aria-label="غرفة انتظار الأبطال للانطلاق"
        className="rounded-3xl border-2 border-sky-300 bg-white p-5 sm:p-7 shadow-sm space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-3xl">
              🚀
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900">
                غرفة الانتظار للانطلاق الجماعي
              </h2>
              <p className="mt-0.5 text-sm sm:text-base font-extrabold text-sky-700">
                {remainingNeeded > 0 ? (
                  <>
                    بانتظار انضمام بقية الأبطال... (
                    <span className="tabular-nums text-amber-600">
                      {activePlayersCount} / {minNeeded}
                    </span>{' '}
                    كحد أدنى)
                  </>
                ) : (
                  <span className="text-emerald-700">
                    اكتمل العدد! جاري إطلاق العدّ التنازلي المشترك (3.. 2.. 1.. انطلق!) 🎉
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-bold text-slate-600">
            <span className="inline-flex items-center gap-1.5 text-sky-700 tabular-nums">
              <Users className="h-4 w-4" />
              المتصلون: {activePlayersCount} / {MAX_ROOM_PLAYERS}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 text-amber-700 tabular-nums">
              <Clock className="h-4 w-4" />
              مدة الجولة: {room.roundDurationSeconds} ثانية
            </span>
          </div>
        </div>

        {/* Lobby Readiness Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold">
            <span className="text-slate-700">
              {remainingNeeded > 0
                ? `متبقي دخول ${remainingNeeded === 1 ? 'بطل واحد' : `${remainingNeeded} أبطال`} لتبدأ الجولة تلقائياً على جميع الجوالات`
                : 'الجميع مستعد للانطلاق!'}
            </span>
            <span className="font-display text-sky-700 tabular-nums">
              {activePlayersCount} / {minNeeded}
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full border border-sky-200 bg-sky-50">
            <motion.div
              initial={false}
              animate={{ width: `${fillPct}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 16 }}
              className={`h-full rounded-full ${
                remainingNeeded === 0
                  ? 'bg-gradient-to-l from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-l from-sky-500 to-amber-400'
              }`}
            />
          </div>
        </div>

        {/* Live Grid of Joined Heroes + Empty Waiting Slots */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => {
            const char = getCharacterMeta(player.character);
            const tier = getAgeLevelMeta(player.level);
            const cash = calculatePlayerCash(player, players, room.rewardConfig);
            const isMe = player.id === currentPlayerId;
            const isCheering = activeCheer?.playerId === player.id;

            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative flex items-center justify-between gap-3 rounded-2xl border-2 p-4 transition-colors ${
                  isMe
                    ? 'border-sky-400 bg-gradient-to-l from-sky-50 via-white to-amber-50/40 shadow-xs'
                    : `${char.laneBorder} ${char.laneBg}`
                }`}
              >
                {isCheering && activeCheer && (
                  <div className="absolute -top-9 right-3 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-2xl border-2 border-amber-400 bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-md">
                    <span>🎙️</span>
                    <span>{activeCheer.phrase}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-white text-3xl shadow-xs">
                    {char.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-base sm:text-lg font-black text-slate-900">
                        {player.name}
                        {isMe ? ' (أنت)' : ''}
                      </span>
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onEditMyProfile(player);
                          }}
                          title="تعديل اسمي وشخصيتي"
                          aria-label="تعديل اسمي وشخصيتي"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-700 hover:bg-sky-100 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-600 tabular-nums">
                      <span className={tier.colorClass}>{tier.name}</span> ·{' '}
                      <span className="text-emerald-700">
                        <Wifi className="inline h-3 w-3 ml-0.5" />
                        جاهز في الغرفة
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs font-extrabold text-slate-700 tabular-nums">
                      <span>{player.points.toLocaleString('en-US')} نقطة</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-0.5 text-emerald-700">
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                        {formatCurrencyAmount(cash, room.rewardConfig.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Empty Waiting Slots up to minPlayersToStart */}
          {Array.from({ length: emptySlotsCount }).map((_, idx) => (
            <div
              key={`waiting-${idx}`}
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/40 p-4 text-slate-500"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-sky-300 bg-white text-2xl opacity-70">
                ⏳
              </div>
              <div>
                <div className="font-display text-sm sm:text-base font-extrabold text-slate-600">
                  بانتظار البطل #{players.length + idx + 1}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  أرسل رمز الغرفة <span dir="ltr" className="font-black text-sky-700">{room.roomCode}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Helpful Info + Optional Parent Admin Force-Start */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs sm:text-sm font-bold text-amber-950">
          <span>
            ⚡ فور اكتمال {minNeeded} أبطال، سيبدأ عداد <strong className="font-black">3.. 2.. 1.. انطلق!</strong> على جميع الجوالات معاً لسباق مدته{' '}
            <strong className="font-black tabular-nums">{room.roundDurationSeconds} ثانية</strong>!
          </span>
          {isRoomAdmin && onForceStartNow && players.length >= 1 && remainingNeeded > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onForceStartNow();
              }}
              className="btn-tactile flex items-center gap-1.5 rounded-xl border-b-2 border-amber-700 bg-amber-500 px-3.5 py-2 font-display text-xs font-black text-white hover:bg-amber-400 cursor-pointer whitespace-nowrap"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>بدء فوري (ولي الأمر)</span>
            </button>
          )}
        </div>
      </section>

      {/* Cumulative Live Race Track Preview */}
      {players.length > 0 && (
        <RaceTrack
          players={players}
          currentPlayerId={currentPlayerId}
          rewardConfig={room.rewardConfig}
          activeCheer={activeCheer}
          recentBoost={recentBoost}
        />
      )}

      {/* Prominent Bottom Live Walkie-Talkie Bar */}
      <section
        aria-label="المحادثة الصوتية بين البيوت"
        className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-rose-200 bg-gradient-to-l from-rose-50 via-white to-amber-50 p-5 shadow-sm"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
            🎙️
          </div>
          <div>
            <h3 className="font-display text-lg sm:text-xl font-black text-slate-900">
              نادِ بقية الأبطال عبر الميكروفون المباشر!
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-600">
              سجّل رسالة حتى 5 ثوانٍ بصوت طبيعي أو سنجاب مرح 🐿️ أو روبوت 🤖 لتصل فوراً لجوالات الجميع وتُحذف تلقائياً للخصوصية
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onOpenWalkieTalkie();
          }}
          className="btn-tactile flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-2xl border-b-4 border-rose-700 bg-rose-500 px-6 py-4 font-display text-base sm:text-lg font-black text-white shadow-sm hover:bg-rose-400 cursor-pointer whitespace-nowrap"
        >
          <Mic className="h-5 w-5" />
          <span>اضغط للتحدث مع الجميع 🎙️</span>
        </button>
      </section>
    </div>
  );
}
