'use client';

import UserMenu from './UserMenu';

interface DashboardHeaderProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onSettingsToggle: () => void;
}

export default function DashboardHeader({ label, onPrev, onNext, onSettingsToggle }: DashboardHeaderProps) {
  return (
    <header className="dash-header">
      <h1 className="logo">Health Analytics</h1>
      <div className="month-nav">
        <button className="icon-btn" aria-label="Previous month" onClick={onPrev}>&larr;</button>
        <span className="month-label">{label}</span>
        <button className="icon-btn" aria-label="Next month" onClick={onNext}>&rarr;</button>
      </div>
      <div className="header-actions">
        <button className="icon-btn" aria-label="Settings" onClick={onSettingsToggle}>&#9881;</button>
        <UserMenu />
      </div>
    </header>
  );
}
