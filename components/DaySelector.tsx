'use client';

import type { DayRecord } from '@/lib/types';

interface DaySelectorProps {
  year: number;
  month: number;
  selectedDay: number | null;
  onChange: (day: number) => void;
  data: DayRecord[];
}

export default function DaySelector({ year, month, selectedDay, onChange, data }: DaySelectorProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const daysWithData = new Set(
    data.map(d => parseInt(d.date.slice(8), 10)),
  );

  return (
    <div className="day-picker">
      <div className="day-picker-header">
        <span className="day-picker-title">Select Day</span>
      </div>
      <div className="day-picker-grid">
        {allDays.map(day => (
          <button
            key={day}
            className={`day-picker-btn${selectedDay === day ? ' active' : ''}${daysWithData.has(day) ? ' has-data' : ''}`}
            onClick={() => onChange(day)}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}
