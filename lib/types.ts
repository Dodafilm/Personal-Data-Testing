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
}

export interface HeartData {
  resting_hr: number;
  hrv_avg: number;
  hr_min: number;
  hr_max: number;
}

export interface WorkoutData {
  activity_score: number;
  calories_active: number;
  steps: number;
  active_min: number;
}

export interface DayRecord {
  date: string;
  source?: string;
  sleep?: SleepData;
  heart?: HeartData;
  workout?: WorkoutData;
}

export interface Settings {
  bgEffect?: string;
  ouraClientId?: string;
  corsProxy?: string;
  ouraToken?: string;
  oauthState?: string;
  [key: string]: unknown;
}
