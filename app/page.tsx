'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useStore } from '@/lib/store-provider';
import { useMonthData } from '@/hooks/useMonthData';
import { useSettings } from '@/hooks/useSettings';
import { useOuraConnection } from '@/hooks/useOuraConnection';
import DashboardHeader from '@/components/DashboardHeader';
import SettingsPanel from '@/components/SettingsPanel';
import DayDetail from '@/components/DayDetail';
import SleepCharts from '@/components/charts/SleepCharts';
import HeartCharts from '@/components/charts/HeartCharts';
import WorkoutCharts from '@/components/charts/WorkoutCharts';
import StressCharts from '@/components/charts/StressCharts';
import SleepHeatmap from '@/components/charts/SleepHeatmap';
import MetricHeatmap from '@/components/charts/MetricHeatmap';
import CalendarDayPicker from '@/components/CalendarDayPicker';
import HeartRateOverlay from '@/components/charts/HeartRateOverlay';
import ActivityOverlay from '@/components/charts/ActivityOverlay';
import SyncPrompt from '@/components/SyncPrompt';
import dynamic from 'next/dynamic';
import type { DayRecord } from '@/lib/types';

const ThreeBackground = dynamic(() => import('@/components/three/ThreeBackground'), { ssr: false });

export default function DashboardPage() {
  const { data: session } = useSession();
  const store = useStore();
  const monthData = useMonthData(2026, 1);
  const { settings, updateSettings } = useSettings();
  const oura = useOuraConnection();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bgEffect, setBgEffect] = useState('particles');

  // Calendar day picker state — defaults to all days in month
  const daysInMonth = new Date(monthData.year, monthData.month, 0).getDate();
  const [selectedDays, setSelectedDays] = useState<Set<number>>(() =>
    new Set(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  );

  // Reset selectedDays when month changes
  useEffect(() => {
    const days = new Date(monthData.year, monthData.month, 0).getDate();
    setSelectedDays(new Set(Array.from({ length: days }, (_, i) => i + 1)));
  }, [monthData.year, monthData.month]);

  // Filtered data for heatmaps (only selected days)
  const filteredData = useMemo(() => {
    return monthData.data.filter(d => {
      const day = parseInt(d.date.slice(8), 10);
      return selectedDays.has(day);
    });
  }, [monthData.data, selectedDays]);

  // Load sample data on first run (local mode only), then refresh
  useEffect(() => {
    async function init() {
      const result = store.getMonthData(2026, 1);
      const existing = result instanceof Promise ? await result : result;

      // Only load sample data for anonymous users with no data
      if (existing.length === 0 && !session?.user) {
        try {
          const res = await fetch('/data/sample-data.json');
          const sampleData: DayRecord[] = await res.json();
          const saveResult = store.saveDays(sampleData);
          if (saveResult instanceof Promise) await saveResult;
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
  }, [session?.user, store]);

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

  const handleClearData = useCallback(async () => {
    const result = store.clearAllData();
    if (result instanceof Promise) await result;
    monthData.refresh();
  }, [store, monthData]);

  const handleDataImported = useCallback(() => {
    monthData.refresh();
  }, [monthData]);

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

        <SyncPrompt />

        <CalendarDayPicker
          year={monthData.year}
          month={monthData.month}
          selectedDays={selectedDays}
          onChange={setSelectedDays}
        />

        {/* Sleep Section */}
        <section className="metric-section">
          <h2 className="section-title sleep">Sleep</h2>
          <SleepCharts data={monthData.data} onDayClick={setSelectedDay} />
          <SleepHeatmap data={filteredData} />
        </section>

        {/* Heart Rate Section */}
        <section className="metric-section">
          <h2 className="section-title heart">Heart Rate</h2>
          <HeartCharts data={monthData.data} onDayClick={setSelectedDay} />
          <HeartRateOverlay data={monthData.data} />
        </section>

        {/* Workout Section */}
        <section className="metric-section">
          <h2 className="section-title workout">Workouts &amp; Activity</h2>
          <WorkoutCharts data={monthData.data} onDayClick={setSelectedDay} />
          <MetricHeatmap data={filteredData} />
          <ActivityOverlay data={monthData.data} />
        </section>

        {/* Stress Section */}
        <section className="metric-section">
          <h2 className="section-title stress">Stress</h2>
          <StressCharts data={monthData.data} onDayClick={setSelectedDay} />
        </section>
      </div>

      <DayDetail
        open={!!selectedDay}
        day={monthData.data.find(d => d.date === selectedDay) ?? null}
        monthData={monthData.data}
        onClose={() => setSelectedDay(null)}
        onNavigate={setSelectedDay}
      />
    </>
  );
}
