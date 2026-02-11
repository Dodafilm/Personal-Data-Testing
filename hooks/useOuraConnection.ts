'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/lib/store-provider';
import { normalizeOuraSleep, normalizeOuraHeartRate, normalizeOuraActivity, normalizeOuraStress } from '@/lib/data-adapter';

interface FetchResult {
  sleep: number;
  heart: number;
  workout: number;
  stress: number;
  errors: string[];
}

export function useOuraConnection() {
  const store = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: '' | 'success' | 'error' | 'loading' }>({ text: '', type: '' });

  const startOAuth = useCallback(() => {
    window.location.href = '/api/oura/authorize';
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/oura/daily_sleep?start_date=2000-01-01&end_date=2000-01-01');
      setIsConnected(res.status !== 401);
    } catch {
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsConnected(false);
    setStatus({ text: 'Disconnected. Refresh and reconnect when ready.', type: '' });
  }, []);

  const fetchData = useCallback(async (startDate: string, endDate: string, onDataImported: () => void) => {
    setStatus({ text: 'Fetching data from Oura...', type: 'loading' });

    const endpoints = [
      { path: 'daily_sleep', key: 'sleep' as const, normalize: normalizeOuraSleep },
      { path: 'heartrate', key: 'heart' as const, normalize: normalizeOuraHeartRate },
      { path: 'daily_activity', key: 'workout' as const, normalize: normalizeOuraActivity },
      { path: 'daily_stress', key: 'stress' as const, normalize: normalizeOuraStress },
    ];

    const result: FetchResult = { sleep: 0, heart: 0, workout: 0, stress: 0, errors: [] };

    for (const ep of endpoints) {
      try {
        const res = await fetch(`/api/oura/${ep.path}?start_date=${startDate}&end_date=${endDate}`);
        if (res.status === 401) {
          setIsConnected(false);
          setStatus({ text: 'Token expired. Please reconnect your Oura Ring.', type: 'error' });
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${ep.key}: ${res.status} ${text}`);
        }
        const data = await res.json();
        const normalized = ep.normalize(data);
        const saveResult = store.saveDays(normalized);
        if (saveResult instanceof Promise) await saveResult;
        result[ep.key] = normalized.length;
      } catch (err) {
        result.errors.push((err as Error).message);
      }
    }

    // Try detailed sleep periods for intraday data (phases, bedtime timestamps).
    // This endpoint requires the Sleep scope which may not be available —
    // a 401 here just means we keep the daily summary data from above.
    try {
      const res = await fetch(`/api/oura/sleep_periods?start_date=${startDate}&end_date=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        const detailed = normalizeOuraSleep(data);
        if (detailed.length > 0) {
          const saveResult = store.saveDays(detailed);
          if (saveResult instanceof Promise) await saveResult;
          result.sleep = detailed.length;
        }
      }
      // 401 or other errors silently skipped — daily_sleep data is sufficient
    } catch {
      // Detailed sleep not available, that's fine
    }

    const total = result.sleep + result.heart + result.workout + result.stress;
    let msg = `Imported ${total} records`;
    if (result.errors.length > 0) {
      msg += ` (${result.errors.length} failed: ${result.errors.join('; ')})`;
    }
    setStatus({ text: msg, type: total > 0 ? 'success' : 'error' });
    onDataImported();
  }, [store]);

  return { isConnected, status, startOAuth, checkConnection, disconnect, fetchData, setIsConnected, setStatus };
}
