import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
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

export interface DayRecord {
  date: string;
  source?: string;
  sleep?: SleepData;
  heart?: HeartData;
  workout?: WorkoutData;
  stress?: StressData;
}

export interface Settings {
  bgEffect?: string;
  ouraClientId?: string;
  corsProxy?: string;
  ouraToken?: string;
  oauthState?: string;
  [key: string]: unknown;
}
