import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  SkipForward,
  Sparkles,
  CheckCircle2,
  XCircle,
  Mic,
  ArrowRight,
  Zap,
  Trophy,
} from 'lucide-react';
import { ActiveCheer, CategoryId, Player, Question, RewardConfig } from '../types';
import { getAgeLevelMeta, getCategoryMeta, getCharacterMeta } from '../data/characters';
import { soundEngine } from '../utils/soundEngine';
import { FortuneWheel } from './FortuneWheel';
import { formatCurrencyAmount } from '../utils/storage';

interface QuizEngineProps {
  player: Player;
  allQuestions: Question[];
  rewardConfig: RewardConfig;
  activeCheer: ActiveCheer | null;
  onOpenWalkieTalkie: () => void;
  onAnswerScored: (pointsDelta: number) => void;
  onRoundComplete: (result: {
    playerId: string;
    pointsEarned: number;
    correctCount: number;
  }) => void;
  onExit: () => void;
}

const QUESTIONS_PER_ROUND = 8;
const SECONDS_PER_QUESTION = 20;
const BASE_POINTS = 100;
const SPEED_BONUS_PER_SEC = 5;
const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizEngine({
  player,
  allQuestions,
  rewardConfig,
  activeCheer,
  onOpenWalkieTalkie,
  onAnswerScored,
  onRoundComplete,
  onExit,
}: QuizEngineProps) {
  const [stage, setStage] = useState<'wheel' | 'playing' | 'summary'>('wheel');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('math');
  const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [maxTimeForQ, setMaxTimeForQ] = useState(SECONDS_PER_QUESTION);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const [roundPoints, setRoundPoints] = useState(0);
  const [roundSpeedBonus, setRoundSpeedBonus] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastAwarded, setLastAwarded] = useState<{ base: number; speed: number } | null>(null);

  // 3 Lifelines per round
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedExtraTime, setUsedExtraTime] = useState(false);
  const [usedSkip, setUsedSkip] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);

  const completedRef = useRef(false);

  const char = getCharacterMeta(player.character);
  const tier = getAgeLevelMeta(player.level);
  const categoryMeta = getCategoryMeta(selectedCategory);

  const currentQuestion: Question | undefined = questionQueue[currentIndex];
  const isAnswered = selectedOption !== null || timedOut;

  // Build shuffled pool for selected category + player's age level (prioritizing custom questions first!)
  const startQuizForCategory = (category: CategoryId) => {
    setSelectedCategory(category);
    const matchingCustom = shuffleArray(
      allQuestions.filter((q) => q.category === category && q.level === player.level && q.isCustom)
    );
    const matchingBuiltIn = shuffleArray(
      allQuestions.filter((q) => q.category === category && q.level === player.level && !q.isCustom)
    );
    // Fallback pool if ever needed
    const fallbackSameLevel = shuffleArray(
      allQuestions.filter((q) => q.level === player.level && q.category !== category)
    );

    const pool = [...matchingCustom, ...matchingBuiltIn, ...fallbackSameLevel];
    setQuestionQueue(pool);
    setCurrentIndex(0);
    setQuestionsAnswered(0);
    setTimeLeft(SECONDS_PER_QUESTION);
    setMaxTimeForQ(SECONDS_PER_QUESTION);
    setSelectedOption(null);
    setTimedOut(false);
    setRoundPoints(0);
    setRoundSpeedBonus(0);
    setCorrectCount(0);
    setLastAwarded(null);
    setUsedFiftyFifty(false);
    setUsedExtraTime(false);
    setUsedSkip(false);
    setEliminatedOptions([]);
    completedRef.current = false;
    setStage('playing');
  };

  // Countdown timer during active question
  useEffect(() => {
    if (stage !== 'playing' || isAnswered) return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setTimedOut(true);
          soundEngine.playTimeUp();
          return 0;
        }
        if (prev <= 6) {
          soundEngine.playTickUrgent();
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [stage, isAnswered, currentIndex]);

  const handleSelectOption = (optionIdx: number) => {
    if (isAnswered || !currentQuestion) return;
    setSelectedOption(optionIdx);

    if (optionIdx === currentQuestion.correctIndex) {
      const speedBonus = timeLeft * SPEED_BONUS_PER_SEC;
      const earnedNow = BASE_POINTS + speedBonus;
      setRoundPoints((p) => p + earnedNow);
      setRoundSpeedBonus((s) => s + speedBonus);
      setCorrectCount((c) => c + 1);
      setLastAwarded({ base: BASE_POINTS, speed: speedBonus });
      soundEngine.playCorrect();
      // Immediately push live score to Firebase so all other homes see avatar glide forward!
      onAnswerScored(earnedNow);
    } else {
      setLastAwarded(null);
      soundEngine.playWrong();
    }
  };

  const handleNextQuestion = () => {
    soundEngine.playClick();
    const nextAnswered = questionsAnswered + 1;
    if (nextAnswered >= QUESTIONS_PER_ROUND || currentIndex + 1 >= questionQueue.length) {
      setQuestionsAnswered(nextAnswered);
      setStage('summary');
      soundEngine.playApplauseAndWin();
      if (!completedRef.current) {
        completedRef.current = true;
        onRoundComplete({
          playerId: player.id,
          pointsEarned: roundPoints,
          correctCount,
        });
      }
      return;
    }

    setQuestionsAnswered(nextAnswered);
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setTimedOut(false);
    setLastAwarded(null);
    setEliminatedOptions([]);
    setTimeLeft(SECONDS_PER_QUESTION);
    setMaxTimeForQ(SECONDS_PER_QUESTION);
  };

  // Lifeline 1: 50/50 eliminate 2 wrong answers
  const handleFiftyFifty = () => {
    if (usedFiftyFifty || isAnswered || !currentQuestion) return;
    soundEngine.playLifeline();
    const wrongIndices = [0, 1, 2, 3].filter((idx) => idx !== currentQuestion.correctIndex);
    const toEliminate = shuffleArray(wrongIndices).slice(0, 2);
    setEliminatedOptions(toEliminate);
    setUsedFiftyFifty(true);
  };

  // Lifeline 2: +10 extra seconds
  const handleExtraTime = () => {
    if (usedExtraTime || isAnswered) return;
    soundEngine.playLifeline();
    setTimeLeft((t) => t + 10);
    setMaxTimeForQ((m) => m + 10);
    setUsedExtraTime(true);
  };

  // Lifeline 3: Skip to a fresh replacement question without losing a question slot
  const handleSkipQuestion = () => {
    if (usedSkip || isAnswered) return;
    soundEngine.playLifeline();
    setUsedSkip(true);
    if (currentIndex + 1 < questionQueue.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setTimedOut(false);
      setLastAwarded(null);
      setEliminatedOptions([]);
      setTimeLeft(SECONDS_PER_QUESTION);
      setMaxTimeForQ(SECONDS_PER_QUESTION);
    }
  };

  const estimatedCashGain = useMemo(() => {
    if (rewardConfig.mode !== 'points') return null;
    const step = Math.max(1, rewardConfig.pointsStep);
    return Math.round(((roundPoints / step) * rewardConfig.cashPerStep) * 100) / 100;
  }, [rewardConfig, roundPoints]);

  if (stage === 'wheel') {
    return (
      <FortuneWheel
        player={player}
        onCategorySelected={startQuizForCategory}
        onCancel={onExit}
      />
    );
  }

  if (stage === 'summary') {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-amber-300 bg-white p-6 sm:p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-100 text-5xl shadow-inner">
          {char.emoji}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900">
          أحسنت يا بطل {player.name}! 🎉
        </h2>
        <p className="mt-1 text-base text-slate-600">
          أنهيت جولة <span className="font-bold text-slate-800">{categoryMeta.name}</span> بنجاح!
        </p>

        {/* Stats Breakdown */}
        <div className="my-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold text-slate-500">إجابات صحيحة</div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">
              {correctCount}/{QUESTIONS_PER_ROUND}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs font-bold text-amber-800">مجموع النقاط</div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-black text-amber-600 tabular-nums">
              +{roundPoints}
            </div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="text-xs font-bold text-sky-800">مكافأة السرعة</div>
            <div className="mt-1 font-display text-2xl sm:text-3xl font-black text-sky-600 tabular-nums">
              +{roundSpeedBonus}
            </div>
          </div>
        </div>

        {estimatedCashGain !== null && estimatedCashGain > 0 && (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-display text-base font-extrabold text-emerald-800 tabular-nums">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span>
              أضفت لرصيدك النقدي +{formatCurrencyAmount(estimatedCashGain, rewardConfig.currency)}!
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            soundEngine.playVehicleMove();
            onExit();
          }}
          className="btn-tactile flex w-full items-center justify-center gap-2.5 rounded-2xl border-b-4 border-sky-800 bg-sky-600 px-6 py-4 font-display text-xl font-black text-white hover:bg-sky-500 cursor-pointer whitespace-nowrap"
        >
          <span>شاهد تقدمك على مضمار السباق 🏁</span>
          <ArrowRight className="h-6 w-6 rotate-180" />
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const timerPct = Math.max(0, Math.min(100, (timeLeft / maxTimeForQ) * 100));
  const timerColor =
    timeLeft <= 5 ? 'bg-rose-500' : timeLeft <= 10 ? 'bg-amber-400' : 'bg-emerald-500';
  const isPlayerCheering = activeCheer?.playerId === player.id;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Top Quiz HUD Bar */}
      <div className="rounded-3xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Player + Category Info */}
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-sky-200 bg-sky-50 text-2xl">
              {char.emoji}
            </div>
            {isPlayerCheering && activeCheer && (
              <div className="absolute -top-11 right-0 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-2xl border-2 border-amber-400 bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-md">
                <span>🎙️</span>
                <span>{activeCheer.phrase}</span>
              </div>
            )}
            <div>
              <div className="font-display text-lg font-extrabold text-slate-900">
                {player.name}{' '}
                <span className="text-sm font-bold text-slate-500">
                  · {categoryMeta.emoji} {categoryMeta.shortName}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500 tabular-nums">
                السؤال {questionsAnswered + 1} من {QUESTIONS_PER_ROUND}{' '}
                <span aria-hidden="true">·</span> مستوى {tier.name}{' '}
                <span aria-hidden="true">·</span> نقاط الجولة:{' '}
                <span className="text-amber-600">{roundPoints}</span>
              </div>
            </div>
          </div>

          {/* Walkie-Talkie Cheer Button + Exit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenWalkieTalkie();
              }}
              className="btn-tactile flex items-center gap-1.5 rounded-2xl border-b-4 border-rose-700 bg-rose-500 px-3.5 py-2.5 font-display text-xs sm:text-sm font-extrabold text-white hover:bg-rose-400 cursor-pointer whitespace-nowrap"
            >
              <Mic className="h-4 w-4" />
              <span>اضغط للتحدث مع الجميع 🎙️</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onExit();
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              إنهاء
            </button>
          </div>
        </div>

        {/* 20-Second Countdown Bar */}
        <div className="mt-4 flex items-center gap-3">
          <div
            className={`flex items-center gap-1 font-display text-base font-black tabular-nums whitespace-nowrap ${
              timeLeft <= 5 ? 'text-rose-600' : 'text-slate-700'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span>{timeLeft} ث</span>
          </div>
          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${timerColor}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Lifelines Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          disabled={usedFiftyFifty || isAnswered}
          onClick={handleFiftyFifty}
          className={`btn-tactile flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 font-display text-xs sm:text-sm font-extrabold cursor-pointer whitespace-nowrap ${
            usedFiftyFifty
              ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed'
              : 'border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100'
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>حذف إجابتين</span>
        </button>

        <button
          type="button"
          disabled={usedExtraTime || isAnswered}
          onClick={handleExtraTime}
          className={`btn-tactile flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 font-display text-xs sm:text-sm font-extrabold cursor-pointer whitespace-nowrap ${
            usedExtraTime
              ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed'
              : 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100'
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span>وقت إضافي +10ث</span>
        </button>

        <button
          type="button"
          disabled={usedSkip || isAnswered}
          onClick={handleSkipQuestion}
          className={`btn-tactile flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2.5 font-display text-xs sm:text-sm font-extrabold cursor-pointer whitespace-nowrap ${
            usedSkip
              ? 'border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed'
              : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
          }`}
        >
          <SkipForward className="h-4 w-4 shrink-0" />
          <span>تخطي السؤال</span>
        </button>
      </div>

      {/* Main Question Card */}
      <div className="rounded-3xl border-2 border-sky-200 bg-white p-5 sm:p-7 shadow-sm">
        {currentQuestion.visualEmoji && (
          <div className="mb-4 flex justify-center">
            <div className="flex min-h-20 min-w-24 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 px-6 py-3 text-4xl sm:text-5xl tracking-wide">
              {currentQuestion.visualEmoji}
            </div>
          </div>
        )}

        <h3 className="mb-6 text-center font-display text-xl sm:text-2xl font-extrabold leading-relaxed text-slate-900">
          {currentQuestion.prompt}
        </h3>

        {/* 4 Big Touch-Friendly Answer Buttons */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {currentQuestion.options.map((opt, idx) => {
            const isEliminated = eliminatedOptions.includes(idx);
            const isCorrect = idx === currentQuestion.correctIndex;
            const isPicked = selectedOption === idx;

            let btnStyle =
              'border-slate-200 border-b-slate-300 bg-slate-50 text-slate-900 hover:border-sky-400 hover:bg-sky-50';

            if (isAnswered) {
              if (isCorrect) {
                btnStyle =
                  'border-emerald-500 border-b-emerald-700 bg-emerald-500 text-white';
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
                key={idx}
                type="button"
                disabled={isAnswered || isEliminated}
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

        {/* Immediate Educational Feedback & Next CTA */}
        {isAnswered && (
          <div
            className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 p-4 ${
              selectedOption === currentQuestion.correctIndex
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="text-center sm:text-right">
              {selectedOption === currentQuestion.correctIndex && lastAwarded ? (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 font-display text-base font-black text-emerald-800">
                  <span>إجابة رائعة! +{lastAwarded.base} نقطة</span>
                  {lastAwarded.speed > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <Zap className="h-4 w-4 fill-amber-400" />+{lastAwarded.speed} مكافأة سرعة!
                    </span>
                  )}
                </div>
              ) : timedOut ? (
                <div className="font-display text-base font-black text-rose-800">
                  انتهى الوقت! الإجابة الصحيحة: {currentQuestion.options[currentQuestion.correctIndex]}
                </div>
              ) : (
                <div className="font-display text-base font-black text-rose-800">
                  محاولة جيدة! الإجابة الصحيحة: {currentQuestion.options[currentQuestion.correctIndex]}
                </div>
              )}
              {currentQuestion.fact && (
                <p className="mt-1 text-sm font-medium text-slate-700">{currentQuestion.fact}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextQuestion}
              className="btn-tactile shrink-0 rounded-2xl border-b-4 border-sky-800 bg-sky-600 px-6 py-3 font-display text-base font-extrabold text-white hover:bg-sky-500 cursor-pointer whitespace-nowrap"
            >
              {questionsAnswered + 1 >= QUESTIONS_PER_ROUND ? 'عرض النتيجة 🎉' : 'السؤال التالي ←'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
