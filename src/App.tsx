import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarPlus,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { CoachAuthGate } from './components/CoachAuthGate';
import { DaySetupView } from './components/DaySetupView';
import { LiveStationsView } from './components/LiveStationsView';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { ReportsView } from './components/ReportsView';
import { SlcLionCrest } from './components/SlcLionCrest';
import { UiDingToast, type DingToastItem } from './components/ui/UiDingToast';
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

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('slc-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [tab, setTab] = useState<Tab>('setup');
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [day, setDay] = useState<PracticeDay>(() => loadDay(getTodayDateString()));
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [toasts, setToasts] = useState<DingToastItem[]>([]);
  const [dismissedTips, setDismissedTips] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('slc-guide-dismissed');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [guideDisabled, setGuideDisabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('slc-guide-off') === '1';
    } catch {
      return false;
    }
  });
  const toastTimers = useRef<Map<string, number>>(new Map());
  const syncChannel = useRef<BroadcastChannel | null>(null);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);
  }, []);

  const showToast = useCallback(
    (msg: string, type: 'info' | 'error' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, msg, type }]);
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, 3200);
      toastTimers.current.set(id, timer);
    },
    [dismissToast]
  );

  const isTipVisible = useCallback(
    (tipId: string) => !guideDisabled && !dismissedTips.includes(tipId),
    [guideDisabled, dismissedTips]
  );

  const dismissTip = useCallback((tipId: string) => {
    setDismissedTips((prev) => {
      const next = prev.includes(tipId) ? prev : [...prev, tipId];
      try {
        localStorage.setItem('slc-guide-dismissed', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const dismissAllTips = useCallback(() => {
    setGuideDisabled(true);
    try {
      localStorage.setItem('slc-guide-off', '1');
    } catch {
      // ignore
    }
  }, []);

  const resetGuideTips = useCallback(() => {
    setGuideDisabled(false);
    setDismissedTips([]);
    try {
      localStorage.removeItem('slc-guide-off');
      localStorage.removeItem('slc-guide-dismissed');
    } catch {
      // ignore
    }
    showToast('Guide tooltips enabled.');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('slc-theme', next);
    } catch {
      // ignore
    }
  };

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
      toastTimers.current.forEach((timer) => window.clearTimeout(timer));
      toastTimers.current.clear();
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

  const handleSetAvailablePlayers = (playerIds: string[]) => {
    const nextDay = saveDay({ ...day, availablePlayerIds: playerIds });
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

  const activeBallsCount = day.balls.filter((b) => !b.isUndone).length;

  return (
    <div
      className={`min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] ${
        theme === 'dark' ? 'theme-dark dark' : ''
      }`}
    >
      <PwaInstallBanner />

      {/* Top Navbar with Sri Lanka Jersey Accent Strap & Lion Crest */}
      <header className="sticky top-0 z-30 bg-[var(--bg-header)] text-white shadow-sm">
        {/* Sri Lanka Jersey Gold & Maroon Accent Strap */}
        <div className="flex h-1 w-full">
          <div className="w-1/2 bg-[#881337]" />
          <div className="w-1/2 bg-[#EAB308]" />
        </div>

        <div className="border-b border-white/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-3 py-2.5 sm:px-4">
            {/* Brand */}
            <div className="flex shrink-0 items-center gap-2.5">
              <SlcLionCrest className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
              <div>
                <h1 className="text-sm font-bold leading-tight tracking-tight text-white">
                  Sri Lanka Cricket
                </h1>
                <p className="text-[11px] font-medium text-[#EAB308]">
                  Batting Practice Planner
                </p>
              </div>
            </div>

            {/* Navigation: Full-width clean 3-column bar on mobile/tablet, inline on lg+ desktop */}
            <nav
              aria-label="Planner sections"
              className="order-last grid w-full grid-cols-3 gap-1 rounded-lg bg-[var(--bg-header-pill)] p-1 lg:order-none lg:flex lg:w-auto lg:items-center"
            >
              {(
                [
                  {
                    key: 'setup',
                    label: 'Day Setup',
                    icon: CalendarPlus,
                    badge: day.availablePlayerIds.length,
                  },
                  {
                    key: 'live',
                    label: 'Live Nets',
                    icon: Activity,
                    badge: day.stations.length,
                  },
                  {
                    key: 'reports',
                    label: 'Reports',
                    icon: BarChart3,
                    badge: activeBallsCount,
                  },
                ] as const
              ).map(({ key, label, icon: Icon, badge }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-semibold transition-colors sm:px-3 ${
                      active
                        ? 'bg-[#2563EB] text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                    {badge > 0 && (
                      <span
                        className={`tabular-nums rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                          active ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Controls */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${
                  isOnline
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                <span className="hidden md:inline">
                  {isOnline ? (isSupabaseConfigured ? 'Live Sync' : 'Local Sync') : 'Offline'}
                </span>
              </span>

              <button
                type="button"
                onClick={resetGuideTips}
                aria-label="Show user guide tooltips"
                title="Show first-time guide tooltips"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-header-pill)] text-slate-200 hover:bg-white/10"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle light or dark theme"
                title={theme === 'dark' ? 'Switch to Daylight Mode' : 'Switch to Floodlight Mode'}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-header-pill)] text-slate-200 hover:bg-white/10"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-[#EAB308]" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <span className="hidden h-8 items-center rounded-md bg-[var(--bg-header-pill)] px-2.5 text-xs font-semibold text-slate-200 sm:inline-flex">
                {currentCoach.name}
              </span>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/15 bg-[var(--bg-header-pill)] px-2.5 text-xs font-semibold text-slate-200 hover:border-white/30 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Switch</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Ding-style Spring-Physics Toast Stack */}
      <UiDingToast toasts={toasts} onDismiss={dismissToast} />

      {/* Main Content */}
      <main key={tab} className="ui-view-enter mx-auto max-w-7xl p-4 sm:p-5">
        {tab === 'setup' && (
          <DaySetupView
            day={day}
            players={players}
            currentCoach={currentCoach}
            onChangeDate={handleChangeDate}
            onAddPlayer={handleAddPlayer}
            onTogglePlayer={handleTogglePlayer}
            onSetAvailablePlayers={handleSetAvailablePlayers}
            onSaveSession={handleSaveSession}
            onPublishStations={handlePublishStations}
            onEditPublishedStation={handleEditPublishedStation}
            onDeletePublishedStation={handleDeletePublishedStation}
            onGoToLive={() => setTab('live')}
            onToast={showToast}
            isTipVisible={isTipVisible}
            onDismissTip={dismissTip}
            onDismissAllTips={dismissAllTips}
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
            isTipVisible={isTipVisible}
            onDismissTip={dismissTip}
            onDismissAllTips={dismissAllTips}
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
            isTipVisible={isTipVisible}
            onDismissTip={dismissTip}
            onDismissAllTips={dismissAllTips}
          />
        )}
      </main>
    </div>
  );
}

export default App;
