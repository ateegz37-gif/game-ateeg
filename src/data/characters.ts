import { AgeLevel, CategoryId, CharacterId, VoiceTone } from '../types';

export interface CharacterMeta {
  id: CharacterId;
  label: string;
  emoji: string;
  laneBg: string;
  laneBorder: string;
  accentBg: string;
  accentText: string;
  trackFill: string;
  flipForRtl?: boolean; // Some vehicle emojis naturally face left (which is forward in RTL!)
}

export const CHARACTERS: CharacterMeta[] = [
  {
    id: 'geekboy',
    label: 'الفتى المشاكس بالنظارة',
    emoji: '🤓',
    laneBg: 'bg-sky-50',
    laneBorder: 'border-sky-200',
    accentBg: 'bg-sky-500',
    accentText: 'text-sky-700',
    trackFill: 'from-sky-400 to-blue-500',
    flipForRtl: false,
  },
  {
    id: 'astronaut',
    label: 'رائد الفضاء الطريف',
    emoji: '👨‍🚀',
    laneBg: 'bg-indigo-50',
    laneBorder: 'border-indigo-200',
    accentBg: 'bg-indigo-500',
    accentText: 'text-indigo-700',
    trackFill: 'from-indigo-400 to-blue-600',
    flipForRtl: false,
  },
  {
    id: 'superhero',
    label: 'البطل الخارق',
    emoji: '🦸',
    laneBg: 'bg-violet-50',
    laneBorder: 'border-violet-200',
    accentBg: 'bg-violet-500',
    accentText: 'text-violet-700',
    trackFill: 'from-violet-400 to-purple-500',
    flipForRtl: false,
  },
  {
    id: 'dinosaur',
    label: 'الديناصور المصدوم',
    emoji: '🦖',
    laneBg: 'bg-emerald-50',
    laneBorder: 'border-emerald-200',
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-700',
    trackFill: 'from-emerald-400 to-teal-500',
    flipForRtl: true,
  },
  {
    id: 'bee',
    label: 'النحلة النشيطة',
    emoji: '🐝',
    laneBg: 'bg-amber-50',
    laneBorder: 'border-amber-200',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-800',
    trackFill: 'from-amber-400 to-orange-500',
    flipForRtl: true,
  },
  {
    id: 'alien',
    label: 'الكائن الفضائي',
    emoji: '👽',
    laneBg: 'bg-lime-50',
    laneBorder: 'border-lime-200',
    accentBg: 'bg-lime-500',
    accentText: 'text-lime-800',
    trackFill: 'from-lime-400 to-emerald-500',
    flipForRtl: false,
  },
  {
    id: 'rabbit',
    label: 'الأرنب السريع',
    emoji: '🐇',
    laneBg: 'bg-pink-50',
    laneBorder: 'border-pink-200',
    accentBg: 'bg-pink-500',
    accentText: 'text-pink-700',
    trackFill: 'from-pink-400 to-rose-500',
    flipForRtl: true,
  },
  {
    id: 'explorer',
    label: 'المستكشف الصغير',
    emoji: '🤠',
    laneBg: 'bg-orange-50',
    laneBorder: 'border-orange-200',
    accentBg: 'bg-orange-500',
    accentText: 'text-orange-800',
    trackFill: 'from-orange-400 to-amber-500',
    flipForRtl: false,
  },
  {
    id: 'rocket',
    label: 'الصاروخ السريع',
    emoji: '🚀',
    laneBg: 'bg-cyan-50',
    laneBorder: 'border-cyan-200',
    accentBg: 'bg-cyan-500',
    accentText: 'text-cyan-800',
    trackFill: 'from-cyan-400 to-sky-500',
    flipForRtl: false,
  },
  {
    id: 'racecar',
    label: 'سيارة السباق',
    emoji: '🏎️',
    laneBg: 'bg-rose-50',
    laneBorder: 'border-rose-200',
    accentBg: 'bg-rose-500',
    accentText: 'text-rose-700',
    trackFill: 'from-rose-400 to-red-500',
    flipForRtl: true,
  },
];

