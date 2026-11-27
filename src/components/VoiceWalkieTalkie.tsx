import { useEffect, useRef, useState } from 'react';
import { Mic, Send, ShieldCheck, X, Square, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Player, VoiceTone } from '../types';
import { getCharacterMeta, VOICE_TONES } from '../data/characters';
import { soundEngine } from '../utils/soundEngine';

interface VoiceWalkieTalkieProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: Player | null;
  onBroadcastOnline: (params: {
    blob: Blob;
    tone: VoiceTone;
    durationMs: number;
  }) => Promise<void>;
}

const MAX_DURATION_SEC = 5;

export function VoiceWalkieTalkie({
  isOpen,
  onClose,
  currentPlayer,
  onBroadcastOnline,
}: VoiceWalkieTalkieProps) {
  const [selectedTone, setSelectedTone] = useState<VoiceTone>('chipmunk');
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded' | 'sending'>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<number | null>(null);
  const analyserRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pressStartTimeRef = useRef<number>(0);

  const stopTracksAndAnalyser = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (analyserRafRef.current) {
      cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setMicLevel(0);
  };

  const wipeRecordedMemory = () => {
    chunksRef.current = [];
    recordedBlobRef.current = null;
    setElapsedMs(0);
  };

  useEffect(() => {
    if (!isOpen) {
      stopTracksAndAnalyser();
      wipeRecordedMemory();
      setStatus('idle');
      setErrorMsg(null);
    }
    return () => {
      stopTracksAndAnalyser();
      wipeRecordedMemory();
    };
  }, [isOpen]);

  if (!isOpen || !currentPlayer) return null;

  const char = getCharacterMeta(currentPlayer.character);

  const startRecording = async () => {
    if (status === 'recording' || status === 'sending') return;
    setErrorMsg(null);
    wipeRecordedMemory();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('المتصفح لا يدعم تسجيل الصوت، يرجى استخدام متصفح حديث.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const options: MediaRecorderOptions = { audioBitsPerSecond: 16000 };
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stopTracksAndAnalyser();
        if (chunksRef.current.length > 0) {
          recordedBlobRef.current = new Blob(chunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          chunksRef.current = [];
          setStatus('recorded');
        } else {
          setStatus('idle');
        }
      };

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tickAnalyser = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setMicLevel(Math.min(100, Math.round((avg / 140) * 100)));
          analyserRafRef.current = requestAnimationFrame(tickAnalyser);
        };
        analyserRafRef.current = requestAnimationFrame(tickAnalyser);
      } catch {
        // Optional audio meter
      }

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');

      const startedAt = Date.now();
      pressStartTimeRef.current = startedAt;
      setElapsedMs(0);

      timerRef.current = window.setInterval(() => {
        const diff = Date.now() - startedAt;
        if (diff >= MAX_DURATION_SEC * 1000) {
          setElapsedMs(MAX_DURATION_SEC * 1000);
          stopRecording();
        } else {
          setElapsedMs(diff);
        }
      }, 60);
    } catch {
      stopTracksAndAnalyser();
      setStatus('idle');
      setErrorMsg('تعذر الوصول إلى الميكروفون. يرجى السماح بصلاحية الميكروفون ثم المحاولة مجدداً.');
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === 'recording') {
      rec.stop();
    }
  };

  const handlePointerDown = () => {
    if (status === 'idle' || status === 'recorded') {
      startRecording();
    } else if (status === 'recording') {
      stopRecording();
    }
  };

  const handlePointerUp = () => {
    if (status === 'recording') {
      const heldFor = Date.now() - pressStartTimeRef.current;
      if (heldFor >= 350) {
        stopRecording();
      }
    }
  };

  const handleSendToAllHomes = async () => {
    const blob = recordedBlobRef.current;
    if (!blob || status === 'sending') return;

    setStatus('sending');
    setErrorMsg(null);
    try {
      await onBroadcastOnline({
        blob,
        tone: selectedTone,
        durationMs: Math.max(800, elapsedMs),
      });
      wipeRecordedMemory();
      setStatus('idle');
      onClose();
    } catch (err) {
      setStatus('recorded');
      if (err instanceof Error && err.message === 'AUDIO_TOO_LARGE') {
        setErrorMsg('حجم الصوت أكبر من المسموح، حاول تسجيل رسالة أقصر (3-4 ثوانٍ).');
      } else {
        setErrorMsg('تعذر إرسال الرسالة الصوتية، تأكد من اتصال الإنترنت وحاول مجدداً.');
      }
    }
  };

  const handleDiscard = () => {
    soundEngine.playClick();
    wipeRecordedMemory();
    setStatus('idle');
  };

  const progressPct = Math.min(100, (elapsedMs / (MAX_DURATION_SEC * 1000)) * 100);
  const secondsLeft = Math.max(0, MAX_DURATION_SEC - elapsedMs / 1000).toFixed(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkie-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-amber-300 bg-white p-5 sm:p-6 shadow-xl">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          aria-label="إغلاق الميكروفون"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center gap-3 pl-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-2xl">
            {char.emoji}
          </div>
          <div>
            <h2 id="walkie-title" className="font-display text-xl font-extrabold text-slate-900">
              المحادثة الصوتية مع الجميع 🎙️
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              تحدث يا <span className="font-extrabold text-sky-700">{currentPlayer.name}</span>{' '}
              ليسمعك جميع أبطال عائلة عتيق في بيوتهم فوراً!
            </p>
          </div>
        </div>

        {/* Voice Tone Selector */}
        <div className="mb-5">
          <div className="mb-1.5 text-xs font-bold text-slate-600">
            اختر نبرة صوتك قبل البث للجميع:
          </div>
          <div className="grid grid-cols-3 gap-2">
            {VOICE_TONES.map((tone) => {
              const active = selectedTone === tone.id;
              return (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedTone(tone.id);
                  }}
                  className={`flex flex-col items-center rounded-2xl border-2 p-2.5 text-center transition-colors cursor-pointer ${
                    active
                      ? 'border-amber-500 bg-amber-50 text-amber-950'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-2xl mb-1">{tone.emoji}</span>
                  <span className="font-display text-xs sm:text-sm font-extrabold leading-tight">
                    {tone.label}
                  </span>
                  <span className="mt-0.5 text-[11px] text-slate-500">{tone.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Central Push-To-Talk / Broadcast Stage */}
        <div className="flex flex-col items-center rounded-2xl border-2 border-slate-100 bg-slate-50 p-5 text-center">
          {status === 'recorded' || status === 'sending' ? (
            <div className="w-full space-y-3">
              <div className="font-display text-base font-extrabold text-emerald-700">
                تم تسجيل رسالتك ({(elapsedMs / 1000).toFixed(1)} ثانية) — جاهزة للبث!
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={status === 'sending'}
                  onClick={handleSendToAllHomes}
                  className="btn-tactile flex flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-5 py-3.5 font-display text-base font-extrabold text-white hover:bg-emerald-400 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {status === 'sending' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  <span>{status === 'sending' ? 'جاري البث للجميع...' : 'بث الرسالة للجميع 🔊'}</span>
                </button>
                <button
                  type="button"
                  disabled={status === 'sending'}
                  onClick={handleDiscard}
                  aria-label="إعادة التسجيل"
                  className="btn-tactile flex items-center justify-center gap-1.5 rounded-2xl border-b-4 border-slate-300 bg-slate-200 px-4 py-3.5 font-display text-sm font-bold text-slate-700 hover:bg-slate-300 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>إعادة</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => {
                  if (status === 'recording' && Date.now() - pressStartTimeRef.current >= 350) {
                    stopRecording();
                  }
                }}
                className={`btn-tactile relative flex h-28 w-28 select-none flex-col items-center justify-center rounded-full border-b-4 font-display text-white shadow-lg cursor-pointer touch-none ${
                  status === 'recording'
                    ? 'border-rose-800 bg-rose-600 ring-8 ring-rose-200'
                    : 'border-rose-700 bg-rose-500 hover:bg-rose-400'
                }`}
              >
                {status === 'recording' ? (
                  <>
                    <Square className="h-8 w-8 fill-current mb-1" />
                    <span className="text-xs font-extrabold tabular-nums">{secondsLeft} ث</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-9 w-9 mb-1" />
                    <span className="text-xs font-extrabold">اضغط مطولاً</span>
                  </>
                )}
              </button>

              <div className="mt-4 w-full max-w-xs">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all duration-75 ${
                      status === 'recording' ? 'bg-rose-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${status === 'recording' ? progressPct : 0}%` }}
                  />
                </div>
                {status === 'recording' ? (
                  <div className="mt-2 flex items-center justify-center gap-1 h-5">
                    {[0.6, 1, 0.85, 1.15, 0.75, 0.95, 0.65].map((mult, idx) => (
                      <div
                        key={idx}
                        className="w-1.5 rounded-full bg-rose-500 transition-all duration-75"
                        style={{
                          height: `${Math.max(20, Math.min(100, micLevel * mult))}%`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    اضغط باستمرار للتحدث (أو انقر للبدء والإيقاف) — حتى 5 ثوانٍ
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>تصل لجميع أجهزة العائلة وتُحذف من قاعدة البيانات تلقائياً بعد الاستماع إليها</span>
        </div>
      </div>
    </div>
  );
}
