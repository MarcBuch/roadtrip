'use client';

import { useState } from 'react';
import { CostSettings } from '@/types/travel';

const DEFAULT_SETTINGS: CostSettings = {
  mpg: 25,
  pricePerGallon: 3.5,
};

export function useCostSettings() {
  const [settings, setSettings] = useState<CostSettings>(DEFAULT_SETTINGS);

  const updateMpg = (mpg: number) => {
    setSettings((prev) => ({ ...prev, mpg }));
  };

  const updatePrice = (pricePerGallon: number) => {
    setSettings((prev) => ({ ...prev, pricePerGallon }));
  };

  return {
    settings,
    updateMpg,
    updatePrice,
  };
}
