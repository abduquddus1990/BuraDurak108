import React, { createContext, useContext } from 'react';
import { SHOP_ITEMS } from '../../../shared/src/types/progress';

// Premium dizaynlar: sotib olinganmi va sotib olish (Telegram Stars)
export interface ShopContextValue {
  isUnlocked: (themeId: string) => boolean;
  buyItem: (itemId: string) => void;
}

const ShopContext = createContext<ShopContextValue>({ isUnlocked: () => true, buyItem: () => {} });

export const ShopProvider = ShopContext.Provider;
export const useShop = () => useContext(ShopContext);

export const shopItemForTheme = (themeId: string) => SHOP_ITEMS.find((i) => i.themeId === themeId);
