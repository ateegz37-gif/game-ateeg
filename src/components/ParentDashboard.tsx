import { useState } from 'react';
import {
  Lock,
  Users,
  Coins,
  BookOpen,
  Plus,
  Trash2,
  Award,
  KeyRound,
  ArrowRight,
  Check,
  AlertTriangle,
  Pencil,
  Copy,
  ShieldAlert,
  Timer,
  Rocket,
  RotateCcw,
} from 'lucide-react';
import {
  AgeLevel,
  CategoryId,
  FamilyRoom,
  Player,
  Question,
  RewardConfig,
  RewardMode,
} from '../types';
import { AGE_LEVELS, CATEGORIES, getCharacterMeta } from '../data/characters';
import { DEFAULT_PIN } from '../utils/storage';
import { MAX_ROOM_PLAYERS } from '../utils/roomService';
import { soundEngine } from '../utils/soundEngine';

interface ParentDashboardProps {
  room: FamilyRoom;
  isRoomAdmin: boolean;
  players: Player[];
  customQuestions: Question[];
  builtInCount: number;
  onUpdatePin: (newPin: string) => Promise<void>;
  onUpdateRewardConfig: (config: RewardConfig) => Promise<void>;
  onUpdateMatchSettings: (settings: {
    minPlayersToStart: number;
    roundDurationSeconds: number;
  }) => Promise<void>;
  onForceStartRound: () => Promise<void>;
  onResetToLobby: () => Promise<void>;
  onSwitchRoomCode: (newRoomCode: string) => Promise<void>;
  onEditPlayer: (player: Player) => void;
  onRemovePlayer: (playerId: string) => Promise<void>;
  onAddCustomQuestion: (q: Omit<Question, 'id' | 'isCustom'>) => Promise<void>;
  onDeleteCustomQuestion: (id: string) => Promise<void>;
  onAwardAndReset: () => Promise<void>;
  onExit: () => void;
}

