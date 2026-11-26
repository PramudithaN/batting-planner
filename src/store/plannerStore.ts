import { INITIAL_COACH_ACCOUNTS, INITIAL_PLAYER_POOL } from '../domain/roster';
import type {
  BallEvent,
  CoachAccount,
  Player,
  PracticeDay,
  SessionSlot,
  StationCompletion,
  StationConfig,
  StationLock,
} from '../domain/types';
import { createMockPracticeDay } from './mockDatabase';

const STORAGE_DAYS_KEY = 'slc_bp_days_v2';
const STORAGE_MOCK_SEEDED_KEY = 'slc_bp_mock_seeded_v2';
const STORAGE_PLAYERS_KEY = 'slc_bp_players_v2';
const STORAGE_COACHES_KEY = 'slc_bp_coaches_v2';
const STORAGE_SESSION_KEY = 'slc_bp_active_coach_v2';
const LOCK_TTL_MS = 5 * 60 * 1000;

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createEmptyDay(practiceDate: string): PracticeDay {
  return {
    practiceDate,
    sessions: [
      {
        id: 'session-1',
        name: 'Session 1',
        startTime: '09:00',
        endTime: '10:30',
        version: 1,
      },
    ],
    availablePlayerIds: [],
    stations: [],
    locks: [],
    balls: [],
    completions: [],
    version: 1,
  };
}

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_PLAYERS_KEY);
    if (!raw) return [...INITIAL_PLAYER_POOL];
    const parsed = JSON.parse(raw) as Player[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PLAYER_POOL];
  } catch {
    return [...INITIAL_PLAYER_POOL];
  }
}

export function savePlayers(players: Player[]): void {
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
  localStorage.setItem(STORAGE_PLAYERS_KEY, JSON.stringify(sorted));
}

export function loadCoaches(): CoachAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_COACHES_KEY);
    if (!raw) return [...INITIAL_COACH_ACCOUNTS];
    const parsed = JSON.parse(raw) as CoachAccount[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_COACH_ACCOUNTS];
  } catch {
    return [...INITIAL_COACH_ACCOUNTS];
  }
}

export function loadActiveCoachId(): string | null {
  return localStorage.getItem(STORAGE_SESSION_KEY);
}

export function saveActiveCoachId(coachId: string | null): void {
  if (coachId) {
    localStorage.setItem(STORAGE_SESSION_KEY, coachId);
  } else {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }
}

