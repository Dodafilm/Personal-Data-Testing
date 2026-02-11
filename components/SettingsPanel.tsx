'use client';

import { useState, useEffect } from 'react';
import type { Settings } from '@/lib/types';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  bgEffect: string;
  onBgEffectChange: (effect: string) => void;
  onClearData: () => void;
  isOuraConnected: boolean;
  ouraStatus: { text: string; type: string };
  onOuraConnect: () => void;
  onOuraDisconnect: () => void;
  onOuraFetch: (startDate: string, endDate: string) => void;
}

export default function SettingsPanel({
  open,
  onClose,
  bgEffect,
  onBgEffectChange,
  onClearData,
  isOuraConnected,
  ouraStatus,
  onOuraConnect,
  onOuraDisconnect,
  onOuraFetch,
}: SettingsPanelProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setStartDate(formatDate(start));
      setEndDate(formatDate(end));
    }
  }, [startDate, endDate]);

  return (
    <>
      <div className={`settings-overlay${open ? ' active' : ''}`} onClick={onClose} />
      <div className={`settings-panel${open ? ' open' : ''}`}>
        <div className="settings-header">
          <h2>Settings</h2>
          <span className="version-label">v0.2.0</span>
          <button className="icon-btn" aria-label="Close settings" onClick={onClose}>&times;</button>
        </div>
        <div className="settings-body">
          {/* Oura Ring */}
          <div className="setting-group">
            <h3>Oura Ring</h3>
            <p className="setting-hint">
              Requires an{' '}
              <a href="https://cloud.ouraring.com/oauth/applications" target="_blank" rel="noopener noreferrer">
                Oura developer app
              </a>{' '}
              and active Oura Membership. Configure your app&apos;s redirect URL to{' '}
              <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/oura/callback` : '/api/oura/callback'}</code>
            </p>

            {isOuraConnected ? (
              <>
                <div className="connected-badge">
                  <span className="connected-dot" />
                  <span>Connected to Oura</span>
                </div>
                <div className="setting-row">
                  <label>Date Range</label>
                  <div className="date-range">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <span>to</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => onOuraFetch(startDate, endDate)}>
                  Fetch Data
                </button>
                <button className="btn btn-danger" onClick={onOuraDisconnect}>
                  Disconnect
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={onOuraConnect}>
                Connect Oura Ring
              </button>
            )}

            {ouraStatus.text && (
              <div className={`status-msg ${ouraStatus.type}`}>{ouraStatus.text}</div>
            )}
          </div>

          {/* 3D Background */}
          <div className="setting-group">
            <h3>3D Background</h3>
            <label>Effect</label>
            <select value={bgEffect} onChange={e => onBgEffectChange(e.target.value)}>
              <option value="particles">Particle Field</option>
              <option value="waves">Wave Surface</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Clear Data */}
          <div className="setting-group">
            <button className="btn btn-danger" onClick={() => {
              if (confirm('Are you sure you want to clear all health data?')) {
                onClearData();
              }
            }}>
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
