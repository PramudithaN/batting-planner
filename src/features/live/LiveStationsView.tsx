import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  Lock,
  Plus,
  RefreshCw,
  Undo2,
  Unlock,
  Zap,
} from 'lucide-react';
import { UiDatePicker } from '../../components/ui/UiDatePicker';
import { UiSelect } from '../../components/ui/UiSelect';
import {
  BOWLING_STYLES,
  CONTACT_OUTCOMES,
  DEFAULT_COACHES,
  DISMISSAL_TYPES,
  LENGTHS,
  LINES,
  RUN_OPTIONS,
  SHOT_CATEGORIES,
  ballInputSchema,
  completionInputSchema,
  type BallEvent,
  type CoachAccount,
  type Player,
  type PracticeDay,
  type StationCompletion,
  type StationConfig,
} from '../../domain/types';
import { LiveBatterCard } from './LiveBatterCard';
import { PitchMapSvg } from './PitchMapSvg';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';
import { UiGuideTip } from '../../components/ui/UiGuideTip';
import { WagonWheelSvg } from '../../components/3d/WagonWheelSvg';
import { hapticSuccess, hapticTap, hapticWarning } from '../../lib/haptics';

interface LiveStationsViewProps {
  day: PracticeDay;
  players: Player[];
  currentCoach: CoachAccount;
  onChangeDate: (date: string) => void;
  onRefresh: () => void;
  onGoToSetup: () => void;
  onAddLatePlayer: (playerIdOrName: string, isManual: boolean) => void;
  onAcquireLock: (stationId: string, playerId: string, force?: boolean) => boolean;
  onLogBall: (ball: BallEvent) => void;
  onUndoLastBall: (stationId: string, playerId: string) => void;
  onSaveCompletion: (completion: StationCompletion) => void;
  onToast: (msg: string, type?: 'info' | 'error') => void;
  isTipVisible: (id: string) => boolean;
  onDismissTip: (id: string) => void;
  onDismissAllTips: () => void;
}

const OUTCOME_BASE_STYLE =
  'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]';

const OUTCOME_ACTIVE: Record<string, string> = {
  Solid: 'border-emerald-600 bg-emerald-600 text-white',
  'Not middled': 'border-amber-600 bg-amber-600 text-white',
  'Played and missed': 'border-slate-600 bg-slate-600 text-white',
  Beaten: 'border-rose-600 bg-rose-600 text-white',
  Edged: 'border-orange-600 bg-orange-600 text-white',
  Left: 'border-sky-600 bg-sky-600 text-white',
};

const SHOT_DEFAULT_COORDS_RHB: Record<string, [number, number]> = {
  'Straight drive': [50, 72],
  'Off drive': [38, 70],
  'On drive': [62, 70],
  'Cover drive': [22, 64],
  'Square drive': [14, 48],
  'Back-foot punch': [32, 60],
  'Square cut': [14, 38],
  'Late cut': [26, 16],
  Pull: [84, 48],
  Hook: [80, 26],
  Flick: [78, 56],
  'Leg glance': [74, 18],
  Sweep: [86, 44],
  'Reverse sweep': [16, 42],
  'Paddle sweep': [72, 16],
  'Slog sweep': [84, 62],
  'Forward defence': [46, 46],
  'Back-foot defence': [48, 42],
};

function getDefaultShotCoords(shot: string, stance: 'RHB' | 'LHB'): [number, number] | undefined {
  const base = SHOT_DEFAULT_COORDS_RHB[shot];
  if (!base) return undefined;
  return stance === 'LHB' ? [100 - base[0], base[1]] : base;
}

