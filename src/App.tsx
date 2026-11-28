import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarPlus,
  HelpCircle,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { CoachAuthGate } from './features/auth/CoachAuthGate';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { SlcLionCrest } from './components/SlcLionCrest';
import { SlcLoader } from './components/ui/SlcLoader';
import { UiConfirmModal } from './components/ui/UiConfirmModal';
import { UiDingToast, type DingToastItem } from './components/ui/UiDingToast';

const DaySetupView = lazy(() =>
  import('./features/setup/DaySetupView').then((m) => ({ default: m.DaySetupView }))
);
const LiveStationsView = lazy(() =>
  import('./features/live/LiveStationsView').then((m) => ({ default: m.LiveStationsView }))
);
const ReportsView = lazy(() =>
  import('./features/reports/ReportsView').then((m) => ({ default: m.ReportsView }))
);
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
import { hapticTap } from './lib/haptics';
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

function App() {
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
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    const onSwUpdate = () => setUpdateAvailable(true);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('slc-sw-update', onSwUpdate);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('slc-sw-update', onSwUpdate);
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
      <header className="sticky top-0 z-30 bg-[var(--bg-header)] pt-[env(safe-area-inset-top)] text-white shadow-sm">
        {/* Sri Lanka Jersey Gold & Maroon Accent Strap */}
        <div className="flex h-1 w-full">
          <div className="w-1/2 bg-[#881337]" />
          <div className="w-1/2 bg-[#EAB308]" />
        </div>

        <div className="border-b border-white/10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-3 py-2.5 sm:px-6 lg:py-3">
            {/* Brand */}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <SlcLionCrest className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" />
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-white sm:text-base">
                  Sri Lanka Cricket
                </h1>
                <p className="truncate text-[10px] font-medium text-[#EAB308] sm:text-xs">
                  <span className="sm:hidden">Batting Planner · v{__APP_VERSION__}</span>
                  <span className="hidden sm:inline">
                    Batting Practice Planner · v{__APP_VERSION__}
                  </span>
                </p>
              </div>
            </div>

            {/* Tablet & Desktop Navigation (md+) - Mobile (< 768px) uses the floating dock */}
            <nav
              aria-label="Planner sections"
              className="hidden items-center gap-1 rounded-xl bg-[var(--bg-header-pill)] p-1 md:flex lg:gap-1.5"
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
                    onClick={() => {
                      hapticTap();
                      setTab(key);
                    }}
                    className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-[13px] font-semibold transition-all active:scale-[0.98] ${
                      active
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                    {badge > 0 && (
                      <span
                        className={`tabular-nums rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none ${
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
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold sm:w-auto sm:gap-1.5 sm:px-3 lg:h-10 ${
                  isOnline
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-500/15 text-amber-300'
                }`}
                title={isOnline ? (isSupabaseConfigured ? 'Live Sync' : 'Local Sync') : 'Offline'}
              >
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span className="hidden md:inline">
                  {isOnline ? (isSupabaseConfigured ? 'Live Sync' : 'Local Sync') : 'Offline'}
                </span>
              </span>

              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  resetGuideTips();
                }}
                aria-label="Show user guide tooltips"
                title="Show first-time guide tooltips"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--bg-header-pill)] text-slate-200 transition-transform hover:bg-white/10 active:scale-95 lg:h-10 lg:w-10"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  toggleTheme();
                }}
                aria-label="Toggle light or dark theme"
                title={theme === 'dark' ? 'Switch to Daylight Mode' : 'Switch to Floodlight Mode'}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--bg-header-pill)] text-slate-200 transition-transform hover:bg-white/10 active:scale-95 lg:h-10 lg:w-10"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-[#EAB308]" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              <span className="hidden h-10 items-center rounded-lg bg-[var(--bg-header-pill)] px-3 text-xs font-semibold text-slate-200 sm:inline-flex">
                {currentCoach.name}
              </span>

              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  setShowLogoutConfirm(true);
                }}
                aria-label="Switch Coach"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-[var(--bg-header-pill)] px-2.5 text-xs font-semibold text-slate-200 transition-all hover:border-white/30 hover:text-white active:scale-95 sm:px-3 lg:h-10 lg:px-3.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Switch</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Ding-style Spring-Physics Toast Stack */}
      <UiDingToast toasts={toasts} onDismiss={dismissToast} />

      {/* New Version Available Banner */}
      {updateAvailable && (
        <div className="ui-view-enter border-b border-[#2563EB]/30 bg-[#2563EB]/10 px-4 py-2 text-xs text-[var(--text-primary)]">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
            <span className="font-semibold">
              New update available. Tap reload to get the latest version.
            </span>
            <button
              type="button"
              onClick={() => {
                hapticTap();
                window.dispatchEvent(new CustomEvent('slc-sw-apply-update'));
              }}
              className="ui-btn-primary min-h-[32px] shrink-0 px-3 py-1 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reload</span>
            </button>
          </div>
        </div>
      )}

      <UiConfirmModal
        open={showLogoutConfirm}
        title="Log out / Switch Coach?"
        description={`You are currently signed in as ${currentCoach.name}. Are you sure you want to log out and switch accounts?`}
        confirmLabel="Log Out"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          handleSignOut();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Main Content */}
      <main key={tab} className="ui-view-enter mx-auto max-w-[1440px] overflow-x-hidden p-4 pb-36 sm:p-5 md:pb-6">
        <Suspense
          fallback={
            <div className="flex min-h-[45vh] items-center justify-center">
              <SlcLoader size="lg" label="Loading view..." />
            </div>
          }
        >
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
        </Suspense>
      </main>

      {/* Mobile Floating Dock Navigation (< md) */}
      <nav
        aria-label="Mobile navigation"
        className="pointer-events-none fixed inset-x-0 bottom-3.5 z-30 px-4 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="pointer-events-auto mx-auto max-w-md rounded-full border border-white/15 bg-[var(--bg-header)]/95 p-1.5 shadow-[0_14px_38px_rgba(0,0,0,0.48)] backdrop-blur-xl">
          <div className="relative grid grid-cols-3">
            {/* Smooth Sliding Active Pill */}
            <div
              aria-hidden="true"
              style={{
                transform: `translateX(${
                  (tab === 'setup' ? 0 : tab === 'live' ? 1 : 2) * 100
                }%)`,
              }}
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] shadow-md shadow-[#2563EB]/35 ring-1 ring-white/20 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            />

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
                  onClick={() => {
                    hapticTap();
                    setTab(key);
                  }}
                  className={`relative z-10 flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[11px] font-semibold transition-all duration-300 active:scale-95 ${
                    active ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`h-[19px] w-[19px] shrink-0 transition-transform duration-300 ${
                      active ? 'scale-105' : 'scale-100'
                    }`}
                    strokeWidth={active ? 2.4 : 1.9}
                  />
                  <span className="leading-none tracking-tight">{label}</span>
                  {badge > 0 && (
                    <span
                      className={`tabular-nums absolute top-1.5 right-3 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold leading-none transition-colors duration-300 ${
                        active
                          ? 'bg-[#FACC15] text-[#0B1F4D]'
                          : 'bg-white/15 text-slate-200'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

export default App;
