'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Settings } from '@/lib/types';
import { normalizeJson, normalizeCsv, parseCsvString } from '@/lib/data-adapter';
import { saveDays } from '@/lib/store';

function useOrigin() {
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  return origin;
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  bgEffect: string;
  onBgEffectChange: (effect: string) => void;
  onClearData: () => void;
  onDataImported: () => void;
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
  onDataImported,
  isOuraConnected,
  ouraStatus,
  onOuraConnect,
  onOuraDisconnect,
  onOuraFetch,
}: SettingsPanelProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [importStatus, setImportStatus] = useState<{ text: string; type: string }>({ text: '', type: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const origin = useOrigin();

  useEffect(() => {
    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setStartDate(formatDate(start));
      setEndDate(formatDate(end));
    }
  }, [startDate, endDate]);

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;

    let totalImported = 0;
    let errors = 0;

    for (const file of Array.from(fileList)) {
      try {
        const text = await readFile(file);
        const days = parseFileContent(file.name, text);
        saveDays(days);
        totalImported += days.length;
      } catch (err) {
        console.error(`Error importing ${file.name}:`, err);
        errors++;
      }
    }

    if (totalImported > 0) {
      setImportStatus({
        text: `Imported ${totalImported} days of data${errors > 0 ? ` (${errors} file(s) failed)` : ''}`,
        type: 'success',
      });
      onDataImported();
    } else {
      setImportStatus({
        text: errors > 0 ? 'Failed to import files. Check format.' : 'No data found in files.',
        type: 'error',
      });
    }
  }, [onDataImported]);

  return (
    <>
      <div className={`settings-overlay${open ? ' active' : ''}`} onClick={onClose} />
      <div className={`settings-panel${open ? ' open' : ''}`}>
        <div className="settings-header">
          <h2>Settings</h2>
          <span className="version-label">v0.2.3</span>
          <button className="icon-btn" aria-label="Close settings" onClick={onClose}>&times;</button>
        </div>
        <div className="settings-body">
          {/* Import Data */}
          <div className="setting-group">
            <h3>Import Data</h3>
            <div
              className="drop-zone"
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('drag-over'); }}
              onDrop={e => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <p>Drag &amp; drop JSON or CSV files</p>
              <span className="drop-zone-hint">or</span>
              <label className="btn btn-secondary file-label" onClick={e => e.stopPropagation()}>
                Browse Files
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  multiple
                  hidden
                  onChange={e => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {importStatus.text && (
              <div className={`status-msg ${importStatus.type}`}>{importStatus.text}</div>
            )}
          </div>

          {/* Oura Ring */}
          <div className="setting-group">
            <h3>Oura Ring</h3>
            <p className="setting-hint">
              Requires an{' '}
              <a href="https://cloud.ouraring.com/oauth/applications" target="_blank" rel="noopener noreferrer">
                Oura developer app
              </a>{' '}
              and active Oura Membership. Configure your app&apos;s redirect URL to{' '}
              <code>{origin ? `${origin}/api/oura/callback` : '/api/oura/callback'}</code>
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

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function parseFileContent(filename: string, text: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json') return normalizeJson(JSON.parse(text));
  if (ext === 'csv') return normalizeCsv(parseCsvString(text));
  throw new Error(`Unsupported file type: .${ext}`);
}
