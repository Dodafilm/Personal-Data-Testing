'use client';

import { useState, useMemo } from 'react';
import type { DayRecord, HealthGoal, Settings } from '@/lib/types';

const DEFAULT_GOALS: HealthGoal[] = [
  { metric: 'sleep_hours', label: 'Sleep', target: 8, unit: 'hrs' },
  { metric: 'steps', label: 'Steps', target: 10000, unit: '' },
  { metric: 'hrv_avg', label: 'HRV', target: 50, unit: 'ms' },
  { metric: 'active_min', label: 'Active Minutes', target: 30, unit: 'min' },
  { metric: 'readiness_score', label: 'Readiness', target: 80, unit: '' },
];

const AVAILABLE_METRICS: { value: string; label: string; unit: string; defaultTarget: number }[] = [
  { value: 'sleep_hours', label: 'Sleep Duration', unit: 'hrs', defaultTarget: 8 },
  { value: 'steps', label: 'Steps', unit: '', defaultTarget: 10000 },
  { value: 'hrv_avg', label: 'HRV Average', unit: 'ms', defaultTarget: 50 },
  { value: 'active_min', label: 'Active Minutes', unit: 'min', defaultTarget: 30 },
  { value: 'readiness_score', label: 'Readiness Score', unit: '', defaultTarget: 80 },
  { value: 'resting_hr', label: 'Resting Heart Rate', unit: 'bpm', defaultTarget: 60 },
  { value: 'calories_active', label: 'Active Calories', unit: 'kcal', defaultTarget: 500 },
  { value: 'deep_min', label: 'Deep Sleep', unit: 'min', defaultTarget: 60 },
  { value: 'rem_min', label: 'REM Sleep', unit: 'min', defaultTarget: 90 },
  { value: 'sleep_efficiency', label: 'Sleep Efficiency', unit: '%', defaultTarget: 85 },
];

function extractMetric(day: DayRecord, metric: string): number | null {
  switch (metric) {
    case 'sleep_hours': return day.sleep?.duration_hours ?? null;
    case 'steps': return day.workout?.steps ?? null;
    case 'hrv_avg': return day.heart?.hrv_avg ?? null;
    case 'active_min': return day.workout?.active_min ?? null;
    case 'readiness_score': return day.sleep?.readiness_score ?? null;
    case 'resting_hr': return day.heart?.resting_hr ?? null;
    case 'calories_active': return day.workout?.calories_active ?? null;
    case 'deep_min': return day.sleep?.deep_min ?? null;
    case 'rem_min': return day.sleep?.rem_min ?? null;
    case 'sleep_efficiency': return day.sleep?.efficiency ?? null;
    default: return null;
  }
}

// For resting HR, lower is better
const LOWER_IS_BETTER = new Set(['resting_hr']);

interface GoalsPanelProps {
  data: DayRecord[];
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
}