export function ParentDashboard({
  room,
  isRoomAdmin,
  players,
  customQuestions,
  builtInCount,
  onUpdatePin,
  onUpdateRewardConfig,
  onUpdateMatchSettings,
  onForceStartRound,
  onResetToLobby,
  onSwitchRoomCode,
  onEditPlayer,
  onRemovePlayer,
  onAddCustomQuestion,
  onDeleteCustomQuestion,
  onAwardAndReset,
  onExit,
}: ParentDashboardProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'rewards' | 'players' | 'questions'>('rewards');

  // Local editable copy of reward config for smooth typing + Save button
  const [draftReward, setDraftReward] = useState<RewardConfig>(room.rewardConfig);
  const [rewardSavedMsg, setRewardSavedMsg] = useState(false);

  // Synchronized live round settings (min players + duration seconds)
  const [draftMinPlayers, setDraftMinPlayers] = useState<number>(room.minPlayersToStart);
  const [draftDurationSec, setDraftDurationSec] = useState<number>(room.roundDurationSeconds);
  const [matchSavedMsg, setMatchSavedMsg] = useState(false);

  // Room code copy / switch
  const [copiedCode, setCopiedCode] = useState(false);
  const [newRoomCodeInput, setNewRoomCodeInput] = useState('');

  // PIN change state
  const [newPinInput, setNewPinInput] = useState('');
  const [pinSavedMsg, setPinSavedMsg] = useState(false);

  // Confirmation modal for Award & Reset
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  // Custom question form state
  const [qCategory, setQCategory] = useState<CategoryId>('math');
  const [qLevel, setQLevel] = useState<AgeLevel>(1);
  const [qPrompt, setQPrompt] = useState('');
  const [qEmoji, setQEmoji] = useState('');
  const [qOptions, setQOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qFact, setQFact] = useState('');
  const [qSavedToast, setQSavedToast] = useState(false);

  const pin = room.parentPin || DEFAULT_PIN;

  const handleDigitClick = (digit: string) => {
    soundEngine.playClick();
    setPinError(false);
    const next = (pinInput + digit).slice(0, 4);
    setPinInput(next);
    if (next.length === 4) {
      if (next === pin) {
        soundEngine.playCorrect();
        setDraftReward(room.rewardConfig);
        setDraftMinPlayers(room.minPlayersToStart);
        setDraftDurationSec(room.roundDurationSeconds);
        setUnlocked(true);
      } else {
        soundEngine.playWrong();
        setPinError(true);
        window.setTimeout(() => setPinInput(''), 450);
      }
    }
  };

  const handleBackspace = () => {
    soundEngine.playClick();
    setPinInput((p) => p.slice(0, -1));
  };

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="font-display text-2xl font-black text-slate-900">لوحة تحكم ولي الأمر</h2>
        <p className="mt-1 text-sm text-slate-600">
          أدخل الرمز السري المكون من 4 أرقام للمتابعة
        </p>

        {pin === DEFAULT_PIN && (
          <p className="mt-2 text-xs font-bold text-sky-700">
            الرمز الافتراضي الأولي: <span className="tabular-nums">1234</span> (يمكنك تغييره بالداخل)
          </p>
        )}

        <div className="my-6 flex items-center justify-center gap-4" dir="ltr">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-5 w-5 rounded-full border-2 transition-all ${
                pinError
                  ? 'border-rose-500 bg-rose-500'
                  : i < pinInput.length
                  ? 'border-sky-600 bg-sky-600 scale-110'
                  : 'border-slate-300 bg-slate-100'
              }`}
            />
          ))}
        </div>

        {pinError && (
          <div className="mb-4 text-xs font-extrabold text-rose-600">
            الرمز السري غير صحيح، حاول مرة أخرى
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigitClick(d)}
              className="btn-tactile h-14 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 font-display text-2xl font-black text-slate-800 hover:bg-sky-50 hover:border-sky-300 cursor-pointer tabular-nums"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onExit();
            }}
            className="h-14 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="btn-tactile h-14 rounded-2xl border-2 border-b-4 border-slate-200 bg-slate-50 font-display text-2xl font-black text-slate-800 hover:bg-sky-50 hover:border-sky-300 cursor-pointer tabular-nums"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl border border-slate-200 bg-slate-100 text-sm font-extrabold text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            مسح ⌫
          </button>
        </div>
      </div>
    );
  }

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopiedCode(true);
      soundEngine.playCorrect();
      window.setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSaveRewards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoomAdmin || busyAction) return;
    setBusyAction(true);
    try {
      await onUpdateRewardConfig(draftReward);
      soundEngine.playCorrect();
      setRewardSavedMsg(true);
      window.setTimeout(() => setRewardSavedMsg(false), 2500);
    } finally {
      setBusyAction(false);
    }
  };

  const handleSaveMatchSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoomAdmin || busyAction) return;
    setBusyAction(true);
    try {
      await onUpdateMatchSettings({
        minPlayersToStart: Math.min(10, Math.max(1, Number(draftMinPlayers) || 3)),
        roundDurationSeconds: Math.min(300, Math.max(20, Number(draftDurationSec) || 60)),
      });
      soundEngine.playCorrect();
      setMatchSavedMsg(true);
      window.setTimeout(() => setMatchSavedMsg(false), 2500);
    } finally {
      setBusyAction(false);
    }
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoomAdmin || !/^\d{4}$/.test(newPinInput) || busyAction) return;
    setBusyAction(true);
    try {
      await onUpdatePin(newPinInput);
      soundEngine.playCorrect();
      setNewPinInput('');
      setPinSavedMsg(true);
      window.setTimeout(() => setPinSavedMsg(false), 2500);
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreateCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoomAdmin || !qPrompt.trim() || qOptions.some((o) => !o.trim()) || busyAction) return;
    setBusyAction(true);
    try {
      await onAddCustomQuestion({
        category: qCategory,
        level: qLevel,
        prompt: qPrompt.trim(),
        visualEmoji: qEmoji.trim() || undefined,
        options: [
          qOptions[0].trim(),
          qOptions[1].trim(),
          qOptions[2].trim(),
          qOptions[3].trim(),
        ],
        correctIndex: qCorrect,
        fact: qFact.trim() || undefined,
      });
      soundEngine.playCorrect();
      setQPrompt('');
      setQEmoji('');
      setQOptions(['', '', '', '']);
      setQCorrect(0);
      setQFact('');
      setQSavedToast(true);
      window.setTimeout(() => setQSavedToast(false), 2500);
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreateOrSwitchRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newRoomCodeInput.trim();
    if (!cleaned || busyAction) return;
    setBusyAction(true);
    try {
      await onSwitchRoomCode(cleaned);
      setNewRoomCodeInput('');
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-display text-2xl font-black text-slate-900">
            لوحة تحكم ولي الأمر — عائلة عتيق
          </h2>
          <p className="text-sm text-slate-600">
            إدارة رمز الغرفة السري، الجوائز النقدية، الأبطال المتصلين، وبنك الأسئلة المدرسية أونلاين
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onExit();
          }}
          className="btn-tactile flex items-center gap-2 rounded-2xl border-b-4 border-sky-800 bg-sky-600 px-5 py-2.5 font-display text-sm font-extrabold text-white hover:bg-sky-500 cursor-pointer whitespace-nowrap"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للمضمار</span>
        </button>
      </div>

      {!isRoomAdmin && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            حساب Google المسجّل على هذا الجهاز ليس منشئ هذه الغرفة. يمكنك استعراض الإعدادات أو إنشاء
            غرفة عائلية جديدة برمز سري خاص بك لتصبح مشرفها المباشر، أو الدخول بحساب ولي الأمر
            المنشئ للغرفة لتعديل الجوائز والأسئلة.
          </div>
        </div>
      )}

      {/* Segmented Navigation Tabs */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('rewards');
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 font-display text-sm sm:text-base font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'rewards'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Coins className="h-4 w-4 shrink-0" />
          <span>الغرفة والجوائز</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('players');
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 font-display text-sm sm:text-base font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'players'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>
            الأبطال ({players.length}/{MAX_ROOM_PLAYERS})
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveTab('questions');
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 font-display text-sm sm:text-base font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>أسئلة مخصصة ({customQuestions.length})</span>
        </button>
      </div>

      {/* TAB 1: ROOM CODE, REWARDS, PIN & AWARD CEREMONY */}
      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Reward Mode & Values */}
          <form
            onSubmit={handleSaveRewards}
            className="rounded-3xl border-2 border-amber-200 bg-white p-5 sm:p-6 shadow-sm space-y-5"
          >
            <h3 className="font-display text-lg font-extrabold text-slate-900">
              إعدادات الجوائز النقدية والمضمار (متزامنة لجميع الجوالات)
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  {
                    id: 'points' as RewardMode,
                    title: 'سعر النقاط',
                    desc: 'مكافأة لكل مجموعة نقاط',
                  },
                  {
                    id: 'podium' as RewardMode,
                    title: 'جوائز المراكز الثلاثة',
                    desc: 'الأول والثاني والثالث',
                  },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!isRoomAdmin}
                  onClick={() => {
                    soundEngine.playClick();
                    setDraftReward({ ...draftReward, mode: m.id });
                  }}
                  className={`rounded-2xl border-2 p-3.5 text-right transition-colors cursor-pointer disabled:opacity-60 ${
                    draftReward.mode === m.id
                      ? 'border-amber-500 bg-amber-50 text-amber-950'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="font-display text-sm font-extrabold">{m.title}</div>
                  <div className="text-xs text-slate-500">{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">اسم العملة</label>
                <input
                  type="text"
                  disabled={!isRoomAdmin}
                  value={draftReward.currency}
                  onChange={(e) => setDraftReward({ ...draftReward, currency: e.target.value })}
                  placeholder="ريال / درهم / دينار"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  نقاط خط النهاية (الكنز)
                </label>
                <input
                  type="number"
                  min={200}
                  step={100}
                  disabled={!isRoomAdmin}
                  value={draftReward.targetTrackPoints}
                  onChange={(e) =>
                    setDraftReward({
                      ...draftReward,
                      targetTrackPoints: Math.max(100, Number(e.target.value) || 1000),
                    })
                  }
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-900 tabular-nums"
                />
              </div>
            </div>

            {draftReward.mode === 'points' ? (
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">كل كم نقطة؟</label>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    disabled={!isRoomAdmin}
                    value={draftReward.pointsStep}
                    onChange={(e) =>
                      setDraftReward({
                        ...draftReward,
                        pointsStep: Math.max(1, Number(e.target.value) || 100),
                      })
                    }
                    className="w-full rounded-xl border-2 border-white bg-white px-3 py-2 font-extrabold text-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    تساوي كم ({draftReward.currency})؟
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={!isRoomAdmin}
                    value={draftReward.cashPerStep}
                    onChange={(e) =>
                      setDraftReward({
                        ...draftReward,
                        cashPerStep: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full rounded-xl border-2 border-white bg-white px-3 py-2 font-extrabold text-emerald-700 tabular-nums"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">🥇 الأول</label>
                  <input
                    type="number"
                    min={0}
                    disabled={!isRoomAdmin}
                    value={draftReward.firstPrize}
                    onChange={(e) =>
                      setDraftReward({
                        ...draftReward,
                        firstPrize: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full rounded-xl border-2 border-white bg-white px-3 py-2 font-extrabold text-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">🥈 الثاني</label>
                  <input
                    type="number"
                    min={0}
                    disabled={!isRoomAdmin}
                    value={draftReward.secondPrize}
                    onChange={(e) =>
                      setDraftReward({
                        ...draftReward,
                        secondPrize: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full rounded-xl border-2 border-white bg-white px-3 py-2 font-extrabold text-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">🥉 الثالث</label>
                  <input
                    type="number"
                    min={0}
                    disabled={!isRoomAdmin}
                    value={draftReward.thirdPrize}
                    onChange={(e) =>
                      setDraftReward({
                        ...draftReward,
                        thirdPrize: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full rounded-xl border-2 border-white bg-white px-3 py-2 font-extrabold text-slate-900 tabular-nums"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!isRoomAdmin || busyAction}
                className="btn-tactile flex items-center gap-2 rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-6 py-3 font-display text-sm sm:text-base font-black text-slate-900 hover:bg-amber-300 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Check className="h-5 w-5" />
                <span>حفظ ومزامنة الجوائز للجميع</span>
              </button>
              {rewardSavedMsg && (
                <span className="text-xs font-extrabold text-emerald-700">
                  تم الحفظ والمزامنة فوراً!
                </span>
              )}
            </div>
          </form>

          {/* Secret Room Code, Award Ceremony & PIN */}
          <div className="space-y-5">
            {/* Synchronized Live Rounds Settings (Min Players & Duration) */}
            <form
              onSubmit={handleSaveMatchSettings}
              className="rounded-3xl border-2 border-indigo-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-2 font-display text-base font-extrabold text-slate-900">
                <Timer className="h-5 w-5 text-indigo-600" />
                <span>إعدادات الجولات الحية المتزامنة</span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  الحد الأدنى لعدد اللاعبين لبدء الجولة (الافتراضي: 3 أبطال)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      disabled={!isRoomAdmin}
                      onClick={() => {
                        soundEngine.playClick();
                        setDraftMinPlayers(count);
                      }}
                      className={`rounded-xl border-2 py-2 font-display text-sm font-black transition-colors cursor-pointer disabled:opacity-50 tabular-nums ${
                        draftMinPlayers === count
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <span>أو أدخل عدداً مخصصاً (1-10):</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    disabled={!isRoomAdmin}
                    value={draftMinPlayers}
                    onChange={(e) =>
                      setDraftMinPlayers(Math.min(10, Math.max(1, Number(e.target.value) || 3)))
                    }
                    className="w-20 rounded-lg border-2 border-slate-200 bg-slate-50 px-2.5 py-1 text-center font-extrabold text-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  مدة الجولة الموحدة بالثواني (الافتراضي: 60 ثانية - دقيقة واحدة)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { sec: 60, label: '60 ثانية (دقيقة)' },
                    { sec: 90, label: '90 ثانية' },
                    { sec: 120, label: '120 ثانية' },
                  ].map((opt) => (
                    <button
                      key={opt.sec}
                      type="button"
                      disabled={!isRoomAdmin}
                      onClick={() => {
                        soundEngine.playClick();
                        setDraftDurationSec(opt.sec);
                      }}
                      className={`rounded-xl border-2 py-2 font-display text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap ${
                        draftDurationSec === opt.sec
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={!isRoomAdmin || busyAction}
                  className="btn-tactile flex items-center gap-1.5 rounded-xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-2.5 font-display text-sm font-black text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Check className="h-4 w-4" />
                  <span>حفظ إعدادات الجولة</span>
                </button>
                {matchSavedMsg && (
                  <span className="text-xs font-extrabold text-emerald-700">تم التحديث للجميع!</span>
                )}
              </div>

              {/* Direct Parent Live Controls */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={!isRoomAdmin || busyAction || players.length === 0}
                  onClick={async () => {
                    soundEngine.playClick();
                    setBusyAction(true);
                    try {
                      await onForceStartRound();
                    } finally {
                      setBusyAction(false);
                    }
                  }}
                  className="btn-tactile flex flex-1 items-center justify-center gap-1.5 rounded-xl border-b-2 border-emerald-700 bg-emerald-500 px-3 py-2 font-display text-xs font-black text-white hover:bg-emerald-400 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  <span>بدء جولة فورية الآن</span>
                </button>

                <button
                  type="button"
                  disabled={!isRoomAdmin || busyAction}
                  onClick={async () => {
                    soundEngine.playClick();
                    setBusyAction(true);
                    try {
                      await onResetToLobby();
                    } finally {
                      setBusyAction(false);
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 font-display text-xs font-extrabold text-slate-700 hover:bg-slate-200 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>إرجاع لغرفة الانتظار</span>
                </button>
              </div>
            </form>

            {/* Secret Family Room Code Card */}
            <div className="rounded-3xl border-2 border-sky-200 bg-white p-5 shadow-sm space-y-3">
              <div className="font-display text-base font-extrabold text-slate-900">
                رمز غرفة العائلة السري الحالي
              </div>
              <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-sky-100 bg-sky-50 px-4 py-3">
                <span
                  dir="ltr"
                  className="font-display text-xl font-black tracking-wider text-sky-900"
                >
                  {room.roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="btn-tactile flex items-center gap-1.5 rounded-xl border-b-2 border-sky-800 bg-sky-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-sky-500 cursor-pointer whitespace-nowrap"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedCode ? 'تم النسخ!' : 'نسخ الرمز'}</span>
                </button>
              </div>
              <form onSubmit={handleCreateOrSwitchRoom} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  maxLength={24}
                  value={newRoomCodeInput}
                  onChange={(e) => setNewRoomCodeInput(e.target.value)}
                  placeholder="إنشاء أو الانتقال لرمز غرفة جديد..."
                  className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-bold text-slate-900"
                />
                <button
                  type="submit"
                  disabled={!newRoomCodeInput.trim() || busyAction}
                  className="rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-200 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  تغيير الغرفة
                </button>
              </form>
            </div>

            {/* Award Ceremony */}
            <div className="rounded-3xl border-2 border-emerald-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-slate-900">
                    ختام الموسم رقم {room.seasonNumber}
                  </h3>
                  <p className="text-xs text-slate-600">
                    يحفظ أصحاب المراكز الثلاثة الأولى في «قاعة أبطال عائلة عتيق» ويصفّر نقاط جميع
                    الأجهزة فوراً
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={!isRoomAdmin || busyAction || players.length === 0}
                onClick={() => {
                  soundEngine.playClick();
                  setShowResetConfirm(true);
                }}
                className="btn-tactile mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-5 py-3.5 font-display text-base font-extrabold text-white hover:bg-emerald-400 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Award className="h-5 w-5" />
                <span>تسليم الجوائز وتصفير الدوري</span>
              </button>
            </div>

            {/* Change PIN */}
            <form
              onSubmit={handleSaveNewPin}
              className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-2 font-display text-base font-extrabold text-slate-900">
                <KeyRound className="h-5 w-5 text-sky-600" />
                <span>تغيير الرمز السري (PIN)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  disabled={!isRoomAdmin}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="أدخل 4 أرقام جديدة"
                  className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 font-bold text-slate-900 tabular-nums"
                />
                <button
                  type="submit"
                  disabled={!isRoomAdmin || newPinInput.length !== 4 || busyAction}
                  className="btn-tactile rounded-xl border-b-4 border-slate-800 bg-slate-700 px-5 py-2.5 font-display text-sm font-extrabold text-white hover:bg-slate-600 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  حفظ الرمز
                </button>
              </div>
              {pinSavedMsg && (
                <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <Check className="h-4 w-4" />
                  <span>تم تحديث الرمز السري للغرفة بنجاح!</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: CONNECTED PLAYERS */}
      {activeTab === 'players' && (
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-extrabold text-slate-900">
                أطفال عائلة عتيق المتصلون في الغرفة ({players.length}/{MAX_ROOM_PLAYERS})
              </h3>
              <p className="text-xs text-slate-600">
                ينضم كل طفل من جواله بإدخال رمز الغرفة السري ({room.roomCode})، ويمكنك تعديل أي بطل
                أو إزالته من هنا.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {players.map((p) => {
              const char = getCharacterMeta(p.character);
              const lvl = AGE_LEVELS.find((l) => l.level === p.level);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{char.emoji}</span>
                    <div>
                      <div className="font-display text-base font-extrabold text-slate-900">
                        {p.name}
                      </div>
                      <div className="text-xs font-bold text-slate-500 tabular-nums">
                        {lvl?.name} ({lvl?.ageRange}) · {p.points.toLocaleString('en-US')} نقطة ·{' '}
                        {p.roundsPlayed} جولات
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isRoomAdmin}
                      onClick={() => {
                        soundEngine.playClick();
                        onEditPlayer(p);
                      }}
                      className="flex h-9 items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-extrabold text-sky-700 hover:bg-sky-100 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isRoomAdmin || busyAction}
                      onClick={() => {
                        soundEngine.playClick();
                        onRemovePlayer(p.id);
                      }}
                      title="إزالة اللاعب من الغرفة"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM QUESTIONS MANAGER */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateCustomQuestion}
            className="rounded-3xl border-2 border-violet-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-extrabold text-slate-900">
                إضافة سؤال جديد من المنهج الدراسي (يصل لجميع جوالات العائلة)
              </h3>
              <span className="text-xs font-bold text-slate-500 tabular-nums">
                بنك الأسئلة: {builtInCount} مدمج + {customQuestions.length} مخصص
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">المجال</label>
                <select
                  value={qCategory}
                  disabled={!isRoomAdmin}
                  onChange={(e) => setQCategory(e.target.value as CategoryId)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">الفئة العمرية</label>
                <select
                  value={qLevel}
                  disabled={!isRoomAdmin}
                  onChange={(e) => setQLevel(Number(e.target.value) as AgeLevel)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900"
                >
                  {AGE_LEVELS.map((l) => (
                    <option key={l.level} value={l.level}>
                      المستوى {l.level}: {l.name} ({l.ageRange})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  رمز تعبيري اختياري (Emoji)
                </label>
                <input
                  type="text"
                  disabled={!isRoomAdmin}
                  value={qEmoji}
                  onChange={(e) => setQEmoji(e.target.value)}
                  placeholder="مثال: 🌍 أو 📐"
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">نص السؤال</label>
              <input
                type="text"
                required
                disabled={!isRoomAdmin}
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder="اكتب السؤال هنا..."
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900 focus:border-violet-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!isRoomAdmin}
                    onClick={() => setQCorrect(idx)}
                    title="حدد هذه الإجابة كإجابة صحيحة"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 font-display text-sm font-black cursor-pointer ${
                      qCorrect === idx
                        ? 'border-emerald-600 bg-emerald-500 text-white'
                        : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}
                  >
                    {qCorrect === idx ? <Check className="h-5 w-5" /> : idx + 1}
                  </button>
                  <input
                    type="text"
                    required
                    disabled={!isRoomAdmin}
                    value={qOptions[idx]}
                    onChange={(e) => {
                      const next: [string, string, string, string] = [...qOptions];
                      next[idx] = e.target.value;
                      setQOptions(next);
                    }}
                    placeholder={`الخيار ${idx + 1} ${qCorrect === idx ? '(الإجابة الصحيحة)' : ''}`}
                    className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                معلومة مفيدة بعد الإجابة (اختياري)
              </label>
              <input
                type="text"
                disabled={!isRoomAdmin}
                value={qFact}
                onChange={(e) => setQFact(e.target.value)}
                placeholder="تظهر للطفل كتشجيع وتوضيح بعد الإجابة..."
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!isRoomAdmin || busyAction}
                className="btn-tactile flex items-center gap-2 rounded-2xl border-b-4 border-violet-800 bg-violet-600 px-6 py-3 font-display text-base font-extrabold text-white hover:bg-violet-500 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-5 w-5" />
                <span>إضافة السؤال ومزامنته</span>
              </button>
              {qSavedToast && (
                <span className="flex items-center gap-1 text-sm font-extrabold text-emerald-700">
                  <Check className="h-4 w-4" />
                  تمت إضافة السؤال بنجاح!
                </span>
              )}
            </div>
          </form>

          {customQuestions.length > 0 && (
            <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <h3 className="mb-3 font-display text-base font-extrabold text-slate-900">
                الأسئلة المخصصة المضافة ({customQuestions.length})
              </h3>
              <div className="space-y-2.5">
                {customQuestions.map((q) => {
                  const cat = CATEGORIES.find((c) => c.id === q.category);
                  const lvl = AGE_LEVELS.find((l) => l.level === q.level);
                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-500">
                          {cat?.emoji} {cat?.shortName} · مستوى {lvl?.name}
                        </div>
                        <div className="font-display text-sm font-extrabold text-slate-900">
                          {q.prompt}
                        </div>
                        <div className="text-xs font-bold text-emerald-700">
                          الإجابة الصحيحة: {q.options[q.correctIndex]}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!isRoomAdmin || busyAction}
                        onClick={() => {
                          soundEngine.playClick();
                          onDeleteCustomQuestion(q.id);
                        }}
                        aria-label="حذف السؤال"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Award & Reset */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-3xl border-2 border-amber-300 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="font-display text-xl font-black text-slate-900">
              تأكيد تسليم الجوائز وتصفير الدوري
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              سيتم حفظ أسماء الفائزين الثلاثة الأوائل وجوائزهم النقدية في «قاعة أبطال عائلة عتيق»
              وتصفير نقاط جميع الأطفال على كل الأجهزة لبدء موسم جديد. هل أنت متأكد؟
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                disabled={busyAction}
                onClick={async () => {
                  setBusyAction(true);
                  try {
                    setShowResetConfirm(false);
                    await onAwardAndReset();
                  } finally {
                    setBusyAction(false);
                  }
                }}
                className="btn-tactile flex-1 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 py-3 font-display text-sm font-extrabold text-white hover:bg-emerald-400 cursor-pointer whitespace-nowrap"
              >
                نعم، توّج الأبطال! 🏆
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 py-3 font-display text-sm font-bold text-slate-700 hover:bg-slate-200 cursor-pointer whitespace-nowrap"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
