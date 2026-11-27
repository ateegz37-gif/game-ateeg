import { useState } from 'react';
import { Trophy, Calendar, Coins, ArrowRight } from 'lucide-react';
import { HallOfChampionsEntry } from '../types';
import { getAgeLevelMeta, getCharacterMeta } from '../data/characters';
import { formatCurrencyAmount } from '../utils/storage';

interface HallOfChampionsProps {
  entries: HallOfChampionsEntry[];
  onBackHome: () => void;
}

const TROPHY_IMAGE_URL = '/src/assets/images/champions_trophy_cup_1795204292866.jpg';

export function HallOfChampions({ entries, onBackHome }: HallOfChampionsProps) {
  const [imgErr, setImgErr] = useState(false);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-amber-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {!imgErr ? (
            <img
              src={TROPHY_IMAGE_URL}
              alt="كأس قاعة الأبطال"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="h-16 w-16 shrink-0 rounded-2xl object-contain mix-blend-multiply"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Trophy className="h-8 w-8" />
            </div>
          )}
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900">
              قاعة أبطال عائلة عتيق
            </h2>
            <p className="text-sm text-slate-600">
              سجل الفائزين والجوائز المسلمة في جميع مواسم تحدي أبطال عائلة عتيق
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackHome}
          className="btn-tactile flex items-center gap-2 rounded-2xl border-b-4 border-sky-800 bg-sky-600 px-5 py-3 font-display text-sm font-extrabold text-white hover:bg-sky-500 cursor-pointer whitespace-nowrap"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للمضمار</span>
        </button>
      </div>

      {/* Empty State or History List */}
      {entries.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-4xl">
            🏆
          </div>
          <h3 className="font-display text-xl font-extrabold text-slate-800">
            قاعة أبطال عائلة عتيق بانتظار أول تتويج!
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            عندما ينهي الأطفال السباق ويضغط ولي الأمر على زر «تسليم الجوائز وتصفير الدوري» في لوحة
            التحكم، ستُخلَّد أسماء الفائزين الثلاثة الأوائل وجوائزهم هنا للأبد.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <article
              key={entry.id}
              className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="font-display text-lg font-extrabold text-slate-900">
                  موسم التحدي رقم {entries.length - idx}
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(entry.dateIso)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {entry.winners.map((w) => {
                  const char = getCharacterMeta(w.character);
                  const tier = getAgeLevelMeta(w.level);
                  const medal = w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉';
                  const rankTitle =
                    w.rank === 1 ? 'المركز الأول' : w.rank === 2 ? 'المركز الثاني' : 'المركز الثالث';

                  return (
                    <div
                      key={`${entry.id}-${w.rank}`}
                      className={`rounded-2xl border-2 p-4 ${
                        w.rank === 1
                          ? 'border-amber-300 bg-amber-50/70'
                          : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-slate-600">{rankTitle}</span>
                        <span className="text-2xl">{medal}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{char.emoji}</span>
                        <div>
                          <div className="font-display text-lg font-extrabold text-slate-900">
                            {w.name}
                          </div>
                          <div className="text-xs text-slate-600">
                            {tier.name} <span aria-hidden="true">·</span>{' '}
                            <span className="font-bold tabular-nums">{w.points} نقطة</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-200/70 pt-2 font-display text-sm font-black text-emerald-700 tabular-nums">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <span>الجائزة: {formatCurrencyAmount(w.prizeAmount, entry.currency)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
