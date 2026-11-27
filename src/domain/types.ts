import { z } from 'zod';

export const TRAINING_TYPES = ['Block', 'Random', 'Situation', 'Other'] as const;
export const NET_TYPES = ['Indoor', 'Outdoor net', 'Center wicket', 'Granite', 'Astro'] as const;
export const BALL_TYPES = [
  'White New Ball',
  'White Semi Ball',
  'White Old Ball',
  'Red New Ball',
  'Red Semi Ball',
  'Red Old Ball',
  'Variety',
] as const;
export const BOWLING_TYPES = [
  'National Bowlers',
  'Net Bowlers',
] as const;

export const BOWLING_STYLES = [
  'Right arm fast',
  'Left arm fast',
  'Right arm off spin',
  'Right arm leg spin',
  'Left arm orthodox',
  'Left arm chinaman',
] as const;

export const LINES = [
  'Wide outside off',
  'Outside off',
  'Off stump',
  'Middle stump',
  'Leg stump',
  'Outside leg',
  'Wide outside leg',
] as const;

export const DISMISSAL_TYPES = [
  'LBW',
  'Bowled',
  'Caught behind',
  'Caught',
  'Caught and bowled',
  'Stumped',
] as const;

export const LENGTHS = [
  'Yorker',
  'Fuller',
  'Good Length',
  'Short of a Length',
  'Short',
] as const;

export interface PitchLengthZone {
  label: string;
  minMeters: number;
  maxMeters: number;
  rangeText: string;
  fill: string;
  textColor: string;
}

export const PACE_LENGTH_ZONES: readonly PitchLengthZone[] = [
  {
    label: 'Yorker',
    minMeters: 0,
    maxMeters: 0.9,
    rangeText: '0–0.9m',
    fill: 'rgba(234, 179, 8, 0.40)',
    textColor: '#FEF08A',
  },
  {
    label: 'Fuller',
    minMeters: 0.9,
    maxMeters: 2.8,
    rangeText: '0.9–2.8m',
    fill: 'rgba(34, 197, 94, 0.36)',
    textColor: '#BBF7D0',
  },
  {
    label: 'Good Length',
    minMeters: 2.8,
    maxMeters: 5.9,
    rangeText: '2.8–5.9m',
    fill: 'rgba(234, 88, 12, 0.38)',
    textColor: '#FED7AA',
  },
  {
    label: 'Short of a Length',
    minMeters: 5.9,
    maxMeters: 8.6,
    rangeText: '5.9–8.6m',
    fill: 'rgba(139, 92, 246, 0.32)',
    textColor: '#DDD6FE',
  },
  {
    label: 'Short',
    minMeters: 8.6,
    maxMeters: 11.5,
    rangeText: '8.6m+',
    fill: 'rgba(71, 85, 105, 0.42)',
    textColor: '#E2E8F0',
  },
] as const;

export const SPIN_LENGTH_ZONES: readonly PitchLengthZone[] = [
  {
    label: 'Yorker',
    minMeters: 0,
    maxMeters: 0.9,
    rangeText: '0–0.9m',
    fill: 'rgba(234, 179, 8, 0.40)',
    textColor: '#FEF08A',
  },
  {
    label: 'Fuller',
    minMeters: 0.9,
    maxMeters: 2.5,
    rangeText: '0.9–2.5m',
    fill: 'rgba(34, 197, 94, 0.36)',
    textColor: '#BBF7D0',
  },
  {
    label: 'Good Length',
    minMeters: 2.5,
    maxMeters: 4.1,
    rangeText: '2.5–4.1m',
    fill: 'rgba(234, 88, 12, 0.38)',
    textColor: '#FED7AA',
  },
  {
    label: 'Short Length',
    minMeters: 4.1,
    maxMeters: 11.5,
    rangeText: '4.1m+',
    fill: 'rgba(139, 92, 246, 0.32)',
    textColor: '#DDD6FE',
  },
] as const;

export const SHOT_TYPES = [
  'Straight drive',
  'Cover drive',
  'Square drive',
  'On drive',
  'Off drive',
  'Back-foot punch',
  'Square cut',
  'Late cut',
  'Pull',
  'Hook',
  'Flick',
  'Leg glance',
  'Sweep',
  'Reverse sweep',
  'Paddle sweep',
  'Slog sweep',
  'Forward defence',
  'Back-foot defence',
] as const;

