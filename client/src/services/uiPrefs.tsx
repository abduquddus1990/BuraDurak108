import React, { createContext, useContext, useState } from 'react';

// Foydalanuvchining shaxsiy interfeys sozlamalari (faqat shu qurilmada saqlanadi)
export interface UiPrefs {
  largeCards: boolean; // Katta kartalar va yirik yozuvlar (ko'zi zaifroq o'yinchilar uchun)
  sound: boolean; // Ovoz effektlari va e'lonlar
}

const DEFAULT_PREFS: UiPrefs = { largeCards: false, sound: true };

const load = (): UiPrefs => {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('choyxona_ui_prefs') || '{}') };
  } catch (e) {
    return DEFAULT_PREFS;
  }
};

interface UiPrefsContextValue extends UiPrefs {
  setPref: <K extends keyof UiPrefs>(key: K, value: UiPrefs[K]) => void;
}

const UiPrefsContext = createContext<UiPrefsContextValue>({ ...DEFAULT_PREFS, setPref: () => {} });

export const UiPrefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<UiPrefs>(load);
  const setPref = <K extends keyof UiPrefs>(key: K, value: UiPrefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem('choyxona_ui_prefs', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };
  return <UiPrefsContext.Provider value={{ ...prefs, setPref }}>{children}</UiPrefsContext.Provider>;
};

export const useUiPrefs = () => useContext(UiPrefsContext);
