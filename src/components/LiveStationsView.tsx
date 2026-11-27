import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Eye,
  Lock,
  Plus,
  RefreshCw,
  Undo2,
  Unlock,
  Zap,
} from 'lucide-react';
import { UiDatePicker } from './ui/UiDatePicker';
import { UiSelect } from './ui/UiSelect';
import {
  BOWLING_STYLES,
  CONTACT_OUTCOMES,
  DEFAULT_COACHES,
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
} from '../domain/types';
import { PitchMapSvg } from './PitchMapSvg';
import { SlcLionCrest } from './SlcLionCrest';
import { PlayerAvatar } from './ui/PlayerAvatar';
import { UiGuideTip } from './ui/UiGuideTip';
import { WagonWheelSvg } from './WagonWheelSvg';

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

const OUTCOME_STYLE: Record<string, string> = {
  Solid:
    'border-[var(--border-strong)] border-l-4 border-l-[#16A34A] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  'Not middled':
    'border-[var(--border-strong)] border-l-4 border-l-[#D97706] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  'Played and missed':
    'border-[var(--border-strong)] border-l-4 border-l-[#64748B] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  Beaten:
    'border-[var(--border-strong)] border-l-4 border-l-[#DC2626] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  Edged:
    'border-[var(--border-strong)] border-l-4 border-l-[#EA580C] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  Left:
    'border-[var(--border-strong)] border-l-4 border-l-[#2563EB] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
};