export default function GoalsPanel({ data, settings, onUpdateSettings }: GoalsPanelProps) {
  const goals = settings.goals ?? DEFAULT_GOALS;
  const [editing, setEditing] = useState(false);
  const [editGoals, setEditGoals] = useState<HealthGoal[]>(goals);
  const [addMetric, setAddMetric] = useState('');

  // Today's record
  const today = useMemo(() => {
    const d = new Date();
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return data.find(r => r.date === str) ?? null;
  }, [data]);

  // Compute streaks for each goal
  const goalResults = useMemo(() => {
    // Sort data by date descending for streak calculation
    const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));

    return goals.map(goal => {
      const lowerBetter = LOWER_IS_BETTER.has(goal.metric);
      const todayVal = today ? extractMetric(today, goal.metric) : null;
      const pct = todayVal !== null
        ? lowerBetter
          ? Math.min(100, Math.round((goal.target / todayVal) * 100))
          : Math.min(100, Math.round((todayVal / goal.target) * 100))
        : 0;
      const hit = todayVal !== null && (lowerBetter ? todayVal <= goal.target : todayVal >= goal.target);

      // Calculate current streak
      let streak = 0;
      for (const day of sorted) {
        const val = extractMetric(day, goal.metric);
        if (val === null) break;
        const met = lowerBetter ? val <= goal.target : val >= goal.target;
        if (met) streak++;
        else break;
      }

      // Best streak (scan all data)
      let bestStreak = 0;
      let currentRun = 0;
      const chronological = [...data].sort((a, b) => a.date.localeCompare(b.date));
      for (const day of chronological) {
        const val = extractMetric(day, goal.metric);
        if (val === null) { currentRun = 0; continue; }
        const met = lowerBetter ? val <= goal.target : val >= goal.target;
        if (met) { currentRun++; bestStreak = Math.max(bestStreak, currentRun); }
        else { currentRun = 0; }
      }

      // Days hit in current data window
      const daysHit = data.filter(day => {
        const val = extractMetric(day, goal.metric);
        if (val === null) return false;
        return lowerBetter ? val <= goal.target : val >= goal.target;
      }).length;

      return {
        ...goal,
        todayVal,
        pct,
        hit,
        streak,
        bestStreak,
        daysHit,
        totalDays: data.length,
      };
    });
  }, [goals, data, today]);

  const handleSaveGoals = () => {
    onUpdateSettings({ goals: editGoals });
    setEditing(false);
  };

  const handleAddGoal = () => {
    if (!addMetric) return;
    const meta = AVAILABLE_METRICS.find(m => m.value === addMetric);
    if (!meta) return;
    if (editGoals.some(g => g.metric === addMetric)) return;
    setEditGoals([...editGoals, { metric: meta.value, label: meta.label, target: meta.defaultTarget, unit: meta.unit }]);
    setAddMetric('');
  };

  const handleRemoveGoal = (metric: string) => {
    setEditGoals(editGoals.filter(g => g.metric !== metric));
  };

  const handleTargetChange = (metric: string, target: number) => {
    setEditGoals(editGoals.map(g => g.metric === metric ? { ...g, target } : g));
  };

  return (
    <div className="goals-panel">
      <div className="goals-header">
        <h2 className="goals-title">Goals</h2>
        <button
          className="btn btn-secondary goals-edit-btn"
          onClick={() => {
            if (editing) {
              handleSaveGoals();
            } else {
              setEditGoals(goals);
              setEditing(true);
            }
          }}
        >
          {editing ? 'Save' : 'Edit Goals'}
        </button>
        {editing && (
          <button className="btn btn-secondary goals-edit-btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>

      {editing ? (
        <div className="goals-editor">
          {editGoals.map(goal => (
            <div key={goal.metric} className="goal-edit-row">
              <span className="goal-edit-label">{goal.label}</span>
              <input
                type="number"
                className="goal-edit-input"
                value={goal.target}
                onChange={e => handleTargetChange(goal.metric, Number(e.target.value))}
              />
              <span className="goal-edit-unit">{goal.unit}</span>
              <button className="goal-remove-btn" onClick={() => handleRemoveGoal(goal.metric)}>
                &times;
              </button>
            </div>
          ))}
          <div className="goal-add-row">
            <select value={addMetric} onChange={e => setAddMetric(e.target.value)}>
              <option value="">Add metric...</option>
              {AVAILABLE_METRICS
                .filter(m => !editGoals.some(g => g.metric === m.value))
                .map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
            </select>
            <button className="btn btn-primary goal-add-btn" onClick={handleAddGoal} disabled={!addMetric}>
              Add
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Today's Progress */}
          <div className="goals-section">
            <h3 className="goals-section-title">Today&apos;s Progress</h3>
            <div className="goals-grid">
              {goalResults.map(g => (
                <div key={g.metric} className={`goal-card ${g.hit ? 'goal-hit' : ''}`}>
                  <div className="goal-card-header">
                    <span className="goal-card-label">{g.label}</span>
                    {g.hit && <span className="goal-check">&#10003;</span>}
                  </div>
                  <div className="goal-progress-bar">
                    <div
                      className="goal-progress-fill"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                  <div className="goal-card-values">
                    <span className="goal-current">
                      {g.todayVal !== null ? formatValue(g.todayVal, g.unit) : '--'}
                    </span>
                    <span className="goal-target">/ {formatValue(g.target, g.unit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Streaks */}
          <div className="goals-section">
            <h3 className="goals-section-title">Streaks</h3>
            <div className="streaks-grid">
              {goalResults.map(g => (
                <div key={g.metric} className="streak-card">
                  <span className="streak-label">{g.label}</span>
                  <div className="streak-values">
                    <div className="streak-stat">
                      <span className={`streak-number ${g.streak > 0 ? 'active' : ''}`}>{g.streak}</span>
                      <span className="streak-caption">Current</span>
                    </div>
                    <div className="streak-stat">
                      <span className="streak-number best">{g.bestStreak}</span>
                      <span className="streak-caption">Best</span>
                    </div>
                    <div className="streak-stat">
                      <span className="streak-number">{g.daysHit}/{g.totalDays}</span>
                      <span className="streak-caption">Hit Rate</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatValue(val: number, unit: string): string {
  if (unit === 'hrs') return `${val.toFixed(1)}${unit}`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return `${Math.round(val)}${unit ? ` ${unit}` : ''}`;
}
