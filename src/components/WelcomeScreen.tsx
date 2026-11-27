import { useState } from 'react';
import { Play, Trophy, Lock, Mic, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Player, RewardConfig } from '../types';
import { getCharacterMeta } from '../data/characters';
import { formatCurrencyAmount } from '../utils/storage';
import { soundEngine } from '../utils/soundEngine';

interface WelcomeScreenProps {
  players: Player[];
  rewardConfig: RewardConfig;
  totalQuestionsCount: number;
  onEnterRaceTrack: () => void;
  onOpenChampions: () => void;
  onOpenParent: () => void;
  onOpenWalkieTalkie: () => void;
}

export const ATEEG_EMBLEM_URL = '/src/assets/images/ateeg_family_emblem_1795205240689.jpg';

export function WelcomeScreen({
  players,
  rewardConfig,
  totalQuestionsCount,
  onEnterRaceTrack,
  onOpenChampions,
  onOpenParent,
  onOpenWalkieTalkie,
}: WelcomeScreenProps) {
  const [emblemError, setEmblemError] = useState(false);

  const rewardSummary =
    rewardConfig.mode === 'podium'
      ? `جائزة المركز الأول: ${formatCurrencyAmount(rewardConfig.firstPrize, rewardConfig.currency)}`
      : `كل ${rewardConfig.pointsStep} نقطة = ${formatCurrencyAmount(rewardConfig.cashPerStep, rewardConfig.currency)}`;

  return (
    <section
      aria-label="واجهة الدخول — تحدي أبطال عائلة عتيق"
      className="mx-auto max-w-4xl py-2 sm:py-6"
    >
      <div className="relative overflow-hidden rounded-[2rem] border-2 border-sky-200 bg-white p-6 sm:p-10 shadow-sm text-center">
        {/* Subtle joyful top sky-gold accent band */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2.5 bg-gradient-to-l from-amber-400 via-sky-500 to-emerald-400"
        />

        {/* Prominent Ateeg Family Crest Emblem */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-5 flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-3xl border-4 border-amber-200 bg-gradient-to-b from-sky-50 to-amber-50/40 p-2 shadow-sm"
        >
          {!emblemError ? (
            <img
              src={ATEEG_EMBLEM_URL}
              alt="شعار تحدي أبطال عائلة عتيق"
              referrerPolicy="no-referrer"
              onError={() => setEmblemError(true)}
              className="h-full w-full object-contain mix-blend-multiply"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-amber-500">
              <Trophy className="h-16 w-16" />
              <span className="mt-1 font-display text-sm font-black text-sky-900">عائلة عتيق</span>
            </div>
          )}
        </motion.div>

        {/* Main Family Title */}
        <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
          تحدي أبطال عائلة عتيق
        </h1>
        <p className="mt-2 font-display text-base sm:text-xl font-extrabold text-sky-700" dir="ltr">
          Ateeg Family Champions
        </p>

        <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base font-medium text-slate-600 leading-relaxed">
          مغامرة تعليمية شيّقة لأبطال عائلة عتيق! أدر عجلة الحظ، أجب بسرعة، انطلق بمركبتك نحو
          صندوق الكنز، وشجّع إخوتك بميكروفون التشجيع المرح.
        </p>

        {/* Clean Unboxed Key Info Strip */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm font-bold text-slate-600">
          <span className="text-sky-800 tabular-nums">{players.length} أبطال جاهزون للسباق</span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-700 tabular-nums">{totalQuestionsCount} سؤالاً تعليمياً</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-700">{rewardSummary}</span>
        </div>

        {/* Registered Ateeg Family Racers Preview */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {players.map((p) => {
            const char = getCharacterMeta(p.character);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-2xl border-2 ${char.laneBorder} ${char.laneBg} px-3.5 py-2`}
              >
                <span className="text-2xl">{char.emoji}</span>
                <span className="font-display text-sm font-extrabold text-slate-900">{p.name}</span>
              </div>
            );
          })}
        </div>

        {/* Single Dominant Primary CTA */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playVehicleMove();
              onEnterRaceTrack();
            }}
            className="btn-tactile flex w-full max-w-md items-center justify-center gap-3 rounded-2xl border-b-4 border-sky-800 bg-sky-600 px-8 py-4 font-display text-xl sm:text-2xl font-black text-white shadow-md hover:bg-sky-500 cursor-pointer whitespace-nowrap"
          >
            <Play className="h-6 w-6 fill-current" />
            <span>انطلق إلى مضمار السباق 🏁</span>
          </button>

          {/* Secondary Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenWalkieTalkie();
              }}
              className="btn-tactile flex items-center gap-2 rounded-2xl border-2 border-b-4 border-rose-300 bg-rose-50 px-4 py-2.5 font-display text-sm font-extrabold text-rose-800 hover:bg-rose-100 cursor-pointer whitespace-nowrap"
            >
              <Mic className="h-4 w-4" />
              <span>اضغط للتحدث والتشجيع 🎙️</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenChampions();
              }}
              className="btn-tactile flex items-center gap-2 rounded-2xl border-2 border-b-4 border-amber-300 bg-amber-50 px-4 py-2.5 font-display text-sm font-extrabold text-amber-900 hover:bg-amber-100 cursor-pointer whitespace-nowrap"
            >
              <Trophy className="h-4 w-4 text-amber-600" />
              <span>قاعة أبطال عائلة عتيق</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenParent();
              }}
              className="btn-tactile flex items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-300 bg-slate-50 px-4 py-2.5 font-display text-sm font-extrabold text-slate-800 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              <Lock className="h-4 w-4 text-slate-600" />
              <span>لوحة تحكم ولي الأمر</span>
            </button>
          </div>
        </div>

        {/* 4 Educational Domains Highlight */}
        <div className="mt-8 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-6 sm:grid-cols-4 text-right">
          {[
            { emoji: '🧮', title: 'الرياضيات والألغاز', bg: 'bg-amber-50 border-amber-100' },
            { emoji: '🔤', title: 'الإنجليزية الممتعة', bg: 'bg-sky-50 border-sky-100' },
            { emoji: '🚀', title: 'العلوم والفضاء', bg: 'bg-emerald-50 border-emerald-100' },
            { emoji: '🌙', title: 'الثقافة الإسلامية', bg: 'bg-violet-50 border-violet-100' },
          ].map((item) => (
            <div
              key={item.title}
              className={`flex items-center gap-2 rounded-2xl border p-3 ${item.bg}`}
            >
              <span className="text-2xl shrink-0">{item.emoji}</span>
              <span className="font-display text-xs sm:text-sm font-extrabold text-slate-800">
                {item.title}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>مخصصة لمتعة وتعلّم أبطال عائلة عتيق · تعمل محلياً بدون إنترنت أو خوادم</span>
        </div>
      </div>
    </section>
  );
}
