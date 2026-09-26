export type TableThemeId =
  | 'classic_wood'
  | 'emerald_kazino'
  | 'sapphire_blue'
  | 'crimson_velvet'
  | 'midnight_cyber'
  | 'ivory_silk'
  | 'samarqand_oltin'; // premium (Telegram Stars / VIP)

export type AppBackgroundId =
  | 'choyxona_night'
  | 'choyxona_day'
  | 'yorug_choyxona'
  | 'oq_marmar'
  | 'modern_studio'
  | 'oriental_palace';

export type CardBackId =
  | 'paxtagul_gold'
  | 'adras_blue'
  | 'registon_night'
  | 'ruby_classic'
  | 'black_royal'
  | 'shoh_oltin'; // premium (Telegram Stars / VIP)

export interface TableTheme {
  id: TableThemeId;
  name: string;
  type: 'dark' | 'light';
  tableBackground: string;
  tableBorder: string;
  feltColor: string;
  accentGlow: string;
  textColor: string;
  previewColor: string;
}

export interface AppBackground {
  id: AppBackgroundId;
  name: string;
  backgroundClass: string;
  previewColor: string;
}

export interface CardBackTheme {
  id: CardBackId;
  name: string;
  backgroundClass: string;
  borderColor: string;
  symbol: string;
  previewColor: string;
}

export const APP_BACKGROUNDS: Record<AppBackgroundId, AppBackground> = {
  choyxona_night: {
    id: 'choyxona_night',
    name: 'Tungi Choyxona',
    backgroundClass: 'bg-gradient-to-b from-[#18110c] via-[#0d0906] to-[#050302]',
    previewColor: '#18110c',
  },
  choyxona_day: {
    id: 'choyxona_day',
    name: 'Kunduzgi Oltin Choyxona',
    backgroundClass: 'bg-gradient-to-b from-[#78350f] via-[#451a03] to-[#1c1917]',
    previewColor: '#b45309',
  },
  yorug_choyxona: {
    id: 'yorug_choyxona',
    name: "Yashil Chorbog'",
    backgroundClass: 'bg-gradient-to-b from-[#065f46] via-[#064e3b] to-[#022c22]',
    previewColor: '#059669',
  },
  oq_marmar: {
    id: 'oq_marmar',
    name: 'Kumush & Moviy Marmar',
    backgroundClass: 'bg-gradient-to-b from-[#334155] via-[#1e293b] to-[#0f172a]',
    previewColor: '#64748b',
  },
  modern_studio: {
    id: 'modern_studio',
    name: 'Safir Neon Studio',
    backgroundClass: 'bg-gradient-to-b from-[#1e3a8a] via-[#0f172a] to-[#020617]',
    previewColor: '#2563eb',
  },
  oriental_palace: {
    id: 'oriental_palace',
    name: 'Sharqona Yoqut Saroy',
    backgroundClass: 'bg-gradient-to-b from-[#701a75] via-[#4a044e] to-[#1f0224]',
    previewColor: '#9333ea',
  },
};