const LEGACY_CHARACTER_MAP: Partial<Record<CharacterId, CharacterId>> = {
  unicorn: 'rabbit',
  jet: 'rocket',
  speedboat: 'astronaut',
  train: 'racecar',
};

export function getCharacterMeta(id: CharacterId): CharacterMeta {
  const mappedId = LEGACY_CHARACTER_MAP[id] ?? id;
  return CHARACTERS.find((c) => c.id === mappedId) ?? CHARACTERS[0];
}

export interface AgeLevelMeta {
  level: AgeLevel;
  name: string;
  ageRange: string;
  description: string;
  colorClass: string;
}

export const AGE_LEVELS: AgeLevelMeta[] = [
  {
    level: 1,
    name: 'براعم',
    ageRange: '5–7 سنوات',
    description: 'أسئلة ممتعة وبسيطة للبدايات المشرقة',
    colorClass: 'text-emerald-700',
  },
  {
    level: 2,
    name: 'أبطال',
    ageRange: '8–10 سنوات',
    description: 'تحديات شيّقة وتنشيط ذكي للعقل',
    colorClass: 'text-sky-700',
  },
  {
    level: 3,
    name: 'عباقرة',
    ageRange: '11–14 سنة',
    description: 'ألغاز ومعلومات متقدمة للمستكشفين الكبار',
    colorClass: 'text-violet-700',
  },
];

export function getAgeLevelMeta(level: AgeLevel): AgeLevelMeta {
  return AGE_LEVELS.find((a) => a.level === level) ?? AGE_LEVELS[0];
}

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  shortName: string;
  emoji: string;
  wheelColor: string;
  wheelText: string;
  accentBg: string;
  accentBorder: string;
  lightBg: string;
  textColor: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'math',
    name: 'الرياضيات والألغاز الذهنية',
    shortName: 'الرياضيات والألغاز',
    emoji: '🧮',
    wheelColor: '#F59E0B',
    wheelText: '#FFFFFF',
    accentBg: 'bg-amber-500',
    accentBorder: 'border-amber-600',
    lightBg: 'bg-amber-50',
    textColor: 'text-amber-800',
  },
  {
    id: 'english',
    name: 'اللغة الإنجليزية الممتعة',
    shortName: 'الإنجليزية الممتعة',
    emoji: '🔤',
    wheelColor: '#0284C7',
    wheelText: '#FFFFFF',
    accentBg: 'bg-sky-600',
    accentBorder: 'border-sky-700',
    lightBg: 'bg-sky-50',
    textColor: 'text-sky-800',
  },
  {
    id: 'science',
    name: 'العلوم والفضاء والحيوانات',
    shortName: 'العلوم والفضاء',
    emoji: '🚀',
    wheelColor: '#10B981',
    wheelText: '#FFFFFF',
    accentBg: 'bg-emerald-600',
    accentBorder: 'border-emerald-700',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-800',
  },
  {
    id: 'islamic',
    name: 'الآداب والثقافة الإسلامية',
    shortName: 'الثقافة الإسلامية',
    emoji: '🌙',
    wheelColor: '#7C3AED',
    wheelText: '#FFFFFF',
    accentBg: 'bg-violet-600',
    accentBorder: 'border-violet-700',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-800',
  },
];

export function getCategoryMeta(id: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export interface VoiceToneMeta {
  id: VoiceTone;
  label: string;
  subtitle: string;
  emoji: string;
  bubblePhrase: string;
}

export const VOICE_TONES: VoiceToneMeta[] = [
  {
    id: 'normal',
    label: 'صوت طبيعي',
    subtitle: 'واضح ومباشر',
    emoji: '🗣️',
    bubblePhrase: 'هيا يا أبطال!',
  },
  {
    id: 'chipmunk',
    label: 'صوت سنجاب مضحك',
    subtitle: 'سريع وخفيف',
    emoji: '🐿️',
    bubblePhrase: 'سريعاً نحو الكنز!',
  },
  {
    id: 'robot',
    label: 'صوت روبوت فضائي',
    subtitle: 'مؤثر آلي ممتع',
    emoji: '🤖',
    bubblePhrase: 'انطلاق فضائي!',
  },
];
