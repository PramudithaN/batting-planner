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
] as const;

export const LENGTHS = [
  'Full toss',
  'Yorker',
  'Full',
  'Good length',
  'Back of a length',
  'Short',
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
});

export const completionInputSchema = z.object({
  observingCoach: z.string().trim().min(1, 'Observing coach is required.'),
  rating: z.number().min(0).max(10),
  remarks: z.string().optional(),
});
