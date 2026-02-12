'use client';

import { useState, useEffect } from 'react';
import type { HealthEvent, EventCategory } from '@/lib/types';

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'activity', label: 'Activity' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'health-note', label: 'Health Note' },
];

interface EventFormProps {
  initial?: HealthEvent | null;
  onSave: (event: HealthEvent) => void;
  onCancel: () => void;
}

export default function EventForm({ initial, onSave, onCancel }: EventFormProps) {
  const [time, setTime] = useState(initial?.time || '');
  const [endTime, setEndTime] = useState(initial?.endTime || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState<EventCategory>(initial?.category || 'activity');
  const [description, setDescription] = useState(initial?.description || '');

  useEffect(() => {
    setTime(initial?.time || '');
    setEndTime(initial?.endTime || '');
    setTitle(initial?.title || '');
    setCategory(initial?.category || 'activity');
    setDescription(initial?.description || '');
  }, [initial]);

  // Compute duration in minutes from start/end times
  function computeDuration(start: string, end: string): number | undefined {
    if (!start || !end) return undefined;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60; // crosses midnight
    return diff;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time || !title) return;
    onSave({
      id: initial?.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time,
      title,
      category,
      description: description || undefined,
      endTime: endTime || undefined,
      durationMin: computeDuration(time, endTime),
    });
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <div className="event-form-row">
        <label>
          Start
          <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
        </label>
        <label>
          End
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </label>
        <label>
          Category
          <select value={category} onChange={e => setCategory(e.target.value as EventCategory)}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Title
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Morning run" />
      </label>
      <label>
        Description <span className="event-form-optional">(optional)</span>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." />
      </label>
      <div className="event-form-actions">
        <button type="submit" className="event-form-save">Save</button>
        <button type="button" className="event-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
