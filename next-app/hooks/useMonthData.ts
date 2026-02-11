'use client';

import { useState, useCallback } from 'react';
import { getMonthData } from '@/lib/store';
import type { DayRecord } from '@/lib/types';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function useMonthData(initialYear?: number, initialMonth?: number) {
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear());
  const [month, setMonth] = useState(initialMonth ?? new Date().getMonth() + 1);
  const [data, setData] = useState<DayRecord[]>([]);

  const refresh = useCallback(() => {
    setData(getMonthData(year, month));
  }, [year, month]);

  const prevMonth = useCallback(() => {
    setMonth(prev => {
      if (prev <= 1) {
        setYear(y => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setMonth(prev => {
      if (prev >= 12) {
        setYear(y => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const label = `${MONTHS[month]} ${year}`;

  return { year, month, data, label, refresh, prevMonth, nextMonth, setYear, setMonth };
}
