'use client';

import { useRef, useEffect } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600 },
  plugins: {
    legend: {
      labels: { color: '#8888a0', font: { size: 11 } },
    },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#e8e8f0',
      bodyColor: '#e8e8f0',
      borderColor: '#2a2a40',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      ticks: { color: '#55556a', font: { size: 10 } },
      grid: { color: 'rgba(42, 42, 64, 0.5)' },
    },
    y: {
      ticks: { color: '#55556a', font: { size: 10 } },
      grid: { color: 'rgba(42, 42, 64, 0.5)' },
    },
  },
};

function mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export function useChart(config: ChartConfiguration | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !config) return;

    // Destroy previous instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const mergedConfig = {
      ...config,
      options: mergeDeep(
        structuredClone(CHART_DEFAULTS) as Record<string, unknown>,
        (config.options || {}) as Record<string, unknown>,
      ),
    };

    chartRef.current = new Chart(canvasRef.current, mergedConfig as ChartConfiguration);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config]);

  return canvasRef;
}

export function getDayLabels(data: { date: string }[]): string[] {
  return data.map(d => {
    const day = parseInt(d.date.slice(8), 10);
    return day.toString();
  });
}
