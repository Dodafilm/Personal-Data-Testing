'use client';

import { useState, useRef, useCallback } from 'react';
import { normalizeJson, normalizeCsv, parseCsvString } from '@/lib/data-adapter';
import { saveDays } from '@/lib/store';

interface ImportSectionProps {
  onDataImported: () => void;
}

export default function ImportSection({ onDataImported }: ImportSectionProps) {
  const [status, setStatus] = useState<{ text: string; type: string }>({ text: '', type: '' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setStatus({
        text: `Imported ${totalImported} days of data${errors > 0 ? ` (${errors} file(s) failed)` : ''}`,
        type: 'success',
      });
      onDataImported();
    } else {
      setStatus({
        text: errors > 0 ? 'Failed to import files. Check format.' : 'No data found in files.',
        type: 'error',
      });
    }
  }, [onDataImported]);

  return (
    <section className="import-section">
      <div
        className={`drop-zone${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={e => {
          if ((e.target as HTMLElement).closest('.file-label')) return;
          fileInputRef.current?.click();
        }}
      >
        <p>Drag &amp; drop JSON or CSV files here</p>
        <span className="drop-zone-hint">or</span>
        <label className="btn btn-secondary file-label">
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
      {status.text && <div className={`status-msg ${status.type}`}>{status.text}</div>}
    </section>
  );
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
  if (ext === 'json') {
    return normalizeJson(JSON.parse(text));
  }
  if (ext === 'csv') {
    return normalizeCsv(parseCsvString(text));
  }
  throw new Error(`Unsupported file type: .${ext}`);
}
