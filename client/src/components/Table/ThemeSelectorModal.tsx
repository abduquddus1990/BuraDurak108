import React, { useState } from 'react';
import {
  TableThemeId,
  AppBackgroundId,
  CardBackId,
  TABLE_THEMES,
  APP_BACKGROUNDS,
  CARD_BACK_THEMES,
} from '../../types/theme';
import { Palette, Layers, Sparkles, Check, X, Shield } from 'lucide-react';
import { triggerHaptic } from '../../services/telegramSdk';
import { useShop, shopItemForTheme } from '../../services/shop';

interface ThemeSelectorModalProps {
  currentThemeId: TableThemeId;
  currentBgId: AppBackgroundId;
  currentCardBackId: CardBackId;
  isOpen: boolean;
  onClose: () => void;
  onSelectTheme: (id: TableThemeId) => void;
  onSelectBg: (id: AppBackgroundId) => void;
  onSelectCardBack: (id: CardBackId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  currentThemeId,
  currentBgId,
  currentCardBackId,
  isOpen,
  onClose,
  onSelectTheme,
  onSelectBg,
  onSelectCardBack,
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'bg' | 'card'>('table');
  const { isUnlocked, buyItem } = useShop();

  // Premium dizayn qulflangan bo'lsa - tanlash o'rniga sotib olish taklif qilinadi
  const choose = (themeId: string, select: () => void) => {
    if (isUnlocked(themeId)) {
      triggerHaptic('medium');
      select();
      return;
    }
    const item = shopItemForTheme(themeId);
    if (item) buyItem(item.id);
  };
  const lockLabel = (themeId: string) => {
    if (isUnlocked(themeId)) return null;
    const item = shopItemForTheme(themeId);
    return item ? (
      <span className="ml-auto shrink-0 text-[10px] font-black text-amber-300 bg-amber-950/80 border border-amber-600/60 rounded-full px-1.5 py-0.5">
        🔒 {item.priceStars}⭐
      </span>
    ) : null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 relative max-h-[85vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-choyxona-gold" />
          <h3 className="font-bold text-base text-amber-100">Dizayn va Ranglar Sozlamasi</h3>
        </div>

        {/* 3 ta Kategoriya tabi */}
        <div className="grid grid-cols-3 gap-1 bg-stone-800 p-1 rounded-2xl border border-stone-700">
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('table');
            }}
            className={`py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'table' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stol Foni</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('bg');
            }}
            className={`py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'bg' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Umumiy Fon</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('card');
            }}
            className={`py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'card' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Karta Foni</span>
          </button>
        </div>

        {/* 1. STOL FONI TANLOVI */}
        {activeTab === 'table' && (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">
            <span className="text-[11px] font-bold text-stone-400">Xontaxta / Stol matosi rangini tanlang:</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(TABLE_THEMES).map((theme) => {
                const isSelected = currentThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => choose(theme.id, () => onSelectTheme(theme.id))}
                    className={`p-2.5 rounded-2xl flex items-center gap-2 border-2 text-left transition ${
                      isSelected ? 'border-amber-400 bg-stone-800 shadow scale-[1.02]' : 'border-stone-800 bg-stone-800/40 hover:border-stone-600'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full shadow border border-white/20 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: theme.previewColor }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <span className="text-xs font-bold text-stone-200 truncate">{theme.name}</span>
                    {lockLabel(theme.id)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. UMUMIY FON TANLOVI */}
        {activeTab === 'bg' && (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">
            <span className="text-[11px] font-bold text-stone-400">Ilovaning tashqi orqa fonini tanlang:</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(APP_BACKGROUNDS).map((bg) => {
                const isSelected = currentBgId === bg.id;
                return (
                  <button
                    key={bg.id}
                    onClick={() => {
                      triggerHaptic('medium');
                      onSelectBg(bg.id);
                    }}
                    className={`p-2.5 rounded-2xl flex items-center gap-2 border-2 text-left transition ${
                      isSelected ? 'border-amber-400 bg-stone-800 shadow scale-[1.02]' : 'border-stone-800 bg-stone-800/40 hover:border-stone-600'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full shadow border border-white/20 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: bg.previewColor }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <span className="text-xs font-bold text-stone-200 truncate">{bg.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. KARTA FONI (GULI) TANLOVI */}
        {activeTab === 'card' && (
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">
            <span className="text-[11px] font-bold text-stone-400">Kartaning orqa tomoni (guli) dizaynini tanlang:</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(CARD_BACK_THEMES).map((cb) => {
                const isSelected = currentCardBackId === cb.id;
                return (
                  <button
                    key={cb.id}
                    onClick={() => choose(cb.id, () => onSelectCardBack(cb.id))}
                    className={`p-2.5 rounded-2xl flex items-center gap-2 border-2 text-left transition ${
                      isSelected ? 'border-amber-400 bg-stone-800 shadow scale-[1.02]' : 'border-stone-800 bg-stone-800/40 hover:border-stone-600'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-lg shadow border flex items-center justify-center shrink-0 text-xs"
                      style={{ backgroundColor: cb.previewColor, borderColor: cb.borderColor }}
                    >
                      {cb.symbol}
                    </span>
                    <span className="text-xs font-bold text-stone-200 truncate">{cb.name}</span>
                    {lockLabel(cb.id)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
