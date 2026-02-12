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
  const [showSleep, setShowSleep] = useState(true);
  const [showHeart, setShowHeart] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [startHour, setStartHour] = useState(0);

  const hasSleep = !!(day?.sleep?.phases_5min && day?.sleep?.bedtime_start);
  const hasHeart = !!(day?.heart?.samples && day.heart.samples.length > 0);
  const hasActivity = !!(day?.workout && (
    (day.workout.met_items && day.workout.met_items.length > 0 && day.workout.met_timestamp) ||
    day.workout.class_5min
  ));

  const config = useMemo((): ChartConfiguration | null => {
    if (!day) return null;
    if (!showSleep && !showHeart && !showActivity) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datasets: any[] = [];

    // Sleep hypnogram dataset
    if (showSleep && hasSleep) {
      const phases = parsePipeString(day.sleep!.phases_5min!);
      const points = mapToClockHours(phases, day.sleep!.bedtime_start!, 5);
      const shifted = points.map(p => {
        let x = p.hour;
        while (x < startHour) x += 24;
        while (x >= startHour + 24) x -= 24;
        return { x, y: p.value };
      });
      datasets.push({
        label: 'Sleep Stage',
        data: shifted,
        borderColor: '#74b9ff',
        borderWidth: 2,
        pointRadius: 0,
        stepped: 'before' as const,
        fill: false,
        tension: 0,
        yAxisID: 'ySleep',
      });
    }

    // Heart rate dataset
    if (showHeart && hasHeart) {
      const points = day.heart!.samples!.map(s => {
        const dt = new Date(s.ts);
        let hour = dt.getHours() + dt.getMinutes() / 60;
        while (hour < startHour) hour += 24;
        while (hour >= startHour + 24) hour -= 24;
        return { x: hour, y: s.bpm };
      }).sort((a, b) => a.x - b.x);
      datasets.push({
        label: 'Heart Rate',
        data: points,
        borderColor: '#ff6b6b',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        yAxisID: 'yHeart',
      });
    }

    // Activity dataset
    if (showActivity && hasActivity) {
      const w = day.workout!;
      let points: { x: number; y: number }[];
      if (w.met_items && w.met_items.length > 0 && w.met_timestamp) {
        const mapped = mapToClockHours(w.met_items, w.met_timestamp, 5);
        points = mapped.map(p => {
          let x = p.hour;
          while (x < startHour) x += 24;
          while (x >= startHour + 24) x -= 24;
          return { x, y: p.value };
        });
      } else {
        const phases = parsePipeString(w.class_5min!);
        const startOfDay = day.date + 'T00:00:00';
        const mapped = mapToClockHours(phases, startOfDay, 5);
        points = mapped.map(p => {
          let x = p.hour;
          while (x < startHour) x += 24;
          while (x >= startHour + 24) x -= 24;
          return { x, y: p.value };
        });
      }
      points.sort((a, b) => a.x - b.x);
      datasets.push({
        label: 'Activity',
        data: points,
        borderColor: '#55efc4',
        backgroundColor: 'rgba(85, 239, 196, 0.08)',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.3,
        yAxisID: 'yActivity',
      });
    }

    if (datasets.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scales: any = {
      x: {
        type: 'linear',
        min: startHour,
        max: startHour + 24,
        ticks: {
          stepSize: 2,
          callback: (val: unknown) => formatHour(val as number),
          color: '#55556a',
          font: { size: 10 },
        },
        title: { display: true, text: 'Clock Time', color: '#55556a' },
        grid: { color: 'rgba(42, 42, 64, 0.5)' },
      },
    };

    if (showSleep && hasSleep) {
      scales.ySleep = {
        position: 'left',
        min: 1,
        max: 4,
        ticks: {
          stepSize: 1,
          autoSkip: false,
          callback: (val: unknown) => STAGE_LABELS[val as number] ?? '',
          color: '#74b9ff',
          font: { size: 11, weight: 'bold' as const },
          padding: 6,
        },
        afterFit: (axis: { width: number }) => { axis.width = 65; },
        grid: { drawOnChartArea: !showHeart && !showActivity, color: 'rgba(42, 42, 64, 0.3)' },
      };
    }

    if (showHeart && hasHeart) {
      scales.yHeart = {
        position: showSleep && hasSleep ? 'right' : 'left',
        ticks: {
          color: '#ff6b6b',
          font: { size: 10 },
        },
        title: { display: true, text: 'BPM', color: '#ff6b6b', font: { size: 10 } },
        grid: { drawOnChartArea: !showSleep && !showActivity, color: 'rgba(42, 42, 64, 0.3)' },
      };
    }

    if (showActivity && hasActivity) {
      scales.yActivity = {
        position: 'right',
        ticks: {
          color: '#55efc4',
          font: { size: 10 },
        },
        title: { display: true, text: 'MET', color: '#55efc4', font: { size: 10 } },
        grid: { drawOnChartArea: !showSleep && !showHeart, color: 'rgba(42, 42, 64, 0.3)' },
      };
    }

    return {
      type: 'line',
      data: { datasets },
      options: {
        interaction: {
          mode: 'nearest',
          intersect: false,
        },
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
                const label = item.dataset.label || '';
                const y = item.parsed.y ?? 0;
                if (label === 'Sleep Stage') return STAGE_LABELS[y] || `Stage ${y}`;
                if (label === 'Heart Rate') return `${y} BPM`;
                if (label === 'Activity') return `${y.toFixed(1)} MET`;
                return `${y}`;
              },
            },
          },
        },
        scales,
      },
    };
  }, [day, showSleep, showHeart, showActivity, startHour, hasSleep, hasHeart, hasActivity]);

  const canvasRef = useChart(config);

  if (!day) {
    return (
      <div className="day-intraday">
        <div className="overlay-chart-card">
          <p className="overlay-fallback">Select a day to see intraday data</p>
        </div>
      </div>
    );
  }

  const hasAnyData = hasSleep || hasHeart || hasActivity;

  return (
    <div className="day-intraday">
      <div className="overlay-chart-card">
        <div className="intraday-header">
          <h3>24-Hour View</h3>
          <div className="intraday-toggles">
            <button
              className={`intraday-toggle ${showSleep ? 'active' : ''}`}
              style={{ '--toggle-color': '#74b9ff' } as React.CSSProperties}
              onClick={() => setShowSleep(v => !v)}
            >
              Sleep
            </button>
            <button
              className={`intraday-toggle ${showHeart ? 'active' : ''}`}
              style={{ '--toggle-color': '#ff6b6b' } as React.CSSProperties}
              onClick={() => setShowHeart(v => !v)}
            >
              Heart
            </button>
            <button
              className={`intraday-toggle ${showActivity ? 'active' : ''}`}
              style={{ '--toggle-color': '#55efc4' } as React.CSSProperties}
              onClick={() => setShowActivity(v => !v)}
            >
              Activity
            </button>
          </div>
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
        {hasAnyData && config ? (
          <canvas ref={canvasRef} />
        ) : (
          <p className="overlay-fallback">No intraday data for this day</p>
        )}
      </div>
    </div>
  );
}

/* ---- Stress Gauge (unused, retained) ---- */
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
