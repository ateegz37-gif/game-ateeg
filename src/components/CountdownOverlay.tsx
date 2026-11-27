import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSyncedNowMs } from '../utils/roomService';
import { soundEngine } from '../utils/soundEngine';

interface CountdownOverlayProps {
  roundNumber: number;
  countdownEndAtMs: number;
  durationSeconds: number;
}

type CountdownStep = '3' | '2' | '1' | 'GO';

function getStepFromRemaining(remainingMs: number): CountdownStep {
  if (remainingMs > 2800) return '3';
  if (remainingMs > 1800) return '2';
  if (remainingMs > 800) return '1';
  return 'GO';
}

export function CountdownOverlay({
  roundNumber,
  countdownEndAtMs,
  durationSeconds,
}: CountdownOverlayProps) {
  const [step, setStep] = useState<CountdownStep>(() =>
    getStepFromRemaining(countdownEndAtMs - getSyncedNowMs())
  );
  const lastSoundStepRef = useRef<CountdownStep | null>(null);

  useEffect(() => {
    const update = () => {
      const rem = countdownEndAtMs - getSyncedNowMs();
      const nextStep = getStepFromRemaining(rem);
      setStep(nextStep);
      if (lastSoundStepRef.current !== nextStep) {
        lastSoundStepRef.current = nextStep;
        if (nextStep === '3') soundEngine.playCountdownBeep(3);
        else if (nextStep === '2') soundEngine.playCountdownBeep(2);
        else if (nextStep === '1') soundEngine.playCountdownBeep(1);
        else if (nextStep === 'GO') soundEngine.playCountdownGo();
      }
    };

    update();
    const timer = window.setInterval(update, 60);
    return () => window.clearInterval(timer);
  }, [countdownEndAtMs]);

  const visual =
    step === '3'
      ? { label: '3', bg: 'from-sky-500 to-blue-600', sub: 'استعدوا يا أبطال عائلة عتيق!' }
      : step === '2'
      ? { label: '2', bg: 'from-amber-400 to-orange-500', sub: 'أصابعكم على الشاشة!' }
      : step === '1'
      ? { label: '1', bg: 'from-rose-500 to-pink-600', sub: `أمامكم ${durationSeconds} ثانية من الحماس!` }
      : { label: 'انطلق! 🚀', bg: 'from-emerald-500 to-teal-600', sub: 'أجب بأقصى سرعة الآن!' };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
    >
      <div className="mb-4 font-display text-lg sm:text-xl font-black text-amber-300">
        الجولة الحية المتزامنة #{roundNumber}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ scale: 0.45, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.35, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className={`flex min-h-48 min-w-48 sm:min-h-60 sm:min-w-60 items-center justify-center rounded-[2.5rem] border-4 border-white bg-gradient-to-br ${visual.bg} px-10 py-8 shadow-2xl`}
        >
          <span className="font-display text-7xl sm:text-8xl font-black text-white drop-shadow-md tabular-nums">
            {visual.label}
          </span>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 text-center font-display text-xl sm:text-2xl font-extrabold text-white">
        {visual.sub}
      </div>
    </div>
  );
}
