'use client';

import { useMemo, useCallback } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import { useChart, useChartWithClick, getDayLabels } from './useChart';
import StatsRow from '../StatsRow';
import type { DayRecord } from '@/lib/types';

interface HeartChartsProps {
  data: DayRecord[];
  onDayClick?: (date: string) => void;
}

export default function HeartCharts({ data, onDayClick }: HeartChartsProps) {
  const stats = useMemo(() => {
    if (!data.length) return [];
    const vals = data.map(d => d.heart).filter(Boolean);
    if (!vals.length) return [];
    const avgResting = Math.round(vals.reduce((s, v) => s + (v!.resting_hr || 0), 0) / vals.length);
    const avgHrv = Math.round(vals.reduce((s, v) => s + (v!.hrv_avg || 0), 0) / vals.length);
    const minHr = Math.min(...vals.map(v => v!.hr_min || 999).filter(v => v < 999));
    const maxHr = Math.max(...vals.map(v => v!.hr_max || 0));
    return [
      { value: `${avgResting}`, label: 'Avg Resting HR' },
      { value: `${avgHrv}ms`, label: 'Avg HRV' },
      { value: `${minHr}`, label: 'Lowest HR' },
      { value: `${maxHr}`, label: 'Highest HR' },
    ];
  }, [data]);

  const restingConfig = useMemo((): ChartConfiguration | null => {
    if (!data.length) return null;
    return {
      type: 'line',
      data: {
        labels: getDayLabels(data),
        datasets: [{
          label: 'Resting HR',
          data: data.map(d => d.heart?.resting_hr || 0),
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#ff6b6b',
        }],
      },
      options: {
        scales: { y: { title: { display: true, text: 'BPM', color: '#55556a' } } },
      },
    };
  }, [data]);

  const hrvConfig = useMemo((): ChartConfiguration | null => {
    if (!data.length) return null;
    return {
      type: 'line',
      data: {
        labels: getDayLabels(data),
        datasets: [{
          label: 'HRV',
          data: data.map(d => d.heart?.hrv_avg || 0),
          borderColor: '#fd79a8',
          backgroundColor: 'rgba(253, 121, 168, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#fd79a8',
        }],
      },
      options: {
        scales: { y: { title: { display: true, text: 'ms', color: '#55556a' } } },
      },
    };
  }, [data]);

  const rangeConfig = useMemo((): ChartConfiguration | null => {
    if (!data.length) return null;
    return {
      type: 'bar',
      data: {
        labels: getDayLabels(data),
        datasets: [
          {
            label: 'Min HR',
            data: data.map(d => d.heart?.hr_min || 0),
            backgroundColor: 'rgba(255, 107, 107, 0.4)',
            borderColor: '#ff6b6b',
            borderWidth: 1,
          },
          {
            label: 'Max HR',
            data: data.map(d => d.heart?.hr_max || 0),
            backgroundColor: 'rgba(253, 121, 168, 0.4)',
            borderColor: '#fd79a8',
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: { y: { title: { display: true, text: 'BPM', color: '#55556a' } } },
      },
    };
  }, [data]);

  const handleClickIndex = useCallback((index: number) => {
    if (onDayClick && data[index]) onDayClick(data[index].date);
  }, [onDayClick, data]);

  const restingRef = useChartWithClick(restingConfig, handleClickIndex);
  const hrvRef = useChart(hrvConfig);
  const rangeRef = useChart(rangeConfig);

  return (
    <>
      <StatsRow stats={stats} colorClass="heart" emptyMessage="No heart rate data for this month" />
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Resting Heart Rate</h3>
          <canvas ref={restingRef} />
        </div>
        <div className="chart-card">
          <h3>Heart Rate Variability</h3>
          <canvas ref={hrvRef} />
        </div>
        <div className="chart-card">
          <h3>HR Range</h3>
          <canvas ref={rangeRef} />
        </div>
      </div>
    </>
  );
}
