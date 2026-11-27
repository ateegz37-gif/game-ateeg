import { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, KeyRound, Play, Users, LogOut, AlertCircle, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { AgeLevel, CharacterId } from '../types';
import { AGE_LEVELS, CHARACTERS } from '../data/characters';
import { ATEEG_EMBLEM_URL } from './WelcomeScreen';
import { DEFAULT_ROOM_CODE, MAX_ROOM_PLAYERS } from '../utils/roomService';
import { soundEngine } from '../utils/soundEngine';

export interface SavedLocalProfile {
  playerId: string;
  name: string;
  character: CharacterId;
  level: AgeLevel;
  roomCode: string;
}

interface RoomJoinScreenProps {
  user: User | null;
  authLoading: boolean;
  initialProfile: SavedLocalProfile;
  joining: boolean;
  errorMsg: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onJoinRoom: (data: {
    name: string;
    character: CharacterId;
    level: AgeLevel;
    roomCode: string;
  }) => Promise<void>;
}

export function RoomJoinScreen({
  user,
  authLoading,
  initialProfile,
  joining,
  errorMsg,
  onSignIn,
  onSignOut,
  onJoinRoom,
}: RoomJoinScreenProps) {
  const [emblemErr, setEmblemErr] = useState(false);
  const [name, setName] = useState(initialProfile.name);
  const [character, setCharacter] = useState<CharacterId>(initialProfile.character);
  const [level, setLevel] = useState<AgeLevel>(initialProfile.level);
  const [roomCode, setRoomCode] = useState(initialProfile.roomCode || DEFAULT_ROOM_CODE);
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    soundEngine.playClick();
    setSigningIn(true);
    try {
      await onSignIn();
    } finally {
      setSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim() || joining) return;
    soundEngine.playVehicleMove();
    await onJoinRoom({
      name: name.trim(),
      character,
      level,
      roomCode: roomCode.trim(),
    });
  };

  return (
    <section
      aria-label="شاشة الانضمام إلى غرفة العائلة"
      className="mx-auto max-w-3xl py-2 sm:py-5"
    >
      <div className="relative overflow-hidden rounded-[2rem] border-2 border-sky-200 bg-white p-5 sm:p-8 shadow-sm">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-2.5 bg-gradient-to-l from-amber-400 via-sky-500 to-emerald-400"
        />

        {/* Crest + Brand Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="mx-auto mb-4 flex h-28 w-28 sm:h-34 sm:w-34 items-center justify-center rounded-3xl border-4 border-amber-200 bg-gradient-to-b from-sky-50 to-amber-50/40 p-2 shadow-xs"
          >
            {!emblemErr ? (
              <img
                src={ATEEG_EMBLEM_URL}
                alt="شعار تحدي أبطال عائلة عتيق"
                referrerPolicy="no-referrer"
                onError={() => setEmblemErr(true)}
                className="h-full w-full object-contain mix-blend-multiply"
              />
            ) : (
              <span className="text-5xl">👑</span>
            )}
          </motion.div>

          <h1 className="font-display text-2xl sm:text-4xl font-black text-slate-900">
            تحدي أبطال عائلة عتيق
          </h1>
          <p className="mt-1 font-display text-sm sm:text-base font-extrabold text-sky-700" dir="ltr">
            Ateeg Family Champions · Live Online Multiplayer
          </p>
          <p className="mx-auto mt-2 max-w-lg text-xs sm:text-sm font-medium text-slate-600">
            ينضم أبطال العائلة (حتى <span className="font-extrabold text-sky-700 tabular-nums">{MAX_ROOM_PLAYERS}</span>{' '}
            أطفال من بيوت مختلفة) إلى غرفة الانتظار، وتنطلق الجولة الحية للجميع معاً لمدة 60 ثانية فور اكتمال 3 أبطال!
          </p>
        </div>

        {/* Auth Loading State (active during initial check & Google Redirect return) */}
        {authLoading ? (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 py-8 text-slate-600">
            <Loader2 className="h-9 w-9 animate-spin text-sky-600" />
            <span className="font-display text-sm sm:text-base font-extrabold text-slate-800">
              جاري التحقق من تسجيل الدخول عبر Google...
            </span>
            <span className="text-xs font-medium text-slate-500">
              يرجى الانتظار لحظة حتى يكتمل الاتصال بحسابك
            </span>
          </div>
        ) : !user ? (
          /* Step 1: Google Sign-In Gate */
          <div className="mt-7 rounded-3xl border-2 border-sky-100 bg-sky-50/60 p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-xs">
              🌐
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-black text-slate-900">
                سجّل الدخول للاتصال المباشر مع العائلة
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                يتطلب اللعب الجماعي المتزامن أونلاين والمحادثة الصوتية الآمنة تسجيل الدخول بحساب
                Google الخاص بجهاز الطفل أو ولي الأمر.
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-start justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-right text-xs font-bold text-rose-700 break-words">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              disabled={signingIn}
              onClick={handleGoogleSignIn}
              className="btn-tactile mx-auto flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl border-b-4 border-sky-800 bg-sky-600 px-6 py-4 font-display text-base sm:text-lg font-black text-white hover:bg-sky-500 disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              <span>
                {signingIn ? 'جاري تسجيل الدخول بحساب Google...' : 'الدخول بحساب Google للانضمام'}
              </span>
            </button>
          </div>
        ) : (
          /* Step 2: Family Room Join Form */
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Connected Account Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs font-bold text-emerald-900">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>متصل بحساب: {user.displayName || user.email}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onSignOut();
                }}
                className="flex items-center gap-1 text-rose-700 hover:underline cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>تبديل الحساب</span>
              </button>
            </div>

            {/* Hero Name + Secret Room Code */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="join-hero-name"
                  className="mb-1.5 block text-xs font-extrabold text-slate-700"
                >
                  1. اسم البطل
                </label>
                <input
                  id="join-hero-name"
                  type="text"
                  required
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اكتب اسمك هنا (مثال: سالم، سارة...)"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-display text-base font-extrabold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="join-room-code"
                  className="mb-1.5 flex items-center gap-1 text-xs font-extrabold text-slate-700"
                >
                  <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                  <span>2. رمز غرفة العائلة السري</span>
                </label>
                <input
                  id="join-room-code"
                  type="text"
                  required
                  maxLength={24}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="مثال: ATEEG2026"
                  dir="ltr"
                  className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50/50 px-4 py-3 text-center font-display text-base font-black tracking-wider text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  أدخل نفس الرمز على جميع جوالات العائلة للعب في نفس السباق
                </p>
              </div>
            </div>

            {/* Age Level Selector */}
            <div>
              <div className="mb-1.5 text-xs font-extrabold text-slate-700">
                3. اختر الفئة العمرية (لأسئلة عادلة ومناسبة لعمرك)
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {AGE_LEVELS.map((tier) => (
                  <button
                    key={tier.level}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setLevel(tier.level);
                    }}
                    className={`rounded-2xl border-2 p-3 text-center transition-colors cursor-pointer ${
                      level === tier.level
                        ? 'border-sky-600 bg-sky-50 text-sky-950 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="font-display text-sm sm:text-base font-black">{tier.name}</div>
                    <div className="text-[11px] font-bold text-slate-500">{tier.ageRange}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Funny Cartoon Character Picker */}
            <div>
              <div className="mb-1.5 text-xs font-extrabold text-slate-700">
                4. اختر شخصيتك الكرتونية المضحكة للسباق
              </div>
              <div className="grid grid-cols-5 gap-2">
                {CHARACTERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      soundEngine.playClick();
                      setCharacter(c.id);
                    }}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 p-2 transition-all cursor-pointer ${
                      character === c.id
                        ? 'border-amber-500 bg-amber-50 scale-105 shadow-xs'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-white'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl">{c.emoji}</span>
                    <span className="mt-1 w-full truncate text-center text-[10px] font-extrabold text-slate-700">
                      {c.label.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-bold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !roomCode.trim() || joining}
              className="btn-tactile flex w-full items-center justify-center gap-3 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-6 py-4 font-display text-lg sm:text-xl font-black text-white shadow-md hover:bg-emerald-400 disabled:opacity-55 cursor-pointer whitespace-nowrap"
            >
              {joining ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Play className="h-6 w-6 fill-current" />
              )}
              <span>
                {joining ? 'جاري الدخول إلى غرفة الانتظار...' : 'ادخل إلى غرفة الانتظار للانطلاق 🚀'}
              </span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