export const TABLE_THEMES: Record<TableThemeId, TableTheme> = {
  classic_wood: {
    id: 'classic_wood',
    name: 'Klassik Xontaxta',
    type: 'dark',
    tableBackground: 'radial-gradient(circle at center, #6b4423 0%, #3e2719 55%, #24140a 100%)',
    tableBorder: '#eab308',
    feltColor: '#4a2f1c',
    accentGlow: 'rgba(234, 179, 8, 0.4)',
    textColor: '#fef3c7',
    previewColor: '#6b4423',
  },
  emerald_kazino: {
    id: 'emerald_kazino',
    name: 'Zumrad Baxmal',
    type: 'dark',
    tableBackground: 'radial-gradient(circle at center, #065f46 0%, #064e3b 50%, #022c22 100%)',
    tableBorder: '#10b981',
    feltColor: '#047857',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    textColor: '#ecfdf5',
    previewColor: '#059669',
  },
  sapphire_blue: {
    id: 'sapphire_blue',
    name: 'Qirollik Sapfiri',
    type: 'dark',
    tableBackground: 'radial-gradient(circle at center, #1e3a8a 0%, #172554 55%, #0b132b 100%)',
    tableBorder: '#60a5fa',
    feltColor: '#1e40af',
    accentGlow: 'rgba(96, 165, 250, 0.4)',
    textColor: '#eff6ff',
    previewColor: '#2563eb',
  },
  crimson_velvet: {
    id: 'crimson_velvet',
    name: 'Qirmizi Baxmal',
    type: 'dark',
    tableBackground: 'radial-gradient(circle at center, #991b1b 0%, #7f1d1d 55%, #450a0a 100%)',
    tableBorder: '#f87171',
    feltColor: '#b91c1c',
    accentGlow: 'rgba(248, 113, 113, 0.4)',
    textColor: '#fef2f2',
    previewColor: '#dc2626',
  },
  midnight_cyber: {
    id: 'midnight_cyber',
    name: 'Kiberpank Qora',
    type: 'dark',
    tableBackground: 'radial-gradient(circle at center, #1e1e24 0%, #111115 60%, #08080a 100%)',
    tableBorder: '#fbbf24',
    feltColor: '#18181f',
    accentGlow: 'rgba(251, 191, 36, 0.5)',
    textColor: '#f3f4f6',
    previewColor: '#18181f',
  },
  ivory_silk: {
    id: 'ivory_silk',
    name: 'Nafis Oq Ipak',
    type: 'light',
    tableBackground: 'radial-gradient(circle at center, #fefce8 0%, #fef3c7 50%, #fde68a 100%)',
    tableBorder: '#d97706',
    feltColor: '#fffbeb',
    accentGlow: 'rgba(217, 119, 6, 0.3)',
    textColor: '#451a03',
    previewColor: '#fef08a',
  },
  samarqand_oltin: {
    id: 'samarqand_oltin',
    name: 'Samarqand Oltin ✨',
    type: 'dark',
    tableBackground: 'radial-gradient(circle at center, #0f766e 0%, #134e4a 45%, #042f2e 100%)',
    tableBorder: '#fcd34d',
    feltColor: '#115e59',
    accentGlow: 'rgba(252, 211, 77, 0.55)',
    textColor: '#fef9c3',
    previewColor: '#0f766e',
  },
};

export const CARD_BACK_THEMES: Record<CardBackId, CardBackTheme> = {
  paxtagul_gold: {
    id: 'paxtagul_gold',
    name: 'Oltin Paxtagul',
    backgroundClass: 'bg-gradient-to-br from-amber-700 via-amber-900 to-stone-950',
    borderColor: '#eab308',
    symbol: '☕',
    previewColor: '#78350f',
  },
  adras_blue: {
    id: 'adras_blue',
    name: 'Moviy Adras',
    backgroundClass: 'bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-950',
    borderColor: '#60a5fa',
    symbol: '🔷',
    previewColor: '#1e40af',
  },
  registon_night: {
    id: 'registon_night',
    name: 'Registon Naqshi',
    backgroundClass: 'bg-gradient-to-br from-teal-700 via-emerald-900 to-stone-950',
    borderColor: '#34d399',
    symbol: '🕌',
    previewColor: '#065f46',
  },
  ruby_classic: {
    id: 'ruby_classic',
    name: 'Qizil Duoba',
    backgroundClass: 'bg-gradient-to-br from-red-700 via-rose-950 to-stone-950',
    borderColor: '#f87171',
    symbol: '👑',
    previewColor: '#991b1b',
  },
  black_royal: {
    id: 'black_royal',
    name: 'Qirollik Qora',
    backgroundClass: 'bg-gradient-to-br from-stone-800 via-stone-950 to-black',
    borderColor: '#fbbf24',
    symbol: '⚔️',
    previewColor: '#1c1917',
  },
  shoh_oltin: {
    id: 'shoh_oltin',
    name: 'Shoh Oltin ✨',
    backgroundClass: 'bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-800',
    borderColor: '#fef08a',
    symbol: '🌟',
    previewColor: '#f59e0b',
  },
};
