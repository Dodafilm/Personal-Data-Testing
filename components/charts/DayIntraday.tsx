'use client';

import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import { useChart } from './useChart';
import { parsePipeString, mapToClockHours, formatHour } from '@/lib/intraday-utils';
import type { DayRecord } from '@/lib/types';

const STAGE_LABELS: Record<number, string> = { 1: 'Deep', 2: 'Light', 3: 'REM', 4: 'Awake' };

interface DayIntradayProps {
  day: DayRecord | null;
}

export default function DayIntraday({ day }: DayIntradayProps) {
  if (!day) {
    return (
      <div className="day-intraday">
        <div className="overlay-chart-card">
          <p className="overlay-fallback">Select a day to see intraday data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="day-intraday">
      <SleepHypnogramCard day={day} />
      <StressGaugeCard day={day} />
    </div>
  );
}

/* ---- Sleep Hypnogram ---- */
function SleepHypnogramCard({ day }: { day: DayRecord }) {
  const [startHour, setStartHour] = useState(0);

  const config = useMemo((): ChartConfiguration | null => {
    if (!day.sleep?.phases_5min || !day.sleep?.bedtime_start) return null;

    const phases = parsePipeString(day.sleep.phases_5min);
    const points = mapToClockHours(phases, day.sleep.bedtime_start, 5);

    // Normalize each point into [startHour, startHour+24) window
    const shifted = points.map(p => {
      let x = p.hour;
      while (x < startHour) x += 24;
      while (x >= startHour + 24) x -= 24;
      return { x, y: p.value };
    });

    return {
      type: 'line',
      data: {
        datasets: [{
          label: 'Sleep Stage',
          data: shifted,
          borderColor: '#74b9ff',
          borderWidth: 2,
          pointRadius: 0,
          stepped: 'before' as const,
          fill: false,
          tension: 0,
        }],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const item = items[0];
                if (!item) return '';
                return formatHour(item.parsed.x ?? 0);
              },
              label: (item) => {
                const y = item.parsed.y ?? 0;
                return STAGE_LABELS[y] || `Stage ${y}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: startHour,
            max: startHour + 24,
            ticks: {
              stepSize: 2,
              callback: (val) => formatHour(val as number),
              color: '#55556a',
              font: { size: 10 },
            },
            title: { display: true, text: 'Clock Time', color: '#55556a' },
            grid: { color: 'rgba(42, 42, 64, 0.5)' },
          },
          y: {
            min: 0.5,
            max: 4.5,
            ticks: {
              stepSize: 1,
              callback: (val) => STAGE_LABELS[val as number] || '',
              color: '#55556a',
              font: { size: 10 },
            },
            title: { display: true, text: 'Sleep Stage', color: '#55556a' },
            grid: { color: 'rgba(42, 42, 64, 0.5)' },
          },
        },
      },
    };
  }, [day, startHour]);

  const canvasRef = useChart(config);

  return (
    <div className="overlay-chart-card">
      <div className="hypnogram-header">
        <h3>Sleep Hypnogram</h3>
        <label className="hypnogram-start-label">
          Start
          <input
            type="number"
            className="hypnogram-start-input"
            min={0}
            max={23}
            value={startHour}
            onChange={e => setStartHour(Math.min(23, Math.max(0, Number(e.target.value))))}
          />
          :00
        </label>
      </div>
      {config ? (
        <canvas ref={canvasRef} />
      ) : (
        <p className="overlay-fallback">Sleep hypnogram requires Oura Sleep scope</p>
      )}
    </div>
  );
}

/* ---- Stress Gauge ---- */
function StressGaugeCard({ day }: { day: DayRecord }) {
  if (!day.stress) {
    return (
      <div className="overlay-chart-card">
        <h3>Stress</h3>
        <p className="overlay-fallback">No stress data for this day</p>
      </div>
    );
  }

  const { stress_high, recovery_high, day_summary } = day.stress;
  const total = stress_high + recovery_high;
  const neutral = Math.max(0, 1440 - stress_high - recovery_high);

  const summaryClass =
    day_summary === 'restored' ? 'restored'
    : day_summary === 'stressful' ? 'stressful'
    : 'normal';

  return (
    <div className="overlay-chart-card">
      <h3>Stress (24h)</h3>
      {total > 0 ? (
        <div className="stress-gauge">
          <div
            className="stress-gauge-segment"
            style={{
              flex: stress_high,
              background: '#ffa500',
            }}
          >
            {stress_high}m stress
          </div>
          <div
            className="stress-gauge-segment"
            style={{
              flex: recovery_high,
              background: '#55efc4',
            }}
          >
            {recovery_high}m recovery
          </div>
          {neutral > 0 && (
            <div
              className="stress-gauge-segment stress-gauge-neutral"
              style={{
                flex: neutral,
              }}
            >
              {Math.round(neutral / 60)}h
            </div>
          )}
        </div>
      ) : (
        <p className="overlay-fallback">No stress/recovery minutes recorded</p>
      )}
      <div>
        <span className={`stress-badge ${summaryClass}`}>
          {day_summary}
        </span>
      </div>
    </div>
  );
}
