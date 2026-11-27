import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Sparkles,
  SkipForward,
  Zap,
  CheckCircle2,
  XCircle,
  Mic,
  Coins,
  Flame,
  Flag,
} from 'lucide-react';
import { ActiveCheer, FamilyRoom, Player, Question } from '../types';
import { getAgeLevelMeta, getCategoryMeta, getCharacterMeta } from '../data/characters';
import { calculatePlayerCash, formatCurrencyAmount } from '../utils/storage';
import { getSyncedNowMs } from '../utils/roomService';
import { soundEngine } from '../utils/soundEngine';

interface LiveSprintRoundProps {
  room: FamilyRoom;
  player: Player;
  players: Player[];
  allQuestions: Question[];
  activeCheer: ActiveCheer | null;
  recentBoost: { playerId: string; delta: number } | null;
  onAnswerScored: (pointsDelta: number) => void;
  onOpenWalkieTalkie: () => void;
}

const BASE_SPRINT_POINTS = 100;
const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatClockMmSs(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LiveSprintRound({
  room,
  player,
  players,
  allQuestions,
  activeCheer,
  recentBoost,
  onAnswerScored,
  onOpenWalkieTalkie,
}: LiveSprintRoundProps) {
  // Build continuous age-appropriate shuffled question deck (custom questions prioritized first!)
  const questionDeck = useMemo(() => {
    const customSameLevel = shuffleArray(
      allQuestions.filter((q) => q.level === player.level && q.isCustom)
    );
    const builtInSameLevel = shuffleArray(
      allQuestions.filter((q) => q.level === player.level && !q.isCustom)
    );
    const fallbackOtherLevels = shuffleArray(
      allQuestions.filter((q) => q.level !== player.level)
    );
    return [...customSameLevel, ...builtInSameLevel, ...fallbackOtherLevels];
  }, [allQuestions, player.level, room.roundNumber]);

  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [localAnsweredCount, setLocalAnsweredCount] = useState(0);
  const [localCorrectCount, setLocalCorrectCount] = useState(0);
  const [localPoints, setLocalPoints] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<{
    correct: boolean;
    points: number;
    correctAnswerText: string;
  } | null>(null);

  // 3 Sprint Lifelines per 60-second round
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedSkip, setUsedSkip] = useState(false);
  const [usedDoublePoints, setUsedDoublePoints] = useState(false);
  const [doubleActiveNow, setDoubleActiveNow] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);

  // Synchronized 60-second shared timer
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Math.max(0, room.roundEndAtMs - getSyncedNowMs())
  );
  const lastUrgentSecRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  // Reset per-round local state whenever a new roundNumber starts
  useEffect(() => {
    setQIndex(0);
    setSelectedOption(null);
    setStreak(0);
    setLocalAnsweredCount(0);
    setLocalCorrectCount(0);
    setLocalPoints(0);
    setLastFeedback(null);
    setUsedFiftyFifty(false);
    setUsedSkip(false);
    setUsedDoublePoints(false);
    setDoubleActiveNow(false);
    setEliminatedOptions([]);
    lastUrgentSecRef.current = null;
  }, [room.roundNumber]);

  // High-precision shared clock tick + last 10 seconds red alert sound
  useEffect(() => {
    const tick = () => {
      const rem = Math.max(0, room.roundEndAtMs - getSyncedNowMs());
      setRemainingMs(rem);
      const sec = Math.ceil(rem / 1000);
      if (sec > 0 && sec <= 10 && lastUrgentSecRef.current !== sec) {
        lastUrgentSecRef.current = sec;
        soundEngine.playTickUrgent();
      }
    };

    tick();
    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [room.roundEndAtMs]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const secondsLeft = Math.ceil(remainingMs / 1000);
  const totalDurationMs = Math.max(1000, room.roundDurationSeconds * 1000);
  const timerPct = Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100));
  const isFinalTenSeconds = secondsLeft <= 10 && secondsLeft > 0;
  const isTimeOver = remainingMs <= 0;

  const currentQuestion = questionDeck[qIndex % Math.max(1, questionDeck.length)];
  const char = getCharacterMeta(player.character);
  const tier = getAgeLevelMeta(player.level);
  const catMeta = currentQuestion ? getCategoryMeta(currentQuestion.category) : null;
  const targetPoints = Math.max(100, room.rewardConfig.targetTrackPoints);

  const advanceToNextQuestion = () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setQIndex((i) => i + 1);
    setSelectedOption(null);
    setLastFeedback(null);
    setEliminatedOptions([]);
    setDoubleActiveNow(false);
  };

  const handleSelectOption = (optionIdx: number) => {
    if (isTimeOver || selectedOption !== null || !currentQuestion) return;
    setSelectedOption(optionIdx);
    setLocalAnsweredCount((c) => c + 1);

    const isCorrect = optionIdx === currentQuestion.correctIndex;
    if (isCorrect) {
      const nextStreak = streak + 1;
      const streakBonus = Math.min(50, (nextStreak - 1) * 10);
      const multiplier = doubleActiveNow ? 2 : 1;
      const earned = (BASE_SPRINT_POINTS + streakBonus) * multiplier;

      setStreak(nextStreak);
      setLocalCorrectCount((c) => c + 1);
      setLocalPoints((p) => p + earned);
      setLastFeedback({
        correct: true,
        points: earned,
        correctAnswerText: currentQuestion.options[currentQuestion.correctIndex],
      });
      soundEngine.playCorrect();
      // Immediately push real-time progress to Firebase so all phones see avatar advance!
      onAnswerScored(earned);

      advanceTimerRef.current = window.setTimeout(advanceToNextQuestion, 520);
    } else {
      setStreak(0);
      setLastFeedback({
        correct: false,
        points: 0,
        correctAnswerText: currentQuestion.options[currentQuestion.correctIndex],
      });
      soundEngine.playWrong();

      advanceTimerRef.current = window.setTimeout(advanceToNextQuestion, 900);
    }
  };

  const handleFiftyFifty = () => {
    if (usedFiftyFifty || selectedOption !== null || isTimeOver || !currentQuestion) return;
    soundEngine.playLifeline();
    const wrongs = [0, 1, 2, 3].filter((idx) => idx !== currentQuestion.correctIndex);
    setEliminatedOptions(shuffleArray(wrongs).slice(0, 2));
    setUsedFiftyFifty(true);
  };

  const handleSkip = () => {
    if (usedSkip || selectedOption !== null || isTimeOver) return;
    soundEngine.playLifeline();
    setUsedSkip(true);
    advanceToNextQuestion();
  };

  const handleDoublePoints = () => {
    if (usedDoublePoints || selectedOption !== null || isTimeOver) return;
    soundEngine.playLifeline();
    setUsedDoublePoints(true);
    setDoubleActiveNow(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* 1. GIANT SHARED 60-SECOND ROUND TIMER BAR */}
      <section
        aria-label="مؤقت الجولة الموحد"
        className={`rounded-3xl border-2 p-4 sm:p-5 shadow-sm transition-colors ${
          isFinalTenSeconds
            ? 'border-rose-500 bg-rose-50 ring-4 ring-rose-200/80'
            : 'border-sky-300 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Player Sprint Identity & Live Stats */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-200 bg-sky-50 text-2xl">
              {char.emoji}
            </div>
            <div>
              <div className="font-display text-base sm:text-lg font-black text-slate-900">
                الجولة #{room.roundNumber} · {player.name}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 tabular-nums">
                <span className={tier.colorClass}>{tier.name}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700">نقاط هذه الجولة: +{localPoints}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700">
                  إجابات صحيحة: {localCorrectCount}/{localAnsweredCount}
                </span>
                {streak >= 2 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-0.5 font-extrabold text-orange-600">
                      <Flame className="h-3.5 w-3.5 fill-orange-400" />
                      سلسلة ×{streak}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center Giant Synchronized Countdown Clock */}
          <motion.div
            animate={isFinalTenSeconds ? { scale: [1, 1.07, 1] } : { scale: 1 }}
            transition={isFinalTenSeconds ? { repeat: Infinity, duration: 0.7 } : undefined}
            className={`flex items-center gap-2.5 rounded-2xl border-2 px-5 py-2.5 shadow-xs ${
              isFinalTenSeconds
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-sky-200 bg-sky-50 text-sky-900'
            }`}
          >
            <Clock className="h-6 w-6 shrink-0" />
            <span className="font-display text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
              {formatClockMmSs(secondsLeft)}
            </span>
            {isFinalTenSeconds && (
              <span className="text-xs sm:text-sm font-black whitespace-nowrap">
                أسرع يا بطل! 🔥
              </span>
            )}
          </motion.div>

          {/* Quick Walkie-Talkie Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onOpenWalkieTalkie();
            }}
            className="btn-tactile flex items-center gap-1.5 rounded-2xl border-b-4 border-rose-700 bg-rose-500 px-3.5 py-2.5 font-display text-xs sm:text-sm font-extrabold text-white hover:bg-rose-400 cursor-pointer whitespace-nowrap"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">تحدث مع الجميع 🎙️</span>
            <span className="sm:hidden">تحدث 🎙️</span>
          </button>
        </div>

        {/* Unified Smooth Countdown Progress Bar */}
        <div className="mt-3.5 h-3.5 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              isFinalTenSeconds
                ? 'bg-rose-600'
                : secondsLeft <= 20
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      </section>

      {/* 2. LIVE REAL-TIME SHARED RACE TRACK (Visible to every child while answering!) */}
      <section
        aria-label="مضمار السباق المباشر أثناء الجولة"
        className="rounded-3xl border-2 border-amber-200 bg-white p-3.5 sm:p-4 shadow-sm"
      >
        <div
          dir="ltr"
          className="mb-2 flex items-center justify-between px-1 text-[11px] sm:text-xs font-extrabold text-slate-500"
        >
          <span className="flex items-center gap-1 text-emerald-700">
            <Flag className="h-3.5 w-3.5" />
            <span>خط الانطلاق</span>
          </span>
          <span dir="rtl" className="font-display text-sky-800">
            السباق الحي بين البيوت 🏁
          </span>
          <span className="text-amber-700">صندوق الكنز 🏆</span>
        </div>

        <div className="space-y-2">
          {players.map((p) => {
            const pChar = getCharacterMeta(p.character);
            const pct = Math.min(100, Math.round((p.points / targetPoints) * 100));
            const cash = calculatePlayerCash(p, players, room.rewardConfig);
            const isMe = p.id === player.id;
            const isCheering = activeCheer?.playerId === p.id;
            const isBoosted = recentBoost?.playerId === p.id;
            const roundPts = p.currentRoundNumber === room.roundNumber ? p.currentRoundPoints : 0;
            const vehicleLeftPct = Math.min(91, Math.max(5, pct * 0.86 + 5));

            return (
              <div
                key={p.id}
                className={`rounded-xl border px-2.5 py-1.5 transition-colors ${
                  isMe
                    ? 'border-sky-400 bg-sky-50/70'
                    : isBoosted
                    ? 'border-amber-400 bg-amber-50/70'
                    : `${pChar.laneBorder} ${pChar.laneBg}`
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-display font-black text-slate-900">
                    <span>{pChar.emoji}</span>
                    <span>
                      {p.name}
                      {isMe ? ' (أنت)' : ''}
                    </span>
                    <span className="font-bold text-slate-600 tabular-nums">
                      ({p.points.toLocaleString('en-US')} نقطة)
                    </span>
                    <span aria-hidden="true" className="text-slate-400">
                      -
                    </span>
                    <span className="inline-flex items-center gap-0.5 font-extrabold text-emerald-700 tabular-nums">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      {formatCurrencyAmount(cash, room.rewardConfig.currency)}
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-amber-700 tabular-nums">
                    الجولة: +{roundPts} · {pct}%
                  </div>
                </div>

                <div
                  dir="ltr"
                  className="relative h-9 w-full rounded-lg border border-slate-200/80 bg-white overflow-visible"
                >
                  <div className="track-road absolute inset-y-0 left-2 right-4 pointer-events-none" />
                  <div className="checkered-flag absolute right-0 top-0 bottom-0 w-3 rounded-r-lg opacity-80" />
                  <motion.div
                    initial={false}
                    animate={{ width: `${Math.max(4, pct)}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                    className={`absolute top-1 bottom-1 left-1 rounded-l-md rounded-r-full bg-gradient-to-r ${pChar.trackFill} opacity-25`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm select-none">
                    🎁
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ left: `${vehicleLeftPct}%` }}
                    transition={{ type: 'spring', stiffness: 85, damping: 15 }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  >
                    {isCheering && activeCheer && (
                      <div
                        dir="rtl"
                        className="absolute -top-9 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 whitespace-nowrap rounded-xl border border-amber-400 bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md"
                      >
                        <span>🎙️</span>
                        <span>{activeCheer.phrase}</span>
                      </div>
                    )}
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-white text-base shadow-sm">
                      <span className={pChar.flipForRtl ? '-scale-x-100 inline-block' : 'inline-block'}>
                        {pChar.emoji}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. RAPID-FIRE QUESTION CARD + 3 SPRINT LIFELINES */}
      {currentQuestion && (
        <section
          aria-label="سؤال التحدي السريع"
          className="rounded-3xl border-2 border-sky-200 bg-white p-4 sm:p-6 shadow-sm space-y-4"
        >
          {/* Category + 3 Fast Sprint Lifelines */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs sm:text-sm font-extrabold text-sky-800">
              {catMeta?.emoji} {catMeta?.name} · السؤال #{qIndex + 1}
              {doubleActiveNow && (
                <span className="mr-2 text-amber-600">⚡ نقاط مضاعفة ×2 مفعّلة!</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={usedFiftyFifty || selectedOption !== null || isTimeOver}
                onClick={handleFiftyFifty}
                className={`btn-tactile flex items-center gap-1 rounded-xl border-2 px-3 py-1.5 font-display text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                  usedFiftyFifty
                    ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed'
                    : 'border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>حذف إجابتين</span>
              </button>

              <button
                type="button"
                disabled={usedDoublePoints || selectedOption !== null || isTimeOver}
                onClick={handleDoublePoints}
                className={`btn-tactile flex items-center gap-1 rounded-xl border-2 px-3 py-1.5 font-display text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                  usedDoublePoints
                    ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>نقاط ×2</span>
              </button>

              <button
                type="button"
                disabled={usedSkip || selectedOption !== null || isTimeOver}
                onClick={handleSkip}
                className={`btn-tactile flex items-center gap-1 rounded-xl border-2 px-3 py-1.5 font-display text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                  usedSkip
                    ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed'
                    : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <SkipForward className="h-3.5 w-3.5" />
                <span>تخطي فوري</span>
              </button>
            </div>
          </div>

          {/* Question Visual Emoji + Prompt */}
          <div className="flex flex-col items-center text-center">
            {currentQuestion.visualEmoji && (
              <div className="mb-3 flex min-h-16 min-w-20 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 px-5 py-2 text-4xl sm:text-5xl">
                {currentQuestion.visualEmoji}
              </div>
            )}
            <h3 className="font-display text-xl sm:text-2xl font-black leading-relaxed text-slate-900">
              {currentQuestion.prompt}
            </h3>
          </div>

          {/* 4 Large Touch-Friendly Answer Buttons */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentQuestion.options.map((opt, idx) => {
              const isEliminated = eliminatedOptions.includes(idx);
              const isAnswered = selectedOption !== null;
              const isCorrect = idx === currentQuestion.correctIndex;
              const isPicked = selectedOption === idx;

              let btnStyle =
                'border-slate-200 border-b-slate-300 bg-slate-50 text-slate-900 hover:border-sky-400 hover:bg-sky-50';

              if (isAnswered) {
                if (isCorrect) {
                  btnStyle = 'border-emerald-500 border-b-emerald-700 bg-emerald-500 text-white';
                } else if (isPicked && !isCorrect) {
                  btnStyle = 'border-rose-500 border-b-rose-700 bg-rose-500 text-white';
                } else {
                  btnStyle = 'border-slate-200 bg-slate-50 text-slate-400 opacity-60';
                }
              } else if (isEliminated) {
                btnStyle =
                  'border-slate-100 bg-slate-50 text-slate-300 opacity-35 cursor-not-allowed line-through';
              }

              return (
                <button
                  key={`${qIndex}-${idx}`}
                  type="button"
                  disabled={isAnswered || isEliminated || isTimeOver}
                  onClick={() => handleSelectOption(idx)}
                  className={`btn-tactile flex min-h-16 items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3 text-right font-display text-base sm:text-lg font-extrabold cursor-pointer ${btnStyle}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      isAnswered && (isCorrect || isPicked)
                        ? 'bg-white/25 text-white'
                        : 'bg-white text-slate-700 shadow-xs'
                    }`}
                  >
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span className="flex-1 leading-snug">{opt}</span>
                  {isAnswered && isCorrect && <CheckCircle2 className="h-6 w-6 shrink-0" />}
                  {isAnswered && isPicked && !isCorrect && <XCircle className="h-6 w-6 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Ultra-fast Feedback Banner */}
          {lastFeedback && (
            <div
              onClick={advanceToNextQuestion}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2.5 text-sm font-extrabold cursor-pointer ${
                lastFeedback.correct
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-rose-300 bg-rose-50 text-rose-800'
              }`}
            >
              <span>
                {lastFeedback.correct
                  ? `رائع! +${lastFeedback.points} نقطة 🚀 جاري الانتقال للسؤال التالي...`
                  : `الإجابة الصحيحة: ${lastFeedback.correctAnswerText} — استعد للسؤال التالي!`}
              </span>
              <span className="text-xs underline whitespace-nowrap">التالي ←</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
