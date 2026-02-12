'use client';

import type { HealthEvent } from '@/lib/types';
import { CATEGORY_COLORS } from './eventMarkerPlugin';

interface EventPopupProps {
  event: HealthEvent;
  x: number;
  y: number;
  containerRect: DOMRect;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function EventPopup({ event, x, y, containerRect, onEdit, onDelete, onClose }: EventPopupProps) {
  const color = event.color || CATEGORY_COLORS[event.category] || '#dfe6e9';

  // Position relative to the container, clamped to bounds
  const popupWidth = 240;
  const popupHeight = 160;
  let left = x - containerRect.left - popupWidth / 2;
  let top = y - containerRect.top + 12;

  // Clamp horizontally
  if (left < 4) left = 4;
  if (left + popupWidth > containerRect.width - 4) left = containerRect.width - popupWidth - 4;
  // If too close to bottom, show above
  if (top + popupHeight > containerRect.height - 4) {
    top = y - containerRect.top - popupHeight - 12;
  }

  return (
    <>
      <div className="event-popup-overlay" onClick={onClose} />
      <div className="event-popup" style={{ left, top }}>
        <div className="event-popup-header">
          <span className="event-category-badge" style={{ background: color }}>{event.category}</span>
          <span className="event-popup-time">{event.time}</span>
          <button className="event-popup-close" onClick={onClose}>&times;</button>
        </div>
        <div className="event-popup-title">{event.title}</div>
        {event.description && <div className="event-popup-desc">{event.description}</div>}
        {event.isAuto && <span className="event-auto-badge">Auto-detected</span>}
        {!event.isAuto && (
          <div className="event-popup-actions">
            <button onClick={onEdit}>Edit</button>
            <button onClick={onDelete} className="event-popup-delete">Delete</button>
          </div>
        )}
      </div>
    </>
  );
}