export const SHOT_CATEGORIES: Record<'Front Foot' | 'Back Foot' | 'Sweep & Pull', readonly string[]> = {
  'Front Foot': [
    'Straight drive',
    'Cover drive',
    'Square drive',
    'On drive',
    'Off drive',
    'Flick',
    'Forward defence',
  ],
  'Back Foot': [
    'Back-foot punch',
    'Square cut',
    'Late cut',
    'Leg glance',
    'Back-foot defence',
  ],
  'Sweep & Pull': ['Pull', 'Hook', 'Sweep', 'Reverse sweep', 'Paddle sweep', 'Slog sweep'],
};

export const RUN_OPTIONS = ['Dot', '1', '2', '3', '4', '6'] as const;

export const CONTACT_OUTCOMES = [
  'Solid',
  'Not middled',
  'Played and missed',
  'Beaten',
  'Edged',
  'Left',
] as const;

export const DEFAULT_COACHES = [
  'Hashan Thilakarathna',
  'Dhammika Sudarshana',
  'Saman Jayantha',
  'Ashan Priyanjan',
  'Thamra Abeyrathna',
] as const;

export const WAGON_RUN_COLORS: Record<string, string> = {
  Dot: '#94A3B8',
  '1': '#0EA5E9',
  '2': '#10B981',
  '3': '#8B5CF6',
  '4': '#F59E0B',
  '6': '#F43F5E',
  Unrecorded: '#CBD5E1',
};

export type UserRole = 'master' | 'coach' | 'viewer';

export interface CoachAccount {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // Stored as 4-digit PIN in local mode; server-hashed in Supabase
}

export interface Player {
  id: string;
  name: string;
  squads: string[];
  battingHand?: 'RHB' | 'LHB';
  avatarUrl?: string;
  isCustom?: boolean;
}

export interface SessionSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  version: number;
}

export interface StationConfig {
  id: string;
  stationNumber: number;
  sessionId: string;
  sessionName: string;
  startTime: string;
  endTime: string;
  trainingType: string;
  customTrainingType?: string;
  netType: string;
  ballType: string;
  bowlingType: string;
  focus?: string;
  version: number;
  updatedBy: string;
  updatedAt: string;
}

export interface StationLock {
  stationId: string;
  playerId: string;
  coachId: string;
  coachName: string;
  lockedAt: string;
  expiresAt: string;
}

export interface BallEvent {
  id: string;
  stationId: string;
  playerId: string;
  coachId: string;
  coachName: string;
  ballNumber: number;
  bowlingStyle?: string;
  line?: string;
  length?: string;
  shotType?: string;
  shotX?: number;
  shotY?: number;
  runs?: string;
  contactOutcome: string;
  isWicket?: boolean;
  dismissalType?: string;
  isUndone?: boolean;
  createdAt: string;
}

export interface StationCompletion {
  id: string;
  stationId: string;
  playerId: string;
  observingCoach: string;
  rating: number;
  remarks?: string;
  completedBy: string;
  completedAt: string;
}

export interface PracticeDay {
  practiceDate: string;
  sessions: SessionSlot[];
  availablePlayerIds: string[];
  stations: StationConfig[];
  locks: StationLock[];
  balls: BallEvent[];
  completions: StationCompletion[];
  version: number;
}

export const ballInputSchema = z.object({
  stationId: z.string().min(1),
  playerId: z.string().min(1),
  bowlingStyle: z.string().optional(),
  line: z.string().optional(),
  length: z.string().optional(),
  shotType: z.string().optional(),
  shotX: z.number().min(0).max(100).optional(),
  shotY: z.number().min(0).max(80).optional(),
  runs: z.string().optional(),
  contactOutcome: z.enum(CONTACT_OUTCOMES),
  isWicket: z.boolean().optional(),
  dismissalType: z.string().optional(),
});

export const completionInputSchema = z.object({
  observingCoach: z.string().trim().min(1, 'Observing coach is required.'),
  rating: z.number().min(0).max(10),
  remarks: z.string().optional(),
});
