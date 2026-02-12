'use client';

import { useState, useEffect } from 'react';
import type { HealthEvent, EventCategory } from '@/lib/types';

const CATEGORIES: EventCategory[] = ['exercise', 'meal', 'medical', 'sleep-aid', 'note', 'custom'];

interface EventFormProps {
  initial?: HealthEvent | null;
  onSave: (event: HealthEvent) => void;
  onCancel: () => void;
}

export default function EventForm({ initial, onSave, onCancel }: EventFormProps) {
  const [time, setTime] = useState(initial?.time || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState<EventCategory>(initial?.category || 'note');
  const [description, setDescription] = useState(initial?.description || '');

  useEffect(() => {
    setTime(initial?.time || '');
    setTitle(initial?.title || '');
    setCategory(initial?.category || 'note');
    setDescription(initial?.description || '');
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time || !title) return;
    onSave({
      id: initial?.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time,
      title,
      category,
      description: description || undefined,
    });
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <div className="event-form-row">
        <label>
          Time
          <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
        </label>
        <label>
          Category
          <select value={category} onChange={e => setCategory(e.target.value as EventCategory)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
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
