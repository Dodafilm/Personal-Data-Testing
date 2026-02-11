'use client';

import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import { useChart, getDayLabels } from './useChart';
import StatsRow from '../StatsRow';
import type { DayRecord } from '@/lib/types';

interface SleepChartsProps {
  data: DayRecord[];
}

export default function SleepCharts({ data }: SleepChartsProps) {
  const stats = useMemo(() => {
    if (!data.length) return [];
    const vals = data.map(d => d.sleep).filter(Boolean);
    if (!vals.length) return [];
    const avgDuration = (vals.reduce((s, v) => s + (v!.duration_hours || 0), 0) / vals.length).toFixed(1);
    const avgEfficiency = Math.round(vals.reduce((s, v) => s + (v!.efficiency || 0), 0) / vals.length);
    const avgReadiness = Math.round(vals.reduce((s, v) => s + (v!.readiness_score || 0), 0) / vals.length);
    const avgDeep = Math.round(vals.reduce((s, v) => s + (v!.deep_min || 0), 0) / vals.length);
    return [
      { value: `${avgDuration}h`, label: 'Avg Duration' },
      { value: `${avgEfficiency}%`, label: 'Avg Efficiency' },
      { value: `${avgReadiness}`, label: 'Avg Readiness' },
      { value: `${avgDeep}m`, label: 'Avg Deep Sleep' },
    ];
  }, [data]);

  const stagesConfig = useMemo((): ChartConfiguration | null => {
    if (!data.length) return null;
    const labels = getDayLabels(data);
    return {
      type: 'bar' as const,
      data: {
        labels,
        datasets: [
          { label: 'Deep', data: data.map(d => d.sleep?.deep_min || 0), backgroundColor: '#0984e3', stack: 'stack' },
          { label: 'REM', data: data.map(d => d.sleep?.rem_min || 0), backgroundColor: '#6c5ce7', stack: 'stack' },
          { label: 'Light', data: data.map(d => d.sleep?.light_min || 0), backgroundColor: '#74b9ff', stack: 'stack' },
          { label: 'Awake', data: data.map(d => d.sleep?.awake_min || 0), backgroundColor: '#636e72', stack: 'stack' },
        ],
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, title: { display: true, text: 'Minutes', color: '#55556a' } },
        },
      },
    };
  }, [data]);

  const durationConfig = useMemo((): ChartConfiguration | null => {
    if (!data.length) return null;
    return {
      type: 'line',
      data: {
        labels: getDayLabels(data),
        datasets: [{
          label: 'Hours',
          data: data.map(d => d.sleep?.duration_hours || 0),
          borderColor: '#74b9ff',
          backgroundColor: 'rgba(116, 185, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#74b9ff',
        }],
      },
      options: {
        scales: { y: { min: 4, max: 10, title: { display: true, text: 'Hours', color: '#55556a' } } },
      },
    };
  }, [data]);

  const readinessConfig = useMemo((): ChartConfiguration | null => {
    if (!data.length) return null;
    return {
      type: 'line',
      data: {
        labels: getDayLabels(data),
        datasets: [{
          label: 'Readiness',
          data: data.map(d => d.sleep?.readiness_score || 0),
          borderColor: '#a29bfe',
          backgroundColor: 'rgba(162, 155, 254, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#a29bfe',
        }],
      },
      options: {
        scales: { y: { min: 0, max: 100, title: { display: true, text: 'Score', color: '#55556a' } } },
      },
    };
  }, [data]);

  const stagesRef = useChart(stagesConfig);
  const durationRef = useChart(durationConfig);
  const readinessRef = useChart(readinessConfig);

  return (
    <>
      <StatsRow stats={stats} colorClass="sleep" emptyMessage="No sleep data for this month" />
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Sleep Stages</h3>
          <canvas ref={stagesRef} />
        </div>
        <div className="chart-card">
          <h3>Duration Trend</h3>
          <canvas ref={durationRef} />
        </div>
        <div className="chart-card">
          <h3>Readiness Score</h3>
          <canvas ref={readinessRef} />
        </div>
      </div>
    </>
  );
}
