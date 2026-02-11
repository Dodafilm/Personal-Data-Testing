'use client';

import { useState, useCallback, useEffect } from 'react';
import { loadSettings, saveSettings as persistSettings } from '@/lib/store';
import type { Settings } from '@/lib/types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    persistSettings(patch);
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  return { settings, updateSettings };
}
