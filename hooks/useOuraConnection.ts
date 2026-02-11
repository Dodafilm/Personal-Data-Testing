'use client';

import { useState, useCallback } from 'react';
import { saveDays } from '@/lib/store';
import { normalizeOuraSleep, normalizeOuraHeartRate, normalizeOuraActivity } from '@/lib/data-adapter';

interface FetchResult {
  sleep: number;
  heart: number;
  workout: number;
  errors: string[];
}

export function useOuraConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: '' | 'success' | 'error' | 'loading' }>({ text: '', type: '' });

  const startOAuth = useCallback(() => {
    window.location.href = '/api/oura/authorize';
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/oura/daily_sleep?start_date=2000-01-01&end_date=2000-01-01');
      // If we get 401, not connected. Anything else means the cookie exists.
      setIsConnected(res.status !== 401);
    } catch {
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    // Clear the httpOnly cookie by calling a simple endpoint or just setting it expired
    // For now, we'll just tell the user — the cookie is httpOnly so we can't clear it from JS
    // A proper logout would need a server route, but for MVP we can use the authorize route to re-auth
    setIsConnected(false);
    setStatus({ text: 'Disconnected. Refresh and reconnect when ready.', type: '' });
  }, []);

  const fetchData = useCallback(async (startDate: string, endDate: string, onDataImported: () => void) => {
    setStatus({ text: 'Fetching data from Oura...', type: 'loading' });

    const endpoints = [
      { path: 'daily_sleep', key: 'sleep' as const, normalize: normalizeOuraSleep },
      { path: 'heartrate', key: 'heart' as const, normalize: normalizeOuraHeartRate },
      { path: 'daily_activity', key: 'workout' as const, normalize: normalizeOuraActivity },
    ];

    const result: FetchResult = { sleep: 0, heart: 0, workout: 0, errors: [] };

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
        saveDays(normalized);
        result[ep.key] = normalized.length;
      } catch (err) {
        result.errors.push((err as Error).message);
      }
    }

    const total = result.sleep + result.heart + result.workout;
    let msg = `Imported ${total} records`;
    if (result.errors.length > 0) {
      msg += ` (${result.errors.length} failed: ${result.errors.join('; ')})`;
    }
    setStatus({ text: msg, type: total > 0 ? 'success' : 'error' });
    onDataImported();
  }, []);

  return { isConnected, status, startOAuth, checkConnection, disconnect, fetchData, setIsConnected, setStatus };
}