const OUTCOME_ACTIVE: Record<string, string> = {
  Solid: 'border-emerald-600 bg-emerald-600 text-white',
  'Not middled': 'border-amber-600 bg-amber-600 text-white',
  'Played and missed': 'border-slate-600 bg-slate-600 text-white',
  Beaten: 'border-rose-600 bg-rose-600 text-white',
  Edged: 'border-orange-600 bg-orange-600 text-white',
  Left: 'border-sky-600 bg-sky-600 text-white',
};

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
      createdAt: new Date().toISOString(),
    };

    onLogBall(ball);

    const summary = `Ball #${ball.ballNumber} saved: ${finalOutcome}${
      runs ? ` · ${runs === 'Dot' ? '0 runs' : `${runs} runs`}` : ''
    }${shotType ? ` · ${shotType}` : ''}`;
    onToast(summary);

    setLine(undefined);
    setLength(undefined);
    setShotType(undefined);
    setShotX(undefined);
    setShotY(undefined);
    setRuns(undefined);
    setContactOutcome(undefined);
  };

  const handleOutcomeTap = (co: string) => {
    if (!canScore) return;
    if (autoSaveOnOutcome) {
      commitBall(co);
    } else {
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
    const outcomeCounts: Record<string, number> = {};
    for (const co of CONTACT_OUTCOMES) {
      outcomeCounts[co] = 0;
    }
    for (const b of playerBalls) {
      const n = Number(b.runs);
      if (!Number.isNaN(n)) totalRuns += n;
      if (b.runs === '4') fours++;
      if (b.runs === '6') sixes++;
      if (b.contactOutcome in outcomeCounts) {
        outcomeCounts[b.contactOutcome]++;
      }
    }
    const solid = outcomeCounts['Solid'] ?? 0;
    const sr = playerBalls.length > 0 ? ((totalRuns / playerBalls.length) * 100).toFixed(1) : '0.0';
    return {
      totalRuns,
      balls: playerBalls.length,
      fours,
      sixes,
      strikeRate: sr,
      solidPct: playerBalls.length > 0 ? Math.round((solid / playerBalls.length) * 100) : 0,
      outcomeCounts,
    };
  }, [playerBalls]);

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      {!activeStation && (
        <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <UiDatePicker value={day.practiceDate} onChange={onChangeDate} />
            <button type="button" onClick={onRefresh} className="ui-btn-secondary">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {!isViewer && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLateModal(true)}
                className="ui-btn-secondary"
              >
                <Plus className="h-4 w-4" />
                <span>Add Late Player</span>
              </button>
              <button type="button" onClick={onGoToSetup} className="ui-btn-primary">
                <Plus className="h-4 w-4" />
                <span>Add Stations</span>
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
                        onClick={() => handleOpenStation(st.id)}
                        className="ui-card group flex flex-col justify-between p-4 text-left transition-colors hover:border-[var(--accent-primary)]"
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

                        <div className="mt-4 flex w-full items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs font-semibold text-[var(--accent-primary)]">
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
            <div
              className={`no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 ${
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
                    onClick={() => {
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
                      selectedX={shotX}
                      selectedY={shotY}
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
                  <div className="overflow-hidden rounded-xl border border-[#1E3A8A]/30 shadow-xs">
                    <div className="flex items-center justify-between bg-[#0B1F4D] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      <span>Live Net Stats · Station {activeStation.stationNumber}</span>
                      <span className="tabular-nums text-[#FACC15]">
                        Next: Ball #{playerBalls.length + 1}
                      </span>
                    </div>

                    <div className="relative flex items-center justify-between gap-3 overflow-hidden border-b-2 border-[#FACC15] bg-gradient-to-r from-[#091E54] via-[#1D4ED8] to-[#0B3B8C] px-3.5 py-2.5 text-white">
                      {/* Crisp Sri Lanka Jersey Geometric Speed Stripes */}
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 400 72"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                      >
                        <polygon points="0,0 140,0 92,72 0,72" fill="#07163B" fillOpacity="0.45" />
                        <polygon points="175,0 245,0 197,72 127,72" fill="#38BDF8" fillOpacity="0.16" />
                        <polygon points="255,0 282,0 234,72 207,72" fill="#60A5FA" fillOpacity="0.14" />
                        <polygon points="295,0 400,0 400,72 247,72" fill="#07163B" fillOpacity="0.4" />
                        {/* Subtle Maroon & Gold Jersey Trim Accent */}
                        <polygon points="338,0 350,0 302,72 290,72" fill="#881337" fillOpacity="0.55" />
                        <polygon points="350,0 355,0 307,72 302,72" fill="#FACC15" fillOpacity="0.65" />
                      </svg>

                      <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                        <SlcLionCrest className="h-8 w-8 shrink-0 drop-shadow-sm" />
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-extrabold uppercase tracking-wide">
                            {activePlayer?.name}
                          </h3>
                          {activePlayer?.squads && activePlayer.squads.length > 0 && (
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FACC15]">
                              {activePlayer.squads.join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <PlayerAvatar
                        name={activePlayer?.name ?? 'Player'}
                        avatarUrl={activePlayer?.avatarUrl}
                        size="lg"
                        className="relative z-10 border-2 border-[#FACC15]/80 shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] bg-[var(--bg-elevated)] text-center sm:grid-cols-5">
                      <div className="py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
                          Runs
                        </p>
                        <p className="tabular-nums text-sm font-extrabold text-[var(--text-primary)]">
                          {batterStats.totalRuns}
                        </p>
                      </div>
                      <div className="py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
                          Balls
                        </p>
                        <p className="tabular-nums text-sm font-extrabold text-[var(--text-primary)]">
                          {batterStats.balls}
                        </p>
                      </div>
                      <div className="py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
                          S. Rate
                        </p>
                        <p className="tabular-nums text-sm font-extrabold text-[var(--text-primary)]">
                          {batterStats.strikeRate}
                        </p>
                      </div>
                      <div className="border-t border-[var(--border-subtle)] py-2 sm:border-t-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
                          4s / 6s
                        </p>
                        <p className="tabular-nums text-sm font-extrabold text-[var(--text-primary)]">
                          {batterStats.fours}/{batterStats.sixes}
                        </p>
                      </div>
                      <div className="col-span-2 border-t border-[var(--border-subtle)] py-2 sm:col-span-1 sm:border-t-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
                          Solid %
                        </p>
                        <p className="tabular-nums text-sm font-extrabold text-[var(--accent-primary)]">
                          {batterStats.solidPct}%
                        </p>
                      </div>
                    </div>

                    {/* All Contact Outcomes Breakdown */}
                    <div className="grid grid-cols-3 divide-x divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center sm:grid-cols-6 sm:divide-y-0">
                      {CONTACT_OUTCOMES.map((co) => {
                        const count = batterStats.outcomeCounts[co] ?? 0;
                        const pct =
                          batterStats.balls > 0
                            ? Math.round((count / batterStats.balls) * 100)
                            : 0;
                        const shortLabel =
                          co === 'Played and missed' ? 'Played & Miss' : co;
                        return (
                          <div key={co} className="px-1.5 py-1.5">
                            <p className="truncate text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                              {shortLabel}
                            </p>
                            <p className="tabular-nums text-xs font-extrabold text-[var(--text-primary)]">
                              {pct}%
                              <span className="ml-1 text-[10px] font-semibold text-[var(--text-muted)]">
                                ({count})
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

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
                            onClick={() => setBowlingStyle(bowlingStyle === bs ? undefined : bs)}
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
                          onClick={() => setShotType(shotType === sh ? undefined : sh)}
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
                            onClick={() => setRuns(selected ? undefined : r)}
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
                        const active = !autoSaveOnOutcome && contactOutcome === co;
                        return (
                          <button
                            key={co}
                            type="button"
                            disabled={!canScore}
                            onClick={() => {
                              onDismissTip('live-outcome');
                              handleOutcomeTap(co);
                            }}
                            className={`touch-target rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                              active
                                ? OUTCOME_ACTIVE[co]
                                : OUTCOME_STYLE[co] ??
                                  'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                            }`}
                          >
                            {co}
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
                      <div className="flex flex-wrap items-center gap-2">
                        {recentBalls.map((b) => {
                          const isBoundary = b.runs === '4' || b.runs === '6';
                          const isDot = !b.runs || b.runs === 'Dot';
                          return (
                            <div
                              key={b.id}
                              className="flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1 pr-2.5 pl-1 text-[11px]"
                            >
                              <span
                                className={`tabular-nums flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${
                                  b.runs === '6'
                                    ? 'bg-rose-600 text-white'
                                    : b.runs === '4'
                                      ? 'bg-amber-500 text-white'
                                      : isDot
                                        ? 'bg-slate-500/20 text-[var(--text-secondary)]'
                                        : 'bg-[#2563EB] text-white'
                                }`}
                              >
                                {b.runs === 'Dot' ? '0' : b.runs ?? '·'}
                              </span>
                              <div className="leading-tight">
                                <span className="font-bold text-[var(--text-primary)]">
                                  #{b.ballNumber} {b.contactOutcome}
                                </span>
                                {b.shotType && (
                                  <span className="ml-1 text-[10px] text-[var(--text-muted)]">
                                    · {b.shotType}
                                  </span>
                                )}
                                {isBoundary && (
                                  <span className="ml-1 text-[10px] font-bold text-amber-500">
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
                      onClick={() => onUndoLastBall(activeStation.id, activePlayerId)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSubmitLatePlayer}
            className="ui-card w-full max-w-md space-y-4 p-5 shadow-xl"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSubmitCompletion}
            className="ui-card w-full max-w-md space-y-4 p-5 shadow-xl"
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