export const LiveStationsView: React.FC<LiveStationsViewProps> = ({
  day,
  players,
  currentCoach,
  onChangeDate,
  onRefresh,
  onGoToSetup,
  onAddLatePlayer,
  onAcquireLock,
  onLogBall,
  onUndoLastBall,
  onSaveCompletion,
  onToast,
  isTipVisible,
  onDismissTip,
  onDismissAllTips,
}) => {
  const isViewer = currentCoach.role === 'viewer';
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateSelection, setLateSelection] = useState('');
  const [lateManualName, setLateManualName] = useState('');

  const playerStripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updatePlayerStripScroll = useCallback(() => {
    const el = playerStripRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const [autoSaveOnOutcome, setAutoSaveOnOutcome] = useState(true);
  const [wheelMode, setWheelMode] = useState<'mark' | 'live'>('mark');
  const [shotTab, setShotTab] = useState<keyof typeof SHOT_CATEGORIES>('Front Foot');
  const [showManualLineLength, setShowManualLineLength] = useState(false);

  // Ball inputs (Bowling style stays sticky across balls per UX-04)
  const [bowlingStyle, setBowlingStyle] = useState<string | undefined>(undefined);
  const [line, setLine] = useState<string | undefined>(undefined);
  const [length, setLength] = useState<string | undefined>(undefined);
  const [shotType, setShotType] = useState<string | undefined>(undefined);
  const [shotX, setShotX] = useState<number | undefined>(undefined);
  const [shotY, setShotY] = useState<number | undefined>(undefined);
  const [runs, setRuns] = useState<string | undefined>(undefined);
  const [contactOutcome, setContactOutcome] = useState<string | undefined>(undefined);
  const [isWicket, setIsWicket] = useState<boolean>(false);
  const [dismissalType, setDismissalType] = useState<string | undefined>(undefined);
  const [justLoggedOutcome, setJustLoggedOutcome] = useState<string | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Completion modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [observingCoach, setObservingCoach] = useState<string>(currentCoach.name);
  const [customCoachName, setCustomCoachName] = useState('');
  const [rating, setRating] = useState<number>(8);
  const [remarks, setRemarks] = useState('');

  const availablePlayers = useMemo(
    () => players.filter((p) => day.availablePlayerIds.includes(p.id)),
    [players, day.availablePlayerIds]
  );

  const unselectedPlayers = useMemo(
    () => players.filter((p) => !day.availablePlayerIds.includes(p.id)),
    [players, day.availablePlayerIds]
  );

  const activeStation: StationConfig | undefined = day.stations.find(
    (s) => s.id === activeStationId
  );

  const activePlayerId = selectedPlayerId || availablePlayers[0]?.id || '';
  const activePlayer = players.find((p) => p.id === activePlayerId);
  const [batterStance, setBatterStance] = useState<'RHB' | 'LHB'>(
    activePlayer?.battingHand ?? 'RHB'
  );

  useEffect(() => {
    setBatterStance(activePlayer?.battingHand ?? 'RHB');
  }, [activePlayerId, activePlayer?.battingHand]);

  useEffect(() => {
    const el = playerStripRef.current;
    if (!el) return;
    updatePlayerStripScroll();
    const observer = new ResizeObserver(updatePlayerStripScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [availablePlayers.length, activeStation?.id, updatePlayerStripScroll]);

  const scrollPlayerStrip = (direction: 'left' | 'right') => {
    const el = playerStripRef.current;
    if (!el) return;
    const distance = Math.max(200, Math.round(el.clientWidth * 0.6));
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  const playerBalls = useMemo(
    () =>
      day.balls.filter(
        (b) => b.stationId === activeStationId && b.playerId === activePlayerId && !b.isUndone
      ),
    [day.balls, activeStationId, activePlayerId]
  );

  const completion = useMemo(
    () =>
      day.completions.find(
        (c) => c.stationId === activeStationId && c.playerId === activePlayerId
      ),
    [day.completions, activeStationId, activePlayerId]
  );

  const activeLock = useMemo(
    () =>
      day.locks.find(
        (l) => l.stationId === activeStationId && l.playerId === activePlayerId
      ),
    [day.locks, activeStationId, activePlayerId]
  );

  const isLockedByOther = Boolean(activeLock && activeLock.coachId !== currentCoach.id);
  const canScore = !isViewer && !completion && !isLockedByOther && Boolean(activeStation);
  const isBowlerStation =
    activeStation?.bowlingType === 'National Bowlers' ||
    activeStation?.bowlingType === 'Net Bowlers';

  const handleOpenStation = (stationId: string) => {
    setActiveStationId(stationId);
    const firstId = availablePlayers[0]?.id ?? '';
    setSelectedPlayerId(firstId);
    if (firstId && !isViewer) {
      onAcquireLock(stationId, firstId, false);
    }
  };

  const handleSelectPlayer = (playerId: string) => {
    hapticTap();
    setSelectedPlayerId(playerId);
    if (activeStationId && playerId && !isViewer) {
      onAcquireLock(activeStationId, playerId, false);
    }
  };

  const commitBall = (outcomeOverride?: string) => {
    const finalOutcome = outcomeOverride ?? contactOutcome;
    if (!activeStation || !activePlayerId || !canScore || !finalOutcome) return;

    const parsed = ballInputSchema.safeParse({
      stationId: activeStation.id,
      playerId: activePlayerId,
      bowlingStyle: isBowlerStation ? bowlingStyle : undefined,
      line,
      length,
      shotType,
      shotX,
      shotY,
      runs,
      contactOutcome: finalOutcome,
      isWicket: isWicket || Boolean(dismissalType) || undefined,
      dismissalType: isWicket || dismissalType ? dismissalType : undefined,
    });

    if (!parsed.success) {
      onToast('Select a Contact outcome before saving.', 'error');
      return;
    }

    const ball: BallEvent = {
      id: crypto.randomUUID(),
      stationId: activeStation.id,
      playerId: activePlayerId,
      coachId: currentCoach.id,
      coachName: currentCoach.name,
      ballNumber: playerBalls.length + 1,
      bowlingStyle: isBowlerStation ? bowlingStyle : undefined,
      line,
      length,
      shotType,
      shotX,
      shotY,
      runs,
      contactOutcome: finalOutcome,
      isWicket: isWicket || Boolean(dismissalType) || undefined,
      dismissalType: isWicket || dismissalType ? dismissalType : undefined,
      createdAt: new Date().toISOString(),
    };

    onLogBall(ball);

    const summary = `Ball ${ball.ballNumber} logged: ${finalOutcome}${
      ball.isWicket ? ` · OUT (${ball.dismissalType ?? 'Wicket'})` : ''
    }${runs ? ` · ${runs === 'Dot' ? '0 runs' : `${runs} runs`}` : ''}${
      shotType ? ` · ${shotType}` : ''
    }`;
    onToast(summary);

    setLine(undefined);
    setLength(undefined);
    setShotType(undefined);
    setShotX(undefined);
    setShotY(undefined);
    setRuns(undefined);
    setContactOutcome(undefined);
    setIsWicket(false);
    setDismissalType(undefined);
  };

  const handleOutcomeTap = (co: string) => {
    if (!canScore) return;
    if (autoSaveOnOutcome) {
      hapticSuccess();
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      setJustLoggedOutcome(co);
      flashTimerRef.current = window.setTimeout(() => {
        setJustLoggedOutcome(null);
        flashTimerRef.current = null;
      }, 480);
      commitBall(co);
    } else {
      hapticTap();
      setContactOutcome(co);
    }
  };

  const handleSubmitCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStation || !activePlayerId) return;
    const coachName =
      observingCoach === 'Other' ? customCoachName.trim() : observingCoach;
    const parsed = completionInputSchema.safeParse({
      observingCoach: coachName,
      rating,
      remarks: remarks.trim() || undefined,
    });
    if (!parsed.success) {
      onToast(parsed.error.issues[0]?.message ?? 'Invalid completion details.', 'error');
      return;
    }

    onSaveCompletion({
      id: `comp-${Date.now()}`,
      stationId: activeStation.id,
      playerId: activePlayerId,
      observingCoach: parsed.data.observingCoach,
      rating: parsed.data.rating,
      remarks: parsed.data.remarks,
      completedBy: currentCoach.name,
      completedAt: new Date().toISOString(),
    });
    hapticSuccess();
    setShowCompleteModal(false);
    setRemarks('');
    onToast('Player station completed.');
  };

  const handleSubmitLatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (lateSelection === '__manual__') {
      if (!lateManualName.trim()) {
        onToast('Enter a player name.', 'error');
        return;
      }
      onAddLatePlayer(lateManualName.trim(), true);
    } else if (lateSelection) {
      onAddLatePlayer(lateSelection, false);
    }
    setLateManualName('');
    setLateSelection('');
    setShowLateModal(false);
  };

  const recentBalls = useMemo(() => playerBalls.slice(-6).reverse(), [playerBalls]);

  const batterStats = useMemo(() => {
    let totalRuns = 0;
    let fours = 0;
    let sixes = 0;
    let wickets = 0;
    const outcomeCounts: Record<string, number> = {};
    const dismissalCounts: Record<string, number> = {};
    for (const co of CONTACT_OUTCOMES) {
      outcomeCounts[co] = 0;
    }
    for (const dt of DISMISSAL_TYPES) {
      dismissalCounts[dt] = 0;
    }
    for (const b of playerBalls) {
      const n = Number(b.runs);
      if (!Number.isNaN(n)) totalRuns += n;
      if (b.runs === '4') fours++;
      if (b.runs === '6') sixes++;
      if (b.contactOutcome in outcomeCounts) {
        outcomeCounts[b.contactOutcome]++;
      }
      if (b.isWicket || b.dismissalType) {
        wickets++;
        if (b.dismissalType && b.dismissalType in dismissalCounts) {
          dismissalCounts[b.dismissalType]++;
        }
      }
    }
    const solid = outcomeCounts['Solid'] ?? 0;
    const sr = playerBalls.length > 0 ? ((totalRuns / playerBalls.length) * 100).toFixed(1) : '0.0';
    return {
      totalRuns,
      balls: playerBalls.length,
      fours,
      sixes,
      wickets,
      strikeRate: sr,
      solidPct: playerBalls.length > 0 ? Math.round((solid / playerBalls.length) * 100) : 0,
      outcomeCounts,
      dismissalCounts,
    };
  }, [playerBalls]);

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      {!activeStation && (
        <div className="ui-card space-y-2.5 p-3.5 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:space-y-0 sm:p-4">
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <UiDatePicker value={day.practiceDate} onChange={onChangeDate} />
            <button
              type="button"
              onClick={() => {
                hapticTap();
                onRefresh();
              }}
              className="ui-btn-secondary shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {!isViewer && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  setShowLateModal(true);
                }}
                className="ui-btn-secondary px-2.5 sm:px-3.5"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate sm:hidden">Late Player</span>
                <span className="hidden sm:inline">Add Late Player</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticTap();
                  onGoToSetup();
                }}
                className="ui-btn-primary px-2.5 sm:px-4"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate sm:hidden">Add Stations</span>
                <span className="hidden sm:inline">Add Stations</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {day.stations.length === 0 ? (
        <div className="ui-card p-10 text-center">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            No published stations for {day.practiceDate}.
          </p>
          <button type="button" onClick={onGoToSetup} className="ui-btn-primary mt-4">
            Go to Day Setup
          </button>
        </div>
      ) : !activeStation ? (
        /* Stations Overview */
        <div className="space-y-5">
          {day.sessions.map((sess) => {
            const sessStations = day.stations.filter((s) => s.sessionId === sess.id);
            if (sessStations.length === 0) return null;
            return (
              <div key={sess.id} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {sess.name} ·{' '}
                    <span className="tabular-nums">
                      {sess.startTime} - {sess.endTime}
                    </span>
                  </h3>
                  <span className="tabular-nums text-xs font-semibold text-[var(--text-muted)]">
                    {availablePlayers.length} players
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sessStations.map((st) => {
                    const completedCount = day.completions.filter(
                      (c) => c.stationId === st.id
                    ).length;
                    const ballsCount = day.balls.filter(
                      (b) => b.stationId === st.id && !b.isUndone
                    ).length;
                    const stationLocks = day.locks.filter((l) => l.stationId === st.id);

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          hapticTap();
                          handleOpenStation(st.id);
                        }}
                        className="ui-card group flex flex-col justify-between p-3.5 text-left transition-all hover:border-[var(--accent-primary)] active:scale-[0.99] sm:p-4"
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-[var(--text-primary)]">
                              Station {st.stationNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="tabular-nums rounded bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[11px] font-bold text-[var(--accent-primary)]">
                                {ballsCount} balls
                              </span>
                              <span className="tabular-nums rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                                {completedCount} done
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                            <span className="rounded bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-600 dark:text-amber-400">
                              {st.trainingType === 'Other'
                                ? st.customTrainingType
                                : st.trainingType}
                            </span>
                            <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                              {st.netType}
                            </span>
                            <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                              {st.ballType}
                            </span>
                            <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                              {st.bowlingType}
                            </span>
                          </div>

                          {st.focus && (
                            <p className="mt-2 text-xs text-[var(--text-muted)]">
                              Focus: {st.focus}
                            </p>
                          )}

                          {stationLocks.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {stationLocks.map((lk) => (
                                <span
                                  key={`${lk.stationId}-${lk.playerId}`}
                                  className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                                >
                                  <Lock className="h-3 w-3" />
                                  {lk.coachName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex w-full items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-xs font-semibold text-[var(--accent-primary)]">
                          <span>Open scoring cockpit</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* SCORING COCKPIT */
        <div key={activeStation.id} className="ui-view-enter space-y-3">
          {/* Cockpit Top Bar */}
          <div className="ui-card flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveStationId(null)}
                className="ui-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Nets</span>
              </button>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Station {activeStation.stationNumber} · {activeStation.netType}
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {activeStation.ballType} · {activeStation.bowlingType}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isViewer && (
                <>
                  <button
                    type="button"
                    onClick={() => setAutoSaveOnOutcome((v) => !v)}
                    title="When ON, tapping a Contact Outcome immediately logs the ball"
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      autoSaveOnOutcome
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
                        : 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>1-Tap Save: {autoSaveOnOutcome ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLateModal(true)}
                    className="ui-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Late Player</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 1-Tap Horizontal Player Pill Strip */}
          <div className="relative">
            {canScrollLeft && (
              <button
                type="button"
                aria-label="Scroll players left"
                onClick={() => scrollPlayerStrip('left')}
                className="absolute top-1/2 left-0 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div
              ref={playerStripRef}
              onScroll={updatePlayerStripScroll}
              style={{
                maskImage:
                  canScrollLeft && canScrollRight
                    ? 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)'
                    : canScrollLeft
                      ? 'linear-gradient(to right, transparent, black 40px, black)'
                      : canScrollRight
                        ? 'linear-gradient(to right, black, black calc(100% - 40px), transparent)'
                        : undefined,
                WebkitMaskImage:
                  canScrollLeft && canScrollRight
                    ? 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)'
                    : canScrollLeft
                      ? 'linear-gradient(to right, transparent, black 40px, black)'
                      : canScrollRight
                        ? 'linear-gradient(to right, black, black calc(100% - 40px), transparent)'
                        : undefined,
              }}
              className={`no-scrollbar flex scroll-px-10 items-center gap-2 overflow-x-auto pb-1 ${
                canScrollLeft ? 'pl-9' : ''
              } ${canScrollRight ? 'pr-9' : ''} ${
                isTipVisible('live-player-strip') ? 'rounded-lg ring-2 ring-[#2563EB] ring-offset-2' : ''
              }`}
            >
              {availablePlayers.map((p) => {
                const selected = p.id === activePlayerId;
                const count = day.balls.filter(
                  (b) => b.stationId === activeStation.id && b.playerId === p.id && !b.isUndone
                ).length;
                const done = day.completions.some(
                  (c) => c.stationId === activeStation.id && c.playerId === p.id
                );

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        inline: 'nearest',
                        block: 'nearest',
                      });
                      onDismissTip('live-player-strip');
                      handleSelectPlayer(p.id);
                    }}
                    className={`touch-target flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <PlayerAvatar name={p.name} avatarUrl={p.avatarUrl} size="sm" />
                    <span>{p.name}</span>
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : count > 0 ? (
                      <span
                        className={`tabular-nums rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          selected
                            ? 'bg-white/20 text-white'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {canScrollRight && (
              <button
                type="button"
                aria-label="Scroll players right"
                onClick={() => scrollPlayerStrip('right')}
                className="absolute top-1/2 right-0 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <UiGuideTip
              visible={isTipVisible('live-player-strip')}
              title="1. Select Batter"
              description="Tap any player pill here to switch who you are scoring in this net."
              position="bottom"
              align="left"
              onDismiss={() => onDismissTip('live-player-strip')}
              onDismissAll={onDismissAllTips}
            />
          </div>

          {/* Lock Warning Banner */}
          {isLockedByOther && activeLock && !completion && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0" />
                <span>
                  Read-only: <strong>{activeLock.coachName}</strong> is currently scoring{' '}
                  <strong>{activePlayer?.name}</strong>.
                </span>
              </div>
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => onAcquireLock(activeStation.id, activePlayerId, true)}
                  className="ui-btn-primary min-h-[34px] bg-amber-600 hover:bg-amber-700"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Take Over</span>
                </button>
              )}
            </div>
          )}

          {/* Completed Read-Only Summary */}
          {completion ? (
            <div className="ui-card space-y-4 border-emerald-500/40 bg-emerald-500/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-base font-bold text-[var(--accent-primary)]">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Completed · {activePlayer?.name}</span>
                </div>
                <span className="tabular-nums rounded-md bg-[var(--accent-primary)] px-3 py-1 text-xs font-bold text-white">
                  {completion.rating}/10 Rating
                </span>
              </div>
              <p className="tabular-nums text-sm font-medium text-[var(--text-secondary)]">
                {playerBalls.length} balls logged · Observed by {completion.observingCoach}
              </p>
              {completion.remarks && (
                <p className="ui-card-elevated p-3 text-sm text-[var(--text-primary)]">
                  {completion.remarks}
                </p>
              )}
              <div className="max-w-md">
                <WagonWheelSvg
                  balls={playerBalls}
                  stance={batterStance}
                  onChangeStance={setBatterStance}
                />
              </div>
            </div>
          ) : (
            /* 2-Column Scoring Cockpit */
            <div className="grid gap-4 lg:grid-cols-12">
              {/* LEFT: Pitch Map + Wagon Wheel */}
              <div className="ui-card space-y-4 p-4 lg:col-span-5">
                <PitchMapSvg
                  selectedLine={line}
                  selectedLength={length}
                  stance={batterStance}
                  bowlingMode={
                    bowlingStyle &&
                    (bowlingStyle.toLowerCase().includes('spin') ||
                      bowlingStyle.toLowerCase().includes('orthodox') ||
                      bowlingStyle.toLowerCase().includes('chinaman'))
                      ? 'spin'
                      : 'pace'
                  }
                  balls={playerBalls}
                  onSelect={(ln, lg) => {
                    if (!canScore) return;
                    setLine(ln);
                    setLength(lg);
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowManualLineLength((v) => !v)}
                  className="ui-link text-[var(--text-muted)]"
                >
                  {showManualLineLength
                    ? 'Hide manual Line/Length'
                    : 'Manual Line/Length selection'}
                </button>

                {showManualLineLength && (
                  <div className="ui-card-elevated space-y-2 p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(batterStance === 'LHB' ? [...LINES].reverse() : LINES).map((ln) => (
                        <button
                          key={ln}
                          type="button"
                          disabled={!canScore}
                          onClick={() => setLine(line === ln ? undefined : ln)}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                            line === ln
                              ? 'bg-[var(--accent-primary)] text-white'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {ln}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {LENGTHS.map((lg) => (
                        <button
                          key={lg}
                          type="button"
                          disabled={!canScore}
                          onClick={() => setLength(length === lg ? undefined : lg)}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                            length === lg
                              ? 'bg-[var(--accent-primary)] text-white'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {lg}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wagon Wheel Mode Switcher */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setWheelMode('mark')}
                        className={`inline-flex items-center gap-1 rounded-md px-3 py-1 transition-colors ${
                          wheelMode === 'mark'
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <Crosshair className="h-3.5 w-3.5" />
                        <span>Mark Shot</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWheelMode('live')}
                        className={`inline-flex items-center gap-1 rounded-md px-3 py-1 transition-colors ${
                          wheelMode === 'live'
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>
                          Live Wheel ({playerBalls.filter((b) => typeof b.shotX === 'number').length})
                        </span>
                      </button>
                    </div>

                    {wheelMode === 'mark' && typeof shotX === 'number' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShotX(undefined);
                          setShotY(undefined);
                        }}
                        className="ui-link text-rose-500"
                      >
                        Clear mark
                      </button>
                    )}
                  </div>

                  {wheelMode === 'mark' ? (
                    <WagonWheelSvg
                      interactive={canScore}
                      balls={playerBalls}
                      selectedX={shotX}
                      selectedY={shotY}
                      selectedRuns={runs}
                      stance={batterStance}
                      onChangeStance={setBatterStance}
                      onSelectPoint={(x, y) => {
                        setShotX(x);
                        setShotY(y);
                      }}
                    />
                  ) : (
                    <WagonWheelSvg
                      balls={playerBalls}
                      stance={batterStance}
                      onChangeStance={setBatterStance}
                    />
                  )}
                </div>
              </div>

              {/* RIGHT: Bowling Style, Shot Type, Runs, Contact Outcome & Actions */}
              <div className="ui-card flex flex-col justify-between space-y-4 p-4 lg:col-span-7">
                <div className="space-y-4">
                  {/* Broadcast Cricket Player Stat Card */}
                  <LiveBatterCard
                    stationNumber={activeStation.stationNumber}
                    nextBallNumber={playerBalls.length + 1}
                    player={activePlayer}
                    stats={batterStats}
                  />

                  {/* Sticky Bowling Style (only for National / Net Bowlers) */}
                  {isBowlerStation && (
                    <div>
                      <label className="ui-label">Bowling Style (Sticky)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {BOWLING_STYLES.map((bs) => (
                          <button
                            key={bs}
                            type="button"
                            disabled={!canScore}
                            onClick={() => {
                            hapticTap();
                            setBowlingStyle(bowlingStyle === bs ? undefined : bs);
                          }}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                              bowlingStyle === bs
                                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                            }`}
                          >
                            {bs}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categorized Shot Type */}
                  <div>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <label className="ui-label mb-0">
                        Shot Type {shotType ? `· ${shotType}` : '(Optional)'}
                      </label>
                      <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 text-[11px] font-semibold">
                        {(Object.keys(SHOT_CATEGORIES) as Array<keyof typeof SHOT_CATEGORIES>).map(
                          (cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setShotTab(cat)}
                              className={`rounded-md px-2.5 py-1 transition-colors ${
                                shotTab === cat
                                  ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)]'
                                  : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {cat}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {SHOT_CATEGORIES[shotTab].map((sh) => (
                        <button
                          key={sh}
                          type="button"
                          disabled={!canScore}
                          onClick={() => {
                            hapticTap();
                            if (shotType === sh) {
                              setShotType(undefined);
                            } else {
                              setShotType(sh);
                              const coords = getDefaultShotCoords(sh, batterStance);
                              if (coords) {
                                setShotX(coords[0]);
                                setShotY(coords[1]);
                              }
                            }
                          }}
                          className={`touch-target rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            shotType === sh
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          {sh}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Runs */}
                  <div>
                    <label className="ui-label">Runs (Optional)</label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {RUN_OPTIONS.map((r) => {
                        const selected = runs === r;
                        const activeStyle =
                          r === '6'
                            ? 'border-[#881337] bg-[#881337] text-white shadow-xs'
                            : r === '4'
                              ? 'border-[#B45309] bg-[#D97706] text-white shadow-xs'
                              : 'border-[#1E40AF] bg-[#1D4ED8] text-white shadow-xs';
                        return (
                          <button
                            key={r}
                            type="button"
                            disabled={!canScore}
                            onClick={() => {
                              hapticTap();
                              setRuns(selected ? undefined : r);
                            }}
                            className={`touch-target tabular-nums rounded-lg border text-sm font-extrabold transition-colors ${
                              selected
                                ? activeStyle
                                : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#2563EB]'
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wicket / Dismissal Section */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="ui-label mb-0">
                        Wicket / How Out {isWicket ? `· ${dismissalType ?? 'Out'}` : '(Optional)'}
                      </label>
                      {isWicket && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsWicket(false);
                            setDismissalType(undefined);
                          }}
                          className="ui-link text-rose-500"
                        >
                          Clear wicket
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                      {DISMISSAL_TYPES.map((dt) => {
                        const active = isWicket && dismissalType === dt;
                        return (
                          <button
                            key={dt}
                            type="button"
                            disabled={!canScore}
                            onClick={() => {
                              hapticTap();
                              if (active) {
                                setIsWicket(false);
                                setDismissalType(undefined);
                              } else {
                                setIsWicket(true);
                                setDismissalType(dt);
                              }
                            }}
                            className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                              active
                                ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-rose-500/60'
                            }`}
                          >
                            {dt === 'Caught and bowled' ? 'C & Bowled' : dt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contact Outcome */}
                  <div className="relative">
                    <label className="ui-label">
                      Contact Outcome {autoSaveOnOutcome ? '· Tap to Log' : '(Required)'}
                    </label>
                    <div
                      className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${
                        !isTipVisible('live-player-strip') && isTipVisible('live-outcome')
                          ? 'rounded-lg ring-2 ring-[#2563EB] ring-offset-2'
                          : ''
                      }`}
                    >
                      {CONTACT_OUTCOMES.map((co) => {
                        const isFlashed = autoSaveOnOutcome && justLoggedOutcome === co;
                        const active = (!autoSaveOnOutcome && contactOutcome === co) || isFlashed;
                        return (
                          <button
                            key={co}
                            type="button"
                            disabled={!canScore}
                            onClick={() => {
                              onDismissTip('live-outcome');
                              handleOutcomeTap(co);
                            }}
                            className={`touch-target cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-150 active:scale-[0.97] ${
                              active
                                ? `${OUTCOME_ACTIVE[co]} ${
                                    isFlashed
                                      ? 'ring-2 ring-[var(--accent-primary)] ring-offset-1 shadow-sm'
                                      : ''
                                  }`
                                : `${OUTCOME_BASE_STYLE} hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]`
                            }`}
                          >
                            {isFlashed ? `✓ ${co}` : co}
                          </button>
                        );
                      })}
                    </div>
                    <UiGuideTip
                      visible={!isTipVisible('live-player-strip') && isTipVisible('live-outcome')}
                      title="2. Tap Outcome to Log Ball"
                      description="With '1-Tap Save: ON', tapping any Contact Outcome immediately logs the delivery and updates the live scorecard."
                      position="top"
                      align="left"
                      actionLabel="Got it"
                      onDismiss={() => onDismissTip('live-outcome')}
                      onDismissAll={onDismissAllTips}
                    />
                  </div>

                  {/* Cricket Broadcast Delivery Strip */}
                  {recentBalls.length > 0 && (
                    <div className="ui-card-elevated space-y-2 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          Recent Deliveries (Latest First)
                        </span>
                        <span className="tabular-nums text-[10px] font-semibold text-[var(--text-muted)]">
                          {playerBalls.length} total
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {recentBalls.map((b) => {
                          const isBoundary = b.runs === '4' || b.runs === '6';
                          const isDot = !b.runs || b.runs === 'Dot';
                          return (
                            <div
                              key={b.id}
                              className="flex max-w-full items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1 pr-2.5 pl-1 text-[11px]"
                            >
                              <span
                                className={`tabular-nums flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                                  b.isWicket
                                    ? 'bg-rose-600 text-white'
                                    : b.runs === '6'
                                      ? 'bg-rose-600 text-white'
                                      : b.runs === '4'
                                        ? 'bg-amber-500 text-white'
                                        : isDot
                                          ? 'bg-slate-500/20 text-[var(--text-secondary)]'
                                          : 'bg-[#2563EB] text-white'
                                }`}
                              >
                                {b.isWicket ? 'W' : b.runs === 'Dot' || !b.runs ? '0' : b.runs}
                              </span>
                              <div className="flex flex-wrap items-center gap-x-1 leading-tight">
                                <span className="tabular-nums text-[10px] font-semibold text-[var(--text-muted)]">
                                  Ball {b.ballNumber}
                                </span>
                                <span className="text-[var(--text-muted)]">·</span>
                                <span className="font-bold text-[var(--text-primary)]">
                                  {b.contactOutcome}
                                </span>
                                {b.shotType && (
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    · {b.shotType}
                                  </span>
                                )}
                                {b.isWicket && (
                                  <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                                    {b.dismissalType ?? 'Out'}
                                  </span>
                                )}
                                {isBoundary && (
                                  <span className="text-[10px] font-bold text-amber-500">
                                    ({b.runs})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!canScore || playerBalls.length === 0}
                      onClick={() => {
                        hapticWarning();
                        onUndoLastBall(activeStation.id, activePlayerId);
                      }}
                      className="ui-btn-danger flex-1 sm:flex-none"
                    >
                      <Undo2 className="h-4 w-4" />
                      <span>Undo</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canScore}
                      onClick={() => setShowCompleteModal(true)}
                      className="ui-btn-secondary flex-1 sm:flex-none"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[var(--accent-primary)]" />
                      <span>Complete Player</span>
                    </button>
                  </div>

                  {!autoSaveOnOutcome && (
                    <button
                      type="button"
                      disabled={!canScore || !contactOutcome}
                      onClick={() => commitBall()}
                      className="ui-btn-primary w-full px-5 sm:w-auto"
                    >
                      <span>Save & Next Ball</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Late Player Modal */}
      {showLateModal && (
        <div className="ui-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitLatePlayer}
            className="ui-card ui-modal-enter max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto p-5 shadow-xl"
          >
            <h3 className="text-base font-bold text-[var(--text-primary)]">Add Late Player</h3>
            <UiSelect
              value={lateSelection}
              onChange={setLateSelection}
              placeholder="Select from squad pool..."
              options={[
                ...unselectedPlayers.map((p) => ({ value: p.id, label: p.name })),
                { value: '__manual__', label: 'Add a name manually' },
              ]}
            />

            {lateSelection === '__manual__' && (
              <input
                type="text"
                value={lateManualName}
                onChange={(e) => setLateManualName(e.target.value)}
                placeholder="Player full name"
                className="ui-input"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLateModal(false)}
                className="ui-btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="ui-btn-primary">
                Add to Today
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Player Modal */}
      {showCompleteModal && (
        <div className="ui-backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitCompletion}
            className="ui-card ui-modal-enter max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto p-5 shadow-xl"
          >
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Complete {activePlayer?.name}
              </h3>
              <p className="tabular-nums text-xs text-[var(--text-muted)]">
                {playerBalls.length} balls logged in this net.
              </p>
            </div>

            <div>
              <label className="ui-label">Observing Coach</label>
              <UiSelect
                value={observingCoach}
                onChange={setObservingCoach}
                options={[
                  ...DEFAULT_COACHES.map((c) => ({ value: c, label: c })),
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </div>

            {observingCoach === 'Other' && (
              <input
                type="text"
                value={customCoachName}
                onChange={(e) => setCustomCoachName(e.target.value)}
                placeholder="Coach name"
                className="ui-input"
              />
            )}

            <div>
              <label className="ui-label">Coach Rating (0-10)</label>
              <div className="grid grid-cols-6 gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    className={`tabular-nums rounded-lg border py-2 text-xs font-bold transition-colors ${
                      rating === num
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="ui-label">Remarks (Optional)</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Key technical observations..."
                className="ui-textarea"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="ui-btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="ui-btn-primary">
                Save Completion
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
