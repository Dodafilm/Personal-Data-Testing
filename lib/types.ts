import 'next-auth';
import 'next-auth/jwt';

export type UserRole = 'user' | 'artist' | 'admin';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}

export interface SleepData {
  duration_hours: number;
  efficiency: number;
  deep_min: number;
  rem_min: number;
  light_min: number;
  awake_min: number;
  readiness_score: number;
  phases_5min?: string;
  bedtime_start?: string;
  bedtime_end?: string;
}

export interface HeartData {
  resting_hr: number;
  hrv_avg: number;
  hr_min: number;
  hr_max: number;
  samples?: { ts: string; bpm: number }[];
}

export interface WorkoutData {
  activity_score: number;
  calories_active: number;
  steps: number;
  active_min: number;
  class_5min?: string;
  met_items?: number[];
  met_timestamp?: string;
}

export interface StressData {
  stress_high: number;      // minutes of high stress
  recovery_high: number;    // minutes of high recovery
  day_summary: string;      // "restored" | "normal" | "stressful"
}

export type EventCategory = 'activity' | 'sleep' | 'health-note' | 'custom' | 'experience';

export interface HealthEvent {
  id: string;
  time: string;             // "HH:MM" (24h format)
  title: string;
  category: EventCategory;
  description?: string;
  color?: string;           // hex override (default from category)
  isAuto?: boolean;         // true = auto-detected, not stored in DB
  endTime?: string;         // "HH:MM" (24h format)
  durationMin?: number;     // duration in minutes
  room?: string;            // room identifier for experience events
}

export interface DayRecord {
  date: string;
  source?: string;
  sleep?: SleepData;
  heart?: HeartData;
  workout?: WorkoutData;
  stress?: StressData;
  events?: HealthEvent[];
}

export interface HealthGoal {
  metric: string;           // e.g. 'sleep_hours', 'steps', 'hrv_avg'
  label: string;
  target: number;
  unit: string;
}

export interface Settings {
  bgEffect?: string;
  ouraClientId?: string;
  corsProxy?: string;
  ouraToken?: string;
  oauthState?: string;
  allowAdmin?: boolean;
  allowArtist?: boolean;
  goals?: HealthGoal[];
  [key: string]: unknown;
}
