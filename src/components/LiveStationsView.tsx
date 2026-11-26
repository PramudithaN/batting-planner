import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Undo2,
  Unlock,
} from 'lucide-react';
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
}) => {
  const isViewer = currentCoach.role === 'viewer';
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateSelection, setLateSelection] = useState('');
  const [lateManualName, setLateManualName] = useState('');

  // Ball inputs (Bowling style stays sticky across balls per UX-04)
  const [bowlingStyle, setBowlingStyle] = useState<string | undefined>(undefined);
  const [line, setLine] = useState<string | undefined>(undefined);
  const [length, setLength] = useState<string | undefined>(undefined);
  const [shotType, setShotType] = useState<string | undefined>(undefined);
  const [shotX, setShotX] = useState<number | undefined>(undefined);
  const [shotY, setShotY] = useState<number | undefined>(undefined);
  const [runs, setRuns] = useState<string | undefined>(undefined);
  const [contactOutcome, setContactOutcome] = useState<string | undefined>(undefined);
  const [lastSavedText, setLastSavedText] = useState<string>('');

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
    setLastSavedText('');
    if (activeStationId && playerId && !isViewer) {
      onAcquireLock(activeStationId, playerId, false);
    }
  };

  const handleSaveBall = () => {
    if (!activeStation || !activePlayerId || !canScore || !contactOutcome) return;

    const parsed = ballInputSchema.safeParse({
      stationId: activeStation.id,
      playerId: activePlayerId,
      bowlingStyle,
      line,
      length,
      shotType,
      shotX,
      shotY,
      runs,
      contactOutcome,
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
      bowlingStyle,
      line,
      length,
      shotType,
      shotX,
      shotY,
      runs,
      contactOutcome,
      createdAt: new Date().toISOString(),
    };

    onLogBall(ball);
    setLastSavedText(
      `Last saved · Ball ${ball.ballNumber}: ${contactOutcome}${runs ? ` (${runs})` : ''}${
        shotType ? ` · ${shotType}` : ''
      }`
    );

    // Reset per-ball fields while keeping Bowling style sticky
    setLine(undefined);
    setLength(undefined);
    setShotType(undefined);
    setShotX(undefined);
    setShotY(undefined);
    setRuns(undefined);
    setContactOutcome(undefined);
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

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-[#475569]" />
          <input
            type="date"
            value={day.practiceDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className="touch-target rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={onRefresh}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm font-semibold text-[#0F294A] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {!isViewer && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLateModal(true)}
              className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-[#FFFFFF] px-3 py-1.5 text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF]"
            >
              <Plus className="h-4 w-4" />
              Add late player
            </button>
            <button
              type="button"
              onClick={onGoToSetup}
              className="touch-target rounded-lg bg-[#0F294A] px-3.5 py-1.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1E3A5F]"
            >
              Add stations to this day
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {day.stations.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 text-center">
          <p className="text-sm font-medium text-[#475569]">
            No published stations for this date.
          </p>
          <button
            type="button"
            onClick={onGoToSetup}
            className="touch-target mt-4 rounded-lg bg-[#0F294A] px-5 py-2.5 text-sm font-semibold text-[#FFFFFF]"
          >
            Go to day setup
          </button>
        </div>
      ) : !activeStation ? (
        /* Stations Overview */
        <div className="space-y-4">
          {day.sessions.map((sess) => {
            const sessStations = day.stations.filter((s) => s.sessionId === sess.id);
            if (sessStations.length === 0) return null;
            return (
              <div key={sess.id} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-[#0F294A]">
                    {sess.name} ({sess.startTime} - {sess.endTime})
                  </h3>
                  <span className="tabular-nums text-xs text-[#475569]">
                    {availablePlayers.length} available players
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {sessStations.map((st) => {
                    const completedCount = day.completions.filter(
                      (c) => c.stationId === st.id
                    ).length;
                    const stationLocks = day.locks.filter((l) => l.stationId === st.id);
                    return (
                      <div
                        key={st.id}
                        className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-[#0F294A]">
                              Station {st.stationNumber}
                            </span>
                            <span className="tabular-nums rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-semibold text-[#475569]">
                              {completedCount} completed
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            <span className="rounded bg-[#EFF6FF] px-2 py-0.5 font-semibold text-[#2563EB]">
                              {st.trainingType === 'Other'
                                ? st.customTrainingType
                                : st.trainingType}
                            </span>
                            <span className="rounded bg-[#F8FAFC] px-2 py-0.5 border border-[#E2E8F0] text-[#0F172A]">
                              {st.netType}
                            </span>
                            <span className="rounded bg-[#F8FAFC] px-2 py-0.5 border border-[#E2E8F0] text-[#0F172A]">
                              {st.ballType}
                            </span>
                            <span className="rounded bg-[#F8FAFC] px-2 py-0.5 border border-[#E2E8F0] text-[#0F172A]">
                              {st.bowlingType}
                            </span>
                          </div>
                          {st.focus && (
                            <p className="mt-2 text-xs text-[#475569]">Focus: {st.focus}</p>
                          )}
                          {stationLocks.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {stationLocks.map((lk) => (
                                <span
                                  key={`${lk.stationId}-${lk.playerId}`}
                                  className="inline-flex items-center gap-1 rounded bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#D97706]"
                                >
                                  <Lock className="h-3 w-3" />
                                  Active: {lk.coachName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenStation(st.id)}
                          className="touch-target mt-4 w-full rounded-lg bg-[#0F294A] px-4 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1E3A5F]"
                        >
                          Open station {st.stationNumber}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Station Detail / Ball-by-Ball Scoring */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3">
            <button
              type="button"
              onClick={() => setActiveStationId(null)}
              className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm font-semibold text-[#0F294A]"
            >
              <ArrowLeft className="h-4 w-4" />
              All stations
            </button>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <select
                value={activePlayerId}
                onChange={(e) => handleSelectPlayer(e.target.value)}
                className="touch-target min-w-[210px] rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-sm font-semibold text-[#0F294A]"
              >
                {availablePlayers.map((p) => {
                  const count = day.balls.filter(
                    (b) => b.stationId === activeStation.id && b.playerId === p.id && !b.isUndone
                  ).length;
                  const done = day.completions.some(
                    (c) => c.stationId === activeStation.id && c.playerId === p.id
                  );
                  const suffix = done ? ' · Completed' : count > 0 ? ` · ${count} balls` : '';
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {suffix}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Lock Warning Banner */}
          {isLockedByOther && activeLock && !completion && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D97706] bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-[#D97706]" />
                <span>
                  Read-only: <strong>{activeLock.coachName}</strong> is currently scoring{' '}
                  <strong>{activePlayer?.name}</strong>.
                </span>
              </div>
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => onAcquireLock(activeStation.id, activePlayerId, true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#D97706] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF]"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Take Over Control
                </button>
              )}
            </div>
          )}

          {/* Completed Read-Only Summary */}
          {completion ? (
            <div className="rounded-xl border border-[#16A34A] bg-[#F0FDF4] p-4">
              <div className="flex items-center gap-2 text-base font-bold text-[#166534]">
                <CheckCircle2 className="h-5 w-5" />
                Completed · {activePlayer?.name}
              </div>
              <p className="tabular-nums mt-1 text-sm text-[#15803D]">
                {playerBalls.length} balls · {completion.observingCoach} · {completion.rating}/10
              </p>
              {completion.remarks && (
                <p className="mt-2 text-sm text-[#0F172A]">Remarks: {completion.remarks}</p>
              )}
            </div>
          ) : (
            /* Ball-by-Ball Logging Card */
            <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#0F294A]">{activePlayer?.name}</h3>
                  <p className="tabular-nums text-xs text-[#475569]">
                    Station {activeStation.stationNumber} ({activeStation.netType}) ·{' '}
                    {playerBalls.length} logged
                  </p>
                </div>
                <span className="tabular-nums rounded-lg bg-[#0F294A] px-3 py-1 text-xs font-bold text-[#FFFFFF]">
                  Ball {playerBalls.length + 1}
                </span>
              </div>

              {/* 1. Bowling Style (Sticky) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#475569]">
                  Bowling style (optional, stays selected)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BOWLING_STYLES.map((bs) => (
                    <button
                      key={bs}
                      type="button"
                      disabled={!canScore}
                      onClick={() => setBowlingStyle(bowlingStyle === bs ? undefined : bs)}
                      className={`touch-target rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        bowlingStyle === bs
                          ? 'border-[#2563EB] bg-[#2563EB] text-[#FFFFFF]'
                          : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A]'
                      }`}
                    >
                      {bs}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2 & 3. Pitch Map + Line & Length */}
              <div className="grid gap-4 lg:grid-cols-2">
                <PitchMapSvg
                  selectedLine={line}
                  selectedLength={length}
                  onSelect={(ln, lg) => {
                    if (!canScore) return;
                    setLine(ln);
                    setLength(lg);
                  }}
                />
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#475569]">
                      Line (optional)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {LINES.map((ln) => (
                        <button
                          key={ln}
                          type="button"
                          disabled={!canScore}
                          onClick={() => setLine(line === ln ? undefined : ln)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                            line === ln
                              ? 'border-[#2563EB] bg-[#2563EB] text-[#FFFFFF]'
                              : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A]'
                          }`}
                        >
                          {ln}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#475569]">
                      Length (optional)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {LENGTHS.map((lg) => (
                        <button
                          key={lg}
                          type="button"
                          disabled={!canScore}
                          onClick={() => setLength(length === lg ? undefined : lg)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                            length === lg
                              ? 'border-[#2563EB] bg-[#2563EB] text-[#FFFFFF]'
                              : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A]'
                          }`}
                        >
                          {lg}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Grouped Shot Type */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#475569]">
                  Shot type (optional)
                </label>
                <div className="space-y-2">
                  {Object.entries(SHOT_CATEGORIES).map(([cat, shots]) => (
                    <div key={cat} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-24 shrink-0 text-[11px] font-bold text-[#475569]">
                        {cat}
                      </span>
                      {shots.map((sh) => (
                        <button
                          key={sh}
                          type="button"
                          disabled={!canScore}
                          onClick={() => setShotType(shotType === sh ? undefined : sh)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            shotType === sh
                              ? 'border-[#2563EB] bg-[#2563EB] text-[#FFFFFF]'
                              : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A]'
                          }`}
                        >
                          {sh}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* 5, 6, 7. Shot Location, Runs & Contact Outcome */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#475569]">
                      Shot location (optional)
                    </span>
                    {typeof shotX === 'number' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShotX(undefined);
                          setShotY(undefined);
                        }}
                        className="text-xs font-semibold text-[#DC2626]"
                      >
                        Clear mark
                      </button>
                    )}
                  </div>
                  <WagonWheelSvg
                    interactive={canScore}
                    selectedX={shotX}
                    selectedY={shotY}
                    onSelectPoint={(x, y) => {
                      setShotX(x);
                      setShotY(y);
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#475569]">
                      Runs (optional)
                    </label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {RUN_OPTIONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          disabled={!canScore}
                          onClick={() => setRuns(runs === r ? undefined : r)}
                          className={`touch-target tabular-nums rounded-lg border text-sm font-bold ${
                            runs === r
                              ? 'border-[#0F294A] bg-[#0F294A] text-[#FFFFFF]'
                              : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A]'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[#0F294A]">
                      Contact outcome (required)
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {CONTACT_OUTCOMES.map((co) => (
                        <button
                          key={co}
                          type="button"
                          disabled={!canScore}
                          onClick={() => setContactOutcome(co)}
                          className={`touch-target rounded-lg border px-3 py-2 text-xs font-semibold ${
                            contactOutcome === co
                              ? 'border-[#16A34A] bg-[#16A34A] text-[#FFFFFF]'
                              : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A]'
                          }`}
                        >
                          {co}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {lastSavedText && (
                <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#475569]">
                  {lastSavedText}
                </p>
              )}

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canScore || playerBalls.length === 0}
                    onClick={() => onUndoLastBall(activeStation.id, activePlayerId)}
                    className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626] px-3 py-2 text-xs font-semibold text-[#DC2626] disabled:opacity-40"
                  >
                    <Undo2 className="h-4 w-4" />
                    Undo last ball
                  </button>
                  <button
                    type="button"
                    disabled={!canScore}
                    onClick={() => setShowCompleteModal(true)}
                    className="touch-target rounded-lg border border-[#0F294A] px-3 py-2 text-xs font-semibold text-[#0F294A] disabled:opacity-40"
                  >
                    Completed
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!canScore || !contactOutcome}
                  onClick={handleSaveBall}
                  className="touch-target rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-bold text-[#FFFFFF] hover:bg-[#1D4ED8] disabled:opacity-40"
                >
                  Save & next ball
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Live Wagon Wheel */}
          <details className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
            <summary className="cursor-pointer text-sm font-bold text-[#0F294A]">
              Wagon wheel ·{' '}
              {
                playerBalls.filter(
                  (b) => typeof b.shotX === 'number' && typeof b.shotY === 'number'
                ).length
              }{' '}
              of {playerBalls.length} balls mapped
            </summary>
            <div className="mt-3">
              <WagonWheelSvg balls={playerBalls} />
            </div>
          </details>
        </div>
      )}

      {/* Add Late Player Modal */}
      {showLateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmitLatePlayer}
            className="w-full max-w-md space-y-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5"
          >
            <h3 className="text-base font-bold text-[#0F294A]">Add late player</h3>
            <select
              value={lateSelection}
              onChange={(e) => setLateSelection(e.target.value)}
              className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              <option value="">Select from pool...</option>
              {unselectedPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="__manual__">Add a name manually</option>
            </select>

            {lateSelection === '__manual__' && (
              <input
                type="text"
                value={lateManualName}
                onChange={(e) => setLateManualName(e.target.value)}
                placeholder="Player name"
                className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLateModal(false)}
                className="touch-target rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="touch-target rounded-lg bg-[#0F294A] px-4 py-2 text-sm font-semibold text-[#FFFFFF]"
              >
                Add to today's players
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Player Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmitCompletion}
            className="w-full max-w-md space-y-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5"
          >
            <div>
              <h3 className="text-base font-bold text-[#0F294A]">
                Complete {activePlayer?.name}
              </h3>
              <p className="tabular-nums text-xs text-[#475569]">
                {playerBalls.length} balls to save.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#475569]">
                Observing coach
              </label>
              <select
                value={observingCoach}
                onChange={(e) => setObservingCoach(e.target.value)}
                className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
              >
                {DEFAULT_COACHES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>

            {observingCoach === 'Other' && (
              <input
                type="text"
                value={customCoachName}
                onChange={(e) => setCustomCoachName(e.target.value)}
                placeholder="Coach name"
                className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
              />
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569]">
                Coach's rating out of 10
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    className={`tabular-nums rounded-lg border py-2 text-xs font-bold ${
                      rating === num
                        ? 'border-[#0F294A] bg-[#0F294A] text-[#FFFFFF]'
                        : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#475569]">
                Remarks (optional)
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] p-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="touch-target rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-semibold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="touch-target rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-semibold text-[#FFFFFF]"
              >
                Save completion
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
