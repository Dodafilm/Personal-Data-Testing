'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { saveDays, getMonthData, clearAllData } from '@/lib/store';
import { useMonthData } from '@/hooks/useMonthData';
import { useSettings } from '@/hooks/useSettings';
import { useOuraConnection } from '@/hooks/useOuraConnection';
import DashboardHeader from '@/components/DashboardHeader';
import SettingsPanel from '@/components/SettingsPanel';
import SleepCharts from '@/components/charts/SleepCharts';
import HeartCharts from '@/components/charts/HeartCharts';
import WorkoutCharts from '@/components/charts/WorkoutCharts';
import ComingSoon from '@/components/ComingSoon';
import dynamic from 'next/dynamic';
import type { DayRecord } from '@/lib/types';
import { SleepTerrain } from '@/components/three/data-viz/sleep-terrain';
import { MetricSpheres } from '@/components/three/data-viz/metric-spheres';

const ThreeBackground = dynamic(() => import('@/components/three/ThreeBackground'), { ssr: false });
const ThreeInline = dynamic(() => import('@/components/three/ThreeInline'), { ssr: false });

export default function DashboardPage() {
  const monthData = useMonthData(2026, 1);
  const { settings, updateSettings } = useSettings();
  const oura = useOuraConnection();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bgEffect, setBgEffect] = useState('particles');

  // Load sample data on first run, then refresh
  useEffect(() => {
    async function init() {
      const existing = getMonthData(2026, 1);
      if (existing.length === 0) {
        try {
          const res = await fetch('/data/sample-data.json');
          const sampleData: DayRecord[] = await res.json();
          saveDays(sampleData);
          monthData.setYear(2026);
          monthData.setMonth(1);
        } catch (err) {
          console.warn('Could not load sample data:', err);
        }
      }
      monthData.refresh();
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh data when month changes
  useEffect(() => {
    monthData.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthData.year, monthData.month]);

  // Load persisted bg effect
  useEffect(() => {
    if (settings.bgEffect) {
      setBgEffect(settings.bgEffect);
    }
  }, [settings.bgEffect]);

  // Check Oura connection on page load (check for callback params)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oura_connected') === 'true') {
      oura.setIsConnected(true);
      oura.setStatus({ text: 'Connected to Oura! Click "Fetch Data" to import.', type: 'success' });
      window.history.replaceState(null, '', window.location.pathname);
    } else if (params.get('oura_error')) {
      oura.setStatus({ text: `OAuth error: ${params.get('oura_error')}`, type: 'error' });
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      oura.checkConnection();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBgEffectChange = useCallback((effect: string) => {
    setBgEffect(effect);
    updateSettings({ bgEffect: effect });
  }, [updateSettings]);

  const handleClearData = useCallback(() => {
    clearAllData();
    monthData.refresh();
  }, [monthData]);

  const handleDataImported = useCallback(() => {
    monthData.refresh();
  }, [monthData]);

  const sleepTerrainFactory = useMemo(() => () => new SleepTerrain(), []);
  const metricSpheresFactory = useMemo(() => () => new MetricSpheres(), []);

  return (
    <>
      <ThreeBackground effect={bgEffect} data={monthData.data} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        bgEffect={bgEffect}
        onBgEffectChange={handleBgEffectChange}
        onClearData={handleClearData}
        isOuraConnected={oura.isConnected}
        ouraStatus={oura.status}
        onOuraConnect={oura.startOAuth}
        onOuraDisconnect={oura.disconnect}
        onOuraFetch={(start, end) => oura.fetchData(start, end, handleDataImported)}
        onDataImported={handleDataImported}
      />

      <div className="dashboard">
        <DashboardHeader
          label={monthData.label}
          onPrev={monthData.prevMonth}
          onNext={monthData.nextMonth}
          onSettingsToggle={() => setSettingsOpen(o => !o)}
        />

        {/* Sleep Section */}
        <section className="metric-section">
          <h2 className="section-title sleep">Sleep</h2>
          <SleepCharts data={monthData.data} />
          <div className="viz-3d-container">
            <h3>Sleep Terrain</h3>
            <ThreeInline data={monthData.data} effectFactory={sleepTerrainFactory} />
          </div>
        </section>

        {/* Heart Rate Section */}
        <section className="metric-section">
          <h2 className="section-title heart">Heart Rate</h2>
          <HeartCharts data={monthData.data} />
        </section>

        {/* Workout Section */}
        <section className="metric-section">
          <h2 className="section-title workout">Workouts &amp; Activity</h2>
          <WorkoutCharts data={monthData.data} />
          <div className="viz-3d-container">
            <h3>Metric Spheres</h3>
            <ThreeInline data={monthData.data} effectFactory={metricSpheresFactory} />
          </div>
        </section>

        <ComingSoon />
      </div>
    </>
  );
}
