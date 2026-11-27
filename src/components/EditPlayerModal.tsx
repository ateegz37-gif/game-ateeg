import { useEffect, useState } from 'react';
import { X, Check, Trash2, ShieldCheck } from 'lucide-react';
import { AgeLevel, CharacterId, Player, RewardConfig } from '../types';
import { AGE_LEVELS, CHARACTERS } from '../data/characters';
import { calculatePlayerCash, formatCurrencyAmount } from '../utils/storage';
import { soundEngine } from '../utils/soundEngine';

interface EditPlayerModalProps {
  player: Player | null;
  allPlayers: Player[];
  rewardConfig: RewardConfig;
  canDelete?: boolean;
  onSave: (
    playerId: string,
    updates: { name: string; character: CharacterId; level: AgeLevel }
  ) => void;
  onDelete?: (playerId: string) => void;
  onClose: () => void;
}

export function EditPlayerModal({
  player,
  allPlayers,
  rewardConfig,
  canDelete = false,
  onSave,
  onDelete,
  onClose,
}: EditPlayerModalProps) {
  const [name, setName] = useState('');
  const [character, setCharacter] = useState<CharacterId>('rocket');
  const [level, setLevel] = useState<AgeLevel>(1);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setCharacter(player.character);
      setLevel(player.level);
    }
  }, [player]);

  if (!player) return null;

  const currentCash = calculatePlayerCash(player, allPlayers, rewardConfig);
  const trimmedName = name.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName) return;
    soundEngine.playCorrect();
    onSave(player.id, {
      name: trimmedName,
      character,
      level,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-player-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border-2 border-sky-300 bg-white p-5 sm:p-6 shadow-xl space-y-5"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          aria-label="إغلاق نافذة التعديل"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pl-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
            ✏️
          </div>
          <div>
            <h2
              id="edit-player-title"
              className="font-display text-xl font-black text-slate-900"
            >
              تعديل بيانات البطل
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              عدّل الاسم أو المركبة أو المستوى العمري بكل سهولة
            </p>
          </div>
        </div>

        {/* Preservation Guarantee Banner */}
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-emerald-800">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="tabular-nums">
            سيُحفظ رصيد البطل الحالي كاملاً: {player.points.toLocaleString('en-US')} نقطة (
            {formatCurrencyAmount(currentCash, rewardConfig.currency)})
          </span>
        </div>

        {/* Name Field */}
        <div>
          <label
            htmlFor="edit-hero-name"
            className="mb-1.5 block text-xs font-bold text-slate-700"
          >
            اسم البطل
          </label>
          <input
            id="edit-hero-name"
            type="text"
            required
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسم البطل الجديد..."
            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-display text-base font-extrabold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Age Level Picker */}
        <div>
          <div className="mb-1.5 text-xs font-bold text-slate-700">الفئة العمرية</div>
          <div className="grid grid-cols-3 gap-2">
            {AGE_LEVELS.map((tier) => (
              <button
                key={tier.level}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setLevel(tier.level);
                }}
                className={`rounded-2xl border-2 px-2 py-2.5 text-center transition-colors cursor-pointer ${
                  level === tier.level
                    ? 'border-sky-600 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-display text-sm font-extrabold">{tier.name}</div>
                <div className="text-[11px]">{tier.ageRange}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Character / Vehicle Picker */}
        <div>
          <div className="mb-1.5 text-xs font-bold text-slate-700">
            الشخصية الكرتونية / مركبة السباق
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
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="mt-0.5 w-full truncate text-center text-[10px] font-bold text-slate-700">
                  {c.label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!trimmedName}
            className="btn-tactile flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-5 py-3.5 font-display text-base font-extrabold text-white hover:bg-emerald-400 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Check className="h-5 w-5" />
            <span>حفظ التعديلات</span>
          </button>

          {canDelete && onDelete && allPlayers.length > 2 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onDelete(player.id);
                onClose();
              }}
              className="btn-tactile flex items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 border-rose-300 bg-rose-50 px-4 py-3.5 font-display text-sm font-extrabold text-rose-700 hover:bg-rose-100 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" />
              <span>حذف اللاعب</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
