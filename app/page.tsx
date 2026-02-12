'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useStore } from '@/lib/store-provider';
import { useMonthData } from '@/hooks/useMonthData';
import { useSettings } from '@/hooks/useSettings';
import { useOuraConnection } from '@/hooks/useOuraConnection';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import DashboardHeader from '@/components/DashboardHeader';
import SettingsPanel from '@/components/SettingsPanel';
import DayDetail from '@/components/DayDetail';
import SleepCharts from '@/components/charts/SleepCharts';
import HeartCharts from '@/components/charts/HeartCharts';
import StressCharts from '@/components/charts/StressCharts';
import DayIntraday from '@/components/charts/DayIntraday';
import HeartRateOverlay from '@/components/charts/HeartRateOverlay';
import ActivityOverlay from '@/components/charts/ActivityOverlay';
import SleepOverlay from '@/components/charts/SleepOverlay';
import ActivityCharts from '@/components/charts/ActivityCharts';
import SyncPrompt from '@/components/SyncPrompt';
import dynamic from 'next/dynamic';
import type { DayRecord, HealthEvent } from '@/lib/types';

const ThreeBackground = dynamic(() => import('@/components/three/ThreeBackground'), { ssr: false });

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const store = useStore();
  const monthData = useMonthData();
  const { settings, updateSettings } = useSettings();
  const oura = useOuraConnection();
  const gcal = useGoogleCalendar();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gcalEvents, setGcalEvents] = useState<HealthEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bgEffect, setBgEffect] = useState('particles');

  // Handle date picker changing to a different date
  const handleDateChange = useCallback((y: number, m: number, d: number) => {
    monthData.setFullDate(y, m, d);
  }, [monthData]);

  // Derive the focused day record from the selected focus date
  const focusDayRecord = useMemo(() => {
    const dayStr = String(monthData.day).padStart(2, '0');
    const monthStr = String(monthData.month).padStart(2, '0');
    const target = `${monthData.year}-${monthStr}-${dayStr}`;
    return monthData.data.find(d => d.date === target) ?? null;
  }, [monthData.year, monthData.month, monthData.day, monthData.data]);

  // Derive previous day record (for Sleep Effector view)
  const prevDayRecord = useMemo(() => {
    const focus = new Date(monthData.year, monthData.month - 1, monthData.day);
    focus.setDate(focus.getDate() - 1);
    const y = focus.getFullYear();
    const m = String(focus.getMonth() + 1).padStart(2, '0');
    const d = String(focus.getDate()).padStart(2, '0');
    return monthData.data.find(r => r.date === `${y}-${m}-${d}`) ?? null;
  }, [monthData.year, monthData.month, monthData.day, monthData.data]);

  // Focus date as YYYY-MM-DD string for gcal event fetching
  const focusDateStr = useMemo(() => {
    const dayStr = String(monthData.day).padStart(2, '0');
    const monthStr = String(monthData.month).padStart(2, '0');
    return `${monthData.year}-${monthStr}-${dayStr}`;
  }, [monthData.year, monthData.month, monthData.day]);

  // Fetch Google Calendar events when focus date changes
  useEffect(() => {
    if (!gcal.isConnected) {
      setGcalEvents([]);
      return;
    }
    gcal.fetchEvents(focusDateStr).then(setGcalEvents);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDateStr, gcal.isConnected]);

  // Load sample data on first run (local mode only), then refresh
  useEffect(() => {
    if (sessionStatus === 'loading') return;

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
        } catch (err) {
          console.warn('Could not load sample data:', err);
        }
      }
      monthData.refresh();
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, store]);

  // Refresh data when focus date changes (range shifts)
  useEffect(() => {
    monthData.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthData.startStr, monthData.endStr]);

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

  // Check Google Calendar connection on page load
  useEffect(() => {
    if (!session?.user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal_connected') === 'true') {
      gcal.setIsConnected(true);
      gcal.setStatus({ text: 'Connected to Google Calendar!', type: 'success' });
      gcal.loadCalendars();
      window.history.replaceState(null, '', window.location.pathname);
    } else if (params.get('gcal_error')) {
      gcal.setStatus({ text: `Google Calendar error: ${params.get('gcal_error')}`, type: 'error' });
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      gcal.checkConnection();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

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
        isGcalConnected={gcal.isConnected}
        gcalStatus={gcal.status}
        gcalCalendars={gcal.calendars}
        gcalSelectedIds={gcal.selectedIds}
        onGcalConnect={gcal.startOAuth}
        onGcalDisconnect={gcal.disconnect}
        onGcalSaveSelection={gcal.saveSelection}
        onGcalSelectedIdsChange={gcal.setSelectedIds}
      />

      <div className="dashboard">
        <DashboardHeader
          label={monthData.label}
          onPrev={monthData.prevMonth}
          onNext={monthData.nextMonth}
          onSettingsToggle={() => setSettingsOpen(o => !o)}
          year={monthData.year}
          month={monthData.month}
          selectedDay={monthData.day}
          onDateChange={handleDateChange}
        />

        <SyncPrompt />

        {/* Intraday 24h Section */}
        <section className="metric-section">
          <h2 className="section-title">24-Hour View</h2>
          <DayIntraday day={focusDayRecord} prevDay={prevDayRecord} onDayUpdated={monthData.refresh} gcalEvents={gcalEvents} />
        </section>

        {/* Sleep Section */}
        <section className="metric-section">
          <h2 className="section-title sleep">Sleep</h2>
          <SleepCharts data={monthData.data} onDayClick={setSelectedDay} />
          <SleepOverlay data={monthData.data} />
        </section>

        {/* Heart Rate Section */}
        <section className="metric-section">
          <h2 className="section-title heart">Heart Rate</h2>
          <HeartCharts data={monthData.data} onDayClick={setSelectedDay} />
          <HeartRateOverlay data={monthData.data} />
        </section>

        {/* Activity Section */}
        <section className="metric-section">
          <h2 className="section-title workout">Activity</h2>
          <ActivityCharts data={monthData.data} onDayClick={setSelectedDay} />
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
