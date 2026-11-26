import { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, Wifi, WifiOff } from 'lucide-react';
import { CoachAuthGate } from './components/CoachAuthGate';
import { DaySetupView } from './components/DaySetupView';
import { LiveStationsView } from './components/LiveStationsView';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { ReportsView } from './components/ReportsView';
import type {
  BallEvent,
  CoachAccount,
  Player,
  PracticeDay,
  SessionSlot,
  StationCompletion,
  StationConfig,
} from './domain/types';
import { isSupabaseConfigured } from './lib/env';
import {
  clearOfflineQueue,
  enqueueOfflineMutation,
  readOfflineQueue,
} from './lib/offlineQueue';
import {
  acquireLock,
  addOrUpdateStation,
  appendBallEvent,
  clearAllDaysHistory,
  deleteStation,
  getTodayDateString,
  loadActiveCoachId,
  loadCoaches,
  loadDay,
  loadPlayers,
  saveActiveCoachId,
  saveCompletion,
  saveDay,
  savePlayers,
  undoLastBallEvent,
  upsertSessionSlot,
} from './store/plannerStore';

type Tab = 'setup' | 'live' | 'reports';

export function App() {
  const [coaches] = useState<CoachAccount[]>(() => loadCoaches());
  const [currentCoach, setCurrentCoach] = useState<CoachAccount | null>(() => {
    const id = loadActiveCoachId();
    return coaches.find((c) => c.id === id) ?? null;
  });

  const [tab, setTab] = useState<Tab>('setup');
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [day, setDay] = useState<PracticeDay>(() => loadDay(getTodayDateString()));
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'error' } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const syncChannel = useRef<BroadcastChannel | null>(null);

  const showToast = useCallback((msg: string, type: 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const broadcastSync = useCallback((practiceDate: string) => {
    syncChannel.current?.postMessage({ type: 'DAY_UPDATED', practiceDate });
  }, []);

  useEffect(() => {
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel('slc-batting-practice-sync');
      syncChannel.current = ch;
      ch.onmessage = (e) => {
        if (e.data?.type === 'DAY_UPDATED' && e.data.practiceDate === day.practiceDate) {
          setDay(loadDay(day.practiceDate));
        }
      };
      return () => ch.close();
    }
    return undefined;
  }, [day.practiceDate]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      const queued = readOfflineQueue();
      if (queued.length > 0) {
        clearOfflineQueue();
        showToast(`Synced ${queued.length} offline update(s).`);
      }
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [showToast]);

  const handleSignIn = (coach: CoachAccount) => {
    saveActiveCoachId(coach.id);
    setCurrentCoach(coach);
  };

  const handleSignOut = () => {
    saveActiveCoachId(null);
    setCurrentCoach(null);
  };

  const handleChangeDate = (newDate: string) => {
    if (!newDate) return;
    setDay(loadDay(newDate));
  };

  const handleAddPlayer = (name: string): Player | null => {
    const existing = players.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!day.availablePlayerIds.includes(existing.id)) {
        const nextDay = saveDay({
          ...day,
          availablePlayerIds: [...day.availablePlayerIds, existing.id],
        });
        setDay(nextDay);
        broadcastSync(nextDay.practiceDate);
      }
      return existing;
    }

    const newPlayer: Player = {
      id: `custom-${Date.now()}`,
      name,
      squads: [],
      isCustom: true,
    };
    const nextPlayers = [...players, newPlayer].sort((a, b) => a.name.localeCompare(b.name));
    savePlayers(nextPlayers);
    setPlayers(nextPlayers);

    const nextDay = saveDay({
      ...day,
      availablePlayerIds: [...day.availablePlayerIds, newPlayer.id],
    });
    setDay(nextDay);
    broadcastSync(nextDay.practiceDate);
    return newPlayer;
  };

  const handleTogglePlayer = (playerId: string) => {
    const exists = day.availablePlayerIds.includes(playerId);
    const availablePlayerIds = exists
      ? day.availablePlayerIds.filter((id) => id !== playerId)
      : [...day.availablePlayerIds, playerId];
    const nextDay = saveDay({ ...day, availablePlayerIds });
    setDay(nextDay);
    broadcastSync(nextDay.practiceDate);
  };

  const handleSaveSession = (session: SessionSlot) => {
    const nextDay = upsertSessionSlot(day, session);
    setDay(nextDay);
    broadcastSync(nextDay.practiceDate);
  };

  const handlePublishStations = (newStations: StationConfig[]) => {
    let next = day;
    for (const st of newStations) {
      next = addOrUpdateStation(next, st).day;
    }
    setDay(next);
    broadcastSync(next.practiceDate);
    showToast('Day plan published.');
  };

  const handleEditPublishedStation = (station: StationConfig) => {
    const res = addOrUpdateStation(day, station, station.version);
    if (res.conflict) {
      showToast('Another coach updated this station. Refreshed latest state.', 'error');
      setDay(loadDay(day.practiceDate));
      return;
    }
    setDay(res.day);
    broadcastSync(res.day.practiceDate);
    showToast(`Updated Station ${station.stationNumber}.`);
  };

  const handleDeletePublishedStation = (stationId: string) => {
    const nextDay = deleteStation(day, stationId);
    setDay(nextDay);
    broadcastSync(nextDay.practiceDate);
    showToast('Station removed.');
  };

  const handleAddLatePlayer = (playerIdOrName: string, isManual: boolean) => {
    if (isManual) {
      handleAddPlayer(playerIdOrName);
      showToast(`${playerIdOrName} added to today's players.`);
      return;
    }
    if (!day.availablePlayerIds.includes(playerIdOrName)) {
      const nextDay = saveDay({
        ...day,
        availablePlayerIds: [...day.availablePlayerIds, playerIdOrName],
      });
      setDay(nextDay);
      broadcastSync(nextDay.practiceDate);
      showToast("Added to today's players.");
    }
  };

  const handleAcquireLock = (stationId: string, playerId: string, force = false): boolean => {
    if (!currentCoach) return false;
    const res = acquireLock(day, stationId, playerId, currentCoach, force);
    setDay(res.day);
    broadcastSync(res.day.practiceDate);
    if (!res.acquired && res.lockedBy) {
      showToast(`Locked by ${res.lockedBy}.`, 'error');
    }
    return res.acquired;
  };

  const handleLogBall = (ball: BallEvent) => {
    const nextDay = appendBallEvent(day, ball);
    setDay(nextDay);
    broadcastSync(nextDay.practiceDate);
    if (!isOnline) {
      enqueueOfflineMutation({
        id: ball.id,
        type: 'ball',
        practiceDate: day.practiceDate,
        payload: ball,
        createdAt: ball.createdAt,
      });
    }
  };

  const handleUndoLastBall = (stationId: string, playerId: string) => {
    const nextDay = undoLastBallEvent(day, stationId, playerId);
    setDay(nextDay);
    broadcastSync(nextDay.practiceDate);
  };

  const handleSaveCompletion = (completion: StationCompletion) => {
    const nextDay = saveCompletion(day, completion);
    setDay(nextDay);
    broadcastSync(nextDay.practiceDate);
  };

  const handleClearHistory = () => {
    clearAllDaysHistory();
    setDay(loadDay(day.practiceDate));
  };

  if (!currentCoach) {
    return <CoachAuthGate coaches={coaches} onSignIn={handleSignIn} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PwaInstallBanner />

      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-[#0F294A] text-[#FFFFFF]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D97706] bg-[#0F294A] text-sm font-bold text-[#FFFFFF]">
              BP
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Batting Practice</h1>
              <p className="text-xs text-[#CBD5E1]">Sri Lanka Cricket · High Performance</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isOnline ? 'bg-[#16A34A] text-[#FFFFFF]' : 'bg-[#D97706] text-[#FFFFFF]'
              }`}
            >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? (isSupabaseConfigured ? 'Live Sync' : 'Local Sync') : 'Offline Queue'}
            </span>

            <span className="rounded-lg bg-[#1E3A5F] px-2.5 py-1 text-xs font-medium text-[#FFFFFF]">
              {currentCoach.name} ({currentCoach.role})
            </span>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 rounded-lg border border-[#475569] px-2.5 py-1 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E3A5F]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Switch
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          aria-label="Planner sections"
          className="mx-auto flex max-w-6xl gap-1 px-4"
        >
          {(
            [
              ['setup', 'Day setup'],
              ['live', 'Live stations'],
              ['reports', 'Reports'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`touch-target border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === key
                  ? 'border-[#D97706] text-[#FFFFFF]'
                  : 'border-transparent text-[#CBD5E1] hover:text-[#FFFFFF]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg border border-[#E2E8F0] bg-[#0F294A] px-4 py-2.5 text-sm font-semibold text-[#FFFFFF] shadow-md">
          <span className={toast.type === 'error' ? 'text-[#FCA5A5]' : 'text-[#FFFFFF]'}>
            {toast.msg}
          </span>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-6xl p-4">
        {tab === 'setup' && (
          <DaySetupView
            day={day}
            players={players}
            currentCoach={currentCoach}
            onChangeDate={handleChangeDate}
            onAddPlayer={handleAddPlayer}
            onTogglePlayer={handleTogglePlayer}
            onSaveSession={handleSaveSession}
            onPublishStations={handlePublishStations}
            onEditPublishedStation={handleEditPublishedStation}
            onDeletePublishedStation={handleDeletePublishedStation}
            onGoToLive={() => setTab('live')}
            onToast={showToast}
          />
        )}

        {tab === 'live' && (
          <LiveStationsView
            day={day}
            players={players}
            currentCoach={currentCoach}
            onChangeDate={handleChangeDate}
            onRefresh={() => setDay(loadDay(day.practiceDate))}
            onGoToSetup={() => setTab('setup')}
            onAddLatePlayer={handleAddLatePlayer}
            onAcquireLock={handleAcquireLock}
            onLogBall={handleLogBall}
            onUndoLastBall={handleUndoLastBall}
            onSaveCompletion={handleSaveCompletion}
            onToast={showToast}
          />
        )}

        {tab === 'reports' && (
          <ReportsView
            day={day}
            players={players}
            currentCoach={currentCoach}
            onChangeDate={handleChangeDate}
            onRefresh={() => setDay(loadDay(day.practiceDate))}
            onClearHistory={handleClearHistory}
            onToast={showToast}
          />
        )}
      </main>
    </div>
  );
}

export default App;
