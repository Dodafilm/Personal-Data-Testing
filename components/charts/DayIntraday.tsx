'use client';

import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import { useChart } from './useChart';
import { parsePipeString, mapToClockHours, formatHour } from '@/lib/intraday-utils';
import type { DayRecord } from '@/lib/types';

const STAGE_LABELS: Record<number, string> = { 1: 'Deep', 2: 'Light', 3: 'REM', 4: 'Awake' };

type ViewMode = 'full' | 'sleep-effector';

interface DayIntradayProps {
  day: DayRecord | null;
  prevDay?: DayRecord | null;
}

export default function DayIntraday({ day, prevDay }: DayIntradayProps) {
  const [showSleep, setShowSleep] = useState(true);
  const [showHeart, setShowHeart] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [startHour, setStartHour] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('full');

  const effectiveStart = viewMode === 'sleep-effector' ? 8 : startHour;

  // Check data availability depending on mode
  const hasSleep = !!(day?.sleep?.phases_5min && day?.sleep?.bedtime_start);
  const hasHeart = viewMode === 'sleep-effector'
    ? !!(day?.heart?.samples?.length || prevDay?.heart?.samples?.length)
    : !!(day?.heart?.samples?.length);
  const hasActivity = viewMode === 'sleep-effector'
    ? !!(
        (day?.workout?.met_items?.length && day?.workout?.met_timestamp) ||
        day?.workout?.class_5min ||
        (prevDay?.workout?.met_items?.length && prevDay?.workout?.met_timestamp) ||
        prevDay?.workout?.class_5min
      )
    : !!(day?.workout && (
        (day.workout.met_items?.length && day.workout.met_timestamp) ||
        day.workout.class_5min
      ));

  const config = useMemo((): ChartConfiguration | null => {
    if (!day) return null;
    if (!showSleep && !showHeart && !showActivity) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datasets: any[] = [];

    // --- Sleep hypnogram dataset ---
    if (showSleep && hasSleep) {
      const phases = parsePipeString(day.sleep!.phases_5min!);
      const points = mapToClockHours(phases, day.sleep!.bedtime_start!, 5);

      const shifted = points.map(p => {
        let x = p.hour;
        if (viewMode === 'sleep-effector') {
          // Evening hours (>=12) stay as-is, morning hours (<12) shift +24
          if (x < 12) x += 24;
        } else {
          while (x < effectiveStart) x += 24;
          while (x >= effectiveStart + 24) x -= 24;
        }
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

    // --- Heart rate dataset ---
    if (showHeart && hasHeart) {
      let points: { x: number; y: number }[];

      if (viewMode === 'sleep-effector') {
        // Previous day samples: hours stay as-is (8-24 range)
        const prev = (prevDay?.heart?.samples || []).map(s => {
          const dt = new Date(s.ts);
          return { x: dt.getHours() + dt.getMinutes() / 60, y: s.bpm };
        });
        // Current day samples: hours + 24 (0-8 → 24-32)
        const curr = (day?.heart?.samples || []).map(s => {
          const dt = new Date(s.ts);
          return { x: dt.getHours() + dt.getMinutes() / 60 + 24, y: s.bpm };
        });
        points = [...prev, ...curr]
          .filter(p => p.x >= 8 && p.x < 32)
          .sort((a, b) => a.x - b.x);
      } else {
        points = (day?.heart?.samples || []).map(s => {
          const dt = new Date(s.ts);
          let hour = dt.getHours() + dt.getMinutes() / 60;
          while (hour < effectiveStart) hour += 24;
          while (hour >= effectiveStart + 24) hour -= 24;
          return { x: hour, y: s.bpm };
        }).sort((a, b) => a.x - b.x);
      }

      if (points.length > 0) {
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
    }

    // --- Activity dataset ---
    if (showActivity && hasActivity) {
      let points: { x: number; y: number }[] = [];

      if (viewMode === 'sleep-effector') {
        // Previous day activity: hours as-is
        const prevPts = getActivityPoints(prevDay, 0);
        // Current day activity: hours + 24
        const currPts = getActivityPoints(day, 24);
        points = [...prevPts, ...currPts]
          .filter(p => p.x >= 8 && p.x < 32)
          .sort((a, b) => a.x - b.x);
      } else {
        const w = day?.workout;
        if (w) {
          if (w.met_items && w.met_items.length > 0 && w.met_timestamp) {
            const mapped = mapToClockHours(w.met_items, w.met_timestamp, 5);
            points = mapped.map(p => {
              let x = p.hour;
              while (x < effectiveStart) x += 24;
              while (x >= effectiveStart + 24) x -= 24;
              return { x, y: p.value };
            });
          } else if (w.class_5min) {
            const phases = parsePipeString(w.class_5min);
            const startOfDay = day!.date + 'T00:00:00';
            const mapped = mapToClockHours(phases, startOfDay, 5);
            points = mapped.map(p => {
              let x = p.hour;
              while (x < effectiveStart) x += 24;
              while (x >= effectiveStart + 24) x -= 24;
              return { x, y: p.value };
            });
          }
          points.sort((a, b) => a.x - b.x);
        }
      }

      if (points.length > 0) {
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
    }

    if (datasets.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scales: any = {
      x: {
        type: 'linear',
        min: effectiveStart,
        max: effectiveStart + 24,
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
  }, [day, prevDay, showSleep, showHeart, showActivity, effectiveStart, startHour, viewMode, hasSleep, hasHeart, hasActivity]);

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
          <select
            className="intraday-view-select"
            value={viewMode}
            onChange={e => setViewMode(e.target.value as ViewMode)}
          >
            <option value="full">Full Day</option>
            <option value="sleep-effector">Sleep Effector</option>
          </select>
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
          {viewMode === 'full' && (
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
          )}
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

/** Extract activity points from a day record, adding hourOffset to each hour value. */
function getActivityPoints(d: DayRecord | null | undefined, hourOffset: number): { x: number; y: number }[] {
  if (!d?.workout) return [];
  const w = d.workout;
  if (w.met_items && w.met_items.length > 0 && w.met_timestamp) {
    const mapped = mapToClockHours(w.met_items, w.met_timestamp, 5);
    return mapped.map(p => ({ x: p.hour + hourOffset, y: p.value }));
  }
  if (w.class_5min) {
    const phases = parsePipeString(w.class_5min);
    const startOfDay = d.date + 'T00:00:00';
    const mapped = mapToClockHours(phases, startOfDay, 5);
    return mapped.map(p => ({ x: p.hour + hourOffset, y: p.value }));
  }
  return [];
}