export function loadAllDays(): Record<string, PracticeDay> {
  try {
    const raw = localStorage.getItem(STORAGE_DAYS_KEY);
    if (!raw) {
      if (!localStorage.getItem(STORAGE_MOCK_SEEDED_KEY)) {
        const today = getTodayDateString();
        const seeded: Record<string, PracticeDay> = {
          [today]: createMockPracticeDay(today),
        };
        localStorage.setItem(STORAGE_DAYS_KEY, JSON.stringify(seeded));
        localStorage.setItem(STORAGE_MOCK_SEEDED_KEY, '1');
        return seeded;
      }
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, PracticeDay>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadDay(practiceDate: string): PracticeDay {
  const all = loadAllDays();
  const day = all[practiceDate] ?? createEmptyDay(practiceDate);
  const now = Date.now();
  return {
    ...day,
    locks: day.locks.filter((lock) => new Date(lock.expiresAt).getTime() > now),
  };
}

export function saveDay(day: PracticeDay): PracticeDay {
  const all = loadAllDays();
  const next: PracticeDay = {
    ...day,
    version: day.version + 1,
  };
  all[day.practiceDate] = next;
  localStorage.setItem(STORAGE_DAYS_KEY, JSON.stringify(all));
  return next;
}

export function clearAllDaysHistory(): void {
  localStorage.removeItem(STORAGE_DAYS_KEY);
}

export function acquireLock(
  day: PracticeDay,
  stationId: string,
  playerId: string,
  coach: CoachAccount,
  forceTakeover = false
): { day: PracticeDay; acquired: boolean; lockedBy?: string } {
  if (coach.role === 'viewer') {
    return { day, acquired: false, lockedBy: 'Read-Only Viewer' };
  }

  const now = Date.now();
  const activeLocks = day.locks.filter((l) => new Date(l.expiresAt).getTime() > now);
  const existing = activeLocks.find(
    (l) => l.stationId === stationId && l.playerId === playerId
  );

  if (existing && existing.coachId !== coach.id && !forceTakeover) {
    return { day, acquired: false, lockedBy: existing.coachName };
  }

  const remaining = activeLocks.filter(
    (l) => !(l.stationId === stationId && l.playerId === playerId) && l.coachId !== coach.id
  );

  const newLock: StationLock = {
    stationId,
    playerId,
    coachId: coach.id,
    coachName: coach.name,
    lockedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LOCK_TTL_MS).toISOString(),
  };

  const saved = saveDay({ ...day, locks: [...remaining, newLock] });
  return { day: saved, acquired: true };
}

export function releaseLock(
  day: PracticeDay,
  stationId: string,
  playerId: string,
  coachId: string
): PracticeDay {
  const filtered = day.locks.filter(
    (l) => !(l.stationId === stationId && l.playerId === playerId && l.coachId === coachId)
  );
  return saveDay({ ...day, locks: filtered });
}

export function addOrUpdateStation(
  day: PracticeDay,
  station: StationConfig,
  expectedVersion?: number
): { day: PracticeDay; conflict: boolean } {
  const existingIndex = day.stations.findIndex((s) => s.id === station.id);
  if (existingIndex >= 0) {
    const current = day.stations[existingIndex];
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      return { day, conflict: true };
    }
    const updatedStations = [...day.stations];
    updatedStations[existingIndex] = {
      ...station,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    return { day: saveDay({ ...day, stations: updatedStations }), conflict: false };
  }

  return {
    day: saveDay({
      ...day,
      stations: [...day.stations, station],
    }),
    conflict: false,
  };
}

export function deleteStation(day: PracticeDay, stationId: string): PracticeDay {
  const stations = day.stations.filter((s) => s.id !== stationId);
  const locks = day.locks.filter((l) => l.stationId !== stationId);
  return saveDay({ ...day, stations, locks });
}

export function upsertSessionSlot(day: PracticeDay, session: SessionSlot): PracticeDay {
  const idx = day.sessions.findIndex((s) => s.id === session.id);
  const sessions = [...day.sessions];
  if (idx >= 0) {
    sessions[idx] = { ...session, version: sessions[idx].version + 1 };
  } else {
    sessions.push(session);
  }
  return saveDay({ ...day, sessions });
}

export function appendBallEvent(day: PracticeDay, ball: BallEvent): PracticeDay {
  if (day.balls.some((b) => b.id === ball.id)) {
    return day;
  }
  return saveDay({ ...day, balls: [...day.balls, ball] });
}

export function undoLastBallEvent(
  day: PracticeDay,
  stationId: string,
  playerId: string
): PracticeDay {
  const activeBalls = day.balls.filter(
    (b) => b.stationId === stationId && b.playerId === playerId && !b.isUndone
  );
  const last = activeBalls[activeBalls.length - 1];
  if (!last) return day;

  const balls = day.balls.map((b) => (b.id === last.id ? { ...b, isUndone: true } : b));
  return saveDay({ ...day, balls });
}

export function saveCompletion(
  day: PracticeDay,
  completion: StationCompletion
): PracticeDay {
  const completions = [
    ...day.completions.filter(
      (c) => !(c.stationId === completion.stationId && c.playerId === completion.playerId)
    ),
    completion,
  ];
  const locks = day.locks.filter(
    (l) => !(l.stationId === completion.stationId && l.playerId === completion.playerId)
  );
  return saveDay({ ...day, completions, locks });
}
