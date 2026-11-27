import { useEffect, useRef, useState } from 'react';
import { RotateCw, Play } from 'lucide-react';
import { CategoryId, Player } from '../types';
import { CATEGORIES, getAgeLevelMeta, getCategoryMeta, getCharacterMeta } from '../data/characters';
import { soundEngine } from '../utils/soundEngine';

interface FortuneWheelProps {
  player: Player;
  onCategorySelected: (category: CategoryId) => void;
  onCancel: () => void;
}

// 8 slices repeating the 4 categories so the wheel looks super lush and balanced
const WHEEL_SLICES: CategoryId[] = [
  'math',
  'english',
  'science',
  'islamic',
  'math',
  'english',
  'science',
  'islamic',
];

const SLICE_ANGLE = 360 / WHEEL_SLICES.length; // 45 degrees each

export function FortuneWheel({ player, onCategorySelected, onCancel }: FortuneWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landedCategory, setLandedCategory] = useState<CategoryId | null>(null);
  const rafRef = useRef<number | null>(null);

  const char = getCharacterMeta(player.character);
  const tier = getAgeLevelMeta(player.level);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleSpin = () => {
    if (spinning) return;
    soundEngine.playClick();
    setSpinning(true);
    setLandedCategory(null);

    const targetIndex = Math.floor(Math.random() * WHEEL_SLICES.length);
    // Slice i spans [i * 45, (i + 1) * 45] clockwise from 12 o'clock when rotation = 0.
    // To align the center of slice targetIndex with the top pointer (0 deg / 360 deg):
    const sliceCenter = targetIndex * SLICE_ANGLE + SLICE_ANGLE / 2;
    const jitter = (Math.random() - 0.5) * 26; // stay comfortably inside slice
    const desiredMod = (360 - ((sliceCenter + jitter) % 360) + 360) % 360;

    const currentMod = ((rotation % 360) + 360) % 360;
    const deltaToTarget = (desiredMod - currentMod + 360) % 360;
    const extraFullSpins = (5 + Math.floor(Math.random() * 2)) * 360;
    const totalDelta = extraFullSpins + deltaToTarget;

    const startRotation = rotation;
    const duration = 3600;
    const startTime = performance.now();
    let lastSlicePassed = Math.floor(startRotation / SLICE_ANGLE);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease-out for satisfying wheel deceleration
      const eased = 1 - Math.pow(1 - t, 3.2);
      const currentDeg = startRotation + totalDelta * eased;

      const currentSliceStep = Math.floor(currentDeg / SLICE_ANGLE);
      if (currentSliceStep !== lastSlicePassed) {
        lastSlicePassed = currentSliceStep;
        soundEngine.playWheelTick();
      }

      setRotation(currentDeg);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const chosen = WHEEL_SLICES[targetIndex];
        setLandedCategory(chosen);
        soundEngine.playCorrect();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const renderWheelSlices = () => {
    const cx = 160;
    const cy = 160;
    const r = 148;

    return WHEEL_SLICES.map((catId, idx) => {
      const meta = getCategoryMeta(catId);
      const startDeg = idx * SLICE_ANGLE - 90;
      const endDeg = (idx + 1) * SLICE_ANGLE - 90;
      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

      const midDeg = startDeg + SLICE_ANGLE / 2;
      const midRad = (midDeg * Math.PI) / 180;
      const emojiX = cx + r * 0.68 * Math.cos(midRad);
      const emojiY = cy + r * 0.68 * Math.sin(midRad);
      const labelX = cx + r * 0.42 * Math.cos(midRad);
      const labelY = cy + r * 0.42 * Math.sin(midRad);

      return (
        <g key={`${catId}-${idx}`}>
          <path d={d} fill={meta.wheelColor} stroke="#FFFFFF" strokeWidth="3.5" />
          <text
            x={emojiX}
            y={emojiY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="26"
            transform={`rotate(${midDeg + 90}, ${emojiX}, ${emojiY})`}
          >
            {meta.emoji}
          </text>
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#FFFFFF"
            fontSize="11"
            fontWeight="800"
            transform={`rotate(${midDeg + 90}, ${labelX}, ${labelY})`}
          >
            {catId === 'math'
              ? 'رياضيات'
              : catId === 'english'
              ? 'إنجليزي'
              : catId === 'science'
              ? 'علوم'
              : 'إسلامية'}
          </text>
        </g>
      );
    });
  };

  const landedMeta = landedCategory ? getCategoryMeta(landedCategory) : null;

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border-2 border-sky-200 bg-white p-5 sm:p-8 shadow-sm">
      {/* Active Player Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-sky-200 bg-sky-50 text-3xl">
            {char.emoji}
          </div>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-slate-900">
              دور البطل {player.name}!
            </h2>
            <p className="text-sm text-slate-600">
              المستوى: <span className={`font-bold ${tier.colorClass}`}>{tier.name}</span>{' '}
              ({tier.ageRange}) <span aria-hidden="true">·</span> أدر عجلة الحظ لاختيار مجال الأسئلة
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onCancel();
          }}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
        >
          العودة للمضمار
        </button>
      </div>

      {/* Wheel & Legend Grid */}
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
        {/* Interactive Wheel */}
        <div className="flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            {/* Top Pointer Triangle */}
            <div
              aria-hidden="true"
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-md"
            >
              <svg width="36" height="36" viewBox="0 0 36 36">
                <polygon points="18,34 4,4 32,4" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="3" />
              </svg>
            </div>

            {/* Outer Rim + Rotating SVG */}
            <div className="rounded-full border-8 border-slate-800 bg-slate-800 p-1 shadow-xl">
              <svg
                width="300"
                height="300"
                viewBox="0 0 320 320"
                className="h-64 w-64 sm:h-76 sm:w-76 select-none"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  willChange: 'transform',
                }}
              >
                {renderWheelSlices()}
                {/* Center Hub */}
                <circle cx="160" cy="160" r="28" fill="#1E293B" stroke="#FFFFFF" strokeWidth="5" />
                <text
                  x="160"
                  y="160"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="20"
                >
                  ⭐
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Action & Categories Panel */}
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <h3 className="font-display text-base font-extrabold text-slate-800">
              مجالات التحدي الأربعة:
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => {
                const isWinner = landedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 transition-all ${
                      isWinner
                        ? 'border-amber-400 bg-amber-50 scale-[1.02] shadow-sm'
                        : 'border-slate-100 bg-slate-50/70'
                    }`}
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="font-display text-sm sm:text-base font-bold text-slate-800">
                      {cat.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!landedMeta ? (
            <button
              type="button"
              disabled={spinning}
              onClick={handleSpin}
              className="btn-tactile mt-2 flex w-full items-center justify-center gap-2.5 rounded-2xl border-b-4 border-amber-600 bg-amber-400 px-6 py-4 font-display text-xl font-black text-slate-900 hover:bg-amber-300 disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <RotateCw className={`h-6 w-6 ${spinning ? 'animate-spin' : ''}`} />
              <span>{spinning ? 'العجلة تدور...' : 'أدر عجلة الحظ!'}</span>
            </button>
          ) : (
            <div className="mt-2 space-y-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center">
              <div className="text-sm font-bold text-emerald-800">
                توقفت العجلة على مجال:
              </div>
              <div className="font-display text-xl font-black text-slate-900">
                {landedMeta.emoji} {landedMeta.name}
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onCategorySelected(landedMeta.id);
                }}
                className="btn-tactile flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-6 py-3.5 font-display text-lg font-extrabold text-white hover:bg-emerald-400 cursor-pointer whitespace-nowrap"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>انطلق للجولة (8 أسئلة)!</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
