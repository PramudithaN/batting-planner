import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Edit3, Plus, Search, Trash2, Users } from 'lucide-react';
import { PLAYER_POOL_SOURCES } from '../domain/roster';
import {
  BALL_TYPES,
  BOWLING_TYPES,
  NET_TYPES,
  TRAINING_TYPES,
  type CoachAccount,
  type Player,
  type PracticeDay,
  type SessionSlot,
  type StationConfig,
} from '../domain/types';

interface DaySetupViewProps {
  day: PracticeDay;
  players: Player[];
  currentCoach: CoachAccount;
  onChangeDate: (date: string) => void;
  onAddPlayer: (name: string) => Player | null;
  onTogglePlayer: (playerId: string) => void;
  onSaveSession: (session: SessionSlot) => void;
  onPublishStations: (stations: StationConfig[]) => void;
  onEditPublishedStation: (station: StationConfig) => void;
  onDeletePublishedStation: (stationId: string) => void;
  onGoToLive: () => void;
  onToast: (msg: string, type?: 'info' | 'error') => void;
}

interface DraftStation {
  key: string;
  sessionId: string;
  trainingType: string;
  customTrainingType: string;
  netType: string;
  ballType: string;
  bowlingType: string;
  focus: string;
}

export const DaySetupView: React.FC<DaySetupViewProps> = ({
  day,
  players,
  currentCoach,
  onChangeDate,
  onAddPlayer,
  onTogglePlayer,
  onSaveSession,
  onPublishStations,
  onEditPublishedStation,
  onDeletePublishedStation,
  onGoToLive,
  onToast,
}) => {
  const isViewer = currentCoach.role === 'viewer';
  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [customPlayerName, setCustomPlayerName] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('10:45');
  const [newSessionEnd, setNewSessionEnd] = useState('12:00');
  const [editingStationId, setEditingStationId] = useState<string | null>(null);

  const createDraft = (idx: number): DraftStation => ({
    key: `draft-${Date.now()}-${idx}`,
    sessionId: day.sessions[0]?.id ?? 'session-1',
    trainingType: 'Block',
    customTrainingType: '',
    netType: 'Outdoor net',
    ballType: 'White New Ball',
    bowlingType: 'National Bowlers',
    focus: '',
  });

  const [drafts, setDrafts] = useState<DraftStation[]>(() => [createDraft(1)]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [players, search]);

  const handleAddCustomPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    const trimmed = customPlayerName.trim();
    if (!trimmed) {
      onToast('Enter a player name first.', 'error');
      return;
    }
    const added = onAddPlayer(trimmed);
    if (added) {
      setCustomPlayerName('');
      onToast(`${added.name} selected for practice.`);
    }
  };

  const handleContinue = () => {
    if (day.availablePlayerIds.length === 0) {
      onToast('Select at least one available player.', 'error');
      return;
    }
    setStep(2);
  };

  const handleAddSession = () => {
    if (isViewer || !newSessionName.trim()) return;
    onSaveSession({
      id: `session-${Date.now()}`,
      name: newSessionName.trim(),
      startTime: newSessionStart,
      endTime: newSessionEnd,
      version: 1,
    });
    setNewSessionName('');
    onToast('Time-slotted session added.');
  };

  const handlePublish = () => {
    if (isViewer) return;
    for (const d of drafts) {
      if (d.trainingType === 'Other' && !d.customTrainingType.trim()) {
        onToast('Enter a custom training type when "Other" is selected.', 'error');
        return;
      }
    }

    const baseNum = day.stations.length;
    const nowIso = new Date().toISOString();
    const newStations: StationConfig[] = drafts.map((d, idx) => {
      const sess = day.sessions.find((s) => s.id === d.sessionId) ?? day.sessions[0];
      return {
        id: `st-${Date.now()}-${idx}`,
        stationNumber: baseNum + idx + 1,
        sessionId: sess?.id ?? 'session-1',
        sessionName: sess?.name ?? 'Session 1',
        startTime: sess?.startTime ?? '09:00',
        endTime: sess?.endTime ?? '10:30',
        trainingType: d.trainingType,
        customTrainingType: d.trainingType === 'Other' ? d.customTrainingType.trim() : undefined,
        netType: d.netType,
        ballType: d.ballType,
        bowlingType: d.bowlingType,
        focus: d.focus.trim() || undefined,
        version: 1,
        updatedBy: currentCoach.name,
        updatedAt: nowIso,
      };
    });

    onPublishStations(newStations);
    setDrafts([createDraft(1)]);
    setStep(1);
    onGoToLive();
  };

  if (step === 1) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
              Step 1 of 2
            </p>
            <h2 className="text-lg font-bold text-[#0F294A]">Plan batting practice</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
              <Calendar className="h-4 w-4 text-[#475569]" />
              <input
                type="date"
                value={day.practiceDate}
                onChange={(e) => onChangeDate(e.target.value)}
                className="touch-target rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-sm"
              />
            </label>
          </div>
        </div>

        {/* Time-Slotted Sessions */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0F294A]">
            <Clock className="h-4 w-4 text-[#2563EB]" />
            <span>Practice Time Slots</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {day.sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm"
              >
                <span className="font-semibold text-[#0F294A]">{s.name}</span>
                <span className="tabular-nums text-xs font-medium text-[#475569]">
                  {s.startTime} - {s.endTime}
                </span>
              </div>
            ))}
          </div>

          {!isViewer && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#E2E8F0] pt-3">
              <input
                type="text"
                placeholder="New slot name (e.g. Spin Session)"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="touch-target min-w-[200px] flex-1 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm"
              />
              <input
                type="time"
                value={newSessionStart}
                onChange={(e) => setNewSessionStart(e.target.value)}
                className="touch-target tabular-nums rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-sm"
              />
              <input
                type="time"
                value={newSessionEnd}
                onChange={(e) => setNewSessionEnd(e.target.value)}
                className="touch-target tabular-nums rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={handleAddSession}
                className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-[#FFFFFF] px-3 py-1.5 text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF]"
              >
                <Plus className="h-4 w-4" />
                Add time slot
              </button>
            </div>
          )}
        </div>

        {/* Available Players */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#2563EB]" />
              <h3 className="text-sm font-bold text-[#0F294A]">Available players</h3>
            </div>
            <span className="tabular-nums rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-bold text-[#2563EB]">
              {day.availablePlayerIds.length} selected
            </span>
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#475569]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the player pool"
                className="touch-target w-full rounded-lg border border-[#E2E8F0] py-2 pr-3 pl-9 text-sm"
              />
            </div>

            {!isViewer && (
              <form onSubmit={handleAddCustomPlayer} className="flex gap-2">
                <input
                  type="text"
                  value={customPlayerName}
                  onChange={(e) => setCustomPlayerName(e.target.value)}
                  placeholder="Additional player name"
                  className="touch-target flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="touch-target rounded-lg border border-[#0F294A] bg-[#0F294A] px-4 py-2 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1E3A5F]"
                >
                  Add player
                </button>
              </form>
            )}
          </div>

          <div className="grid max-h-[340px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlayers.map((p) => {
              const checked = day.availablePlayerIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    checked
                      ? 'border-[#2563EB] bg-[#EFF6FF]'
                      : 'border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      disabled={isViewer}
                      checked={checked}
                      onChange={() => onTogglePlayer(p.id)}
                      className="h-4 w-4 accent-[#2563EB]"
                    />
                    <span className="font-medium text-[#0F172A]">{p.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.isCustom && (
                      <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#D97706]">
                        Added
                      </span>
                    )}
                    {p.squads.map((sq) => (
                      <span
                        key={sq}
                        className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]"
                      >
                        {sq}
                      </span>
                    ))}
                  </div>
                </label>
              );
            })}
          </div>

          <details className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#475569]">
            <summary className="cursor-pointer font-semibold text-[#0F294A]">
              Player pool sources
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {PLAYER_POOL_SOURCES.map((src) => (
                <li key={src}>{src}</li>
              ))}
            </ul>
          </details>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isViewer}
            onClick={handleContinue}
            className="touch-target rounded-lg bg-[#0F294A] px-6 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1E3A5F] disabled:opacity-50"
          >
            Continue to stations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
            Step 2 of 2
          </p>
          <h2 className="text-lg font-bold text-[#0F294A]">
            {day.stations.length > 0 ? 'Add to the day plan' : 'Create stations'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="touch-target rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#0F294A] hover:bg-[#F8FAFC]"
        >
          Back to day setup
        </button>
      </div>

      {/* Published stations summary with inline edit */}
      {day.stations.length > 0 && (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
          <h3 className="mb-3 text-sm font-bold text-[#0F294A]">
            Published stations ({day.stations.length})
          </h3>
          <div className="space-y-2">
            {day.stations.map((st) => {
              const isEditing = editingStationId === st.id;
              return (
                <div
                  key={st.id}
                  className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#0F294A]">
                        Station {st.stationNumber}
                      </span>{' '}
                      <span className="text-xs text-[#475569]">
                        ({st.sessionName} · {st.startTime}-{st.endTime})
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded bg-[#FFFFFF] px-2 py-0.5 font-medium text-[#0F172A] border border-[#E2E8F0]">
                          {st.trainingType === 'Other' ? st.customTrainingType : st.trainingType}
                        </span>
                        <span className="rounded bg-[#FFFFFF] px-2 py-0.5 font-medium text-[#0F172A] border border-[#E2E8F0]">
                          {st.netType}
                        </span>
                        <span className="rounded bg-[#FFFFFF] px-2 py-0.5 font-medium text-[#0F172A] border border-[#E2E8F0]">
                          {st.ballType}
                        </span>
                        <span className="rounded bg-[#FFFFFF] px-2 py-0.5 font-medium text-[#0F172A] border border-[#E2E8F0]">
                          {st.bowlingType}
                        </span>
                      </div>
                    </div>
                    {!isViewer && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStationId(isEditing ? null : st.id)}
                          className="inline-flex items-center gap-1 rounded border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-1 text-xs font-semibold text-[#0F294A]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {isEditing ? 'Close' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePublishedStation(st.id)}
                          className="inline-flex items-center gap-1 rounded border border-[#DC2626] bg-[#FFFFFF] px-2.5 py-1 text-xs font-semibold text-[#DC2626]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-3 grid gap-2 border-t border-[#E2E8F0] pt-3 sm:grid-cols-3">
                      <select
                        value={st.netType}
                        onChange={(e) =>
                          onEditPublishedStation({ ...st, netType: e.target.value })
                        }
                        className="rounded border border-[#E2E8F0] bg-[#FFFFFF] px-2 py-1.5 text-xs"
                      >
                        {NET_TYPES.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <select
                        value={st.ballType}
                        onChange={(e) =>
                          onEditPublishedStation({ ...st, ballType: e.target.value })
                        }
                        className="rounded border border-[#E2E8F0] bg-[#FFFFFF] px-2 py-1.5 text-xs"
                      >
                        {BALL_TYPES.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      <select
                        value={st.bowlingType}
                        onChange={(e) =>
                          onEditPublishedStation({ ...st, bowlingType: e.target.value })
                        }
                        className="rounded border border-[#E2E8F0] bg-[#FFFFFF] px-2 py-1.5 text-xs"
                      >
                        {BOWLING_TYPES.map((bw) => (
                          <option key={bw} value={bw}>
                            {bw}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Station Builder Cards */}
      <div className="space-y-4">
        {drafts.map((d, idx) => (
          <div
            key={d.key}
            className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F294A]">
                Station {day.stations.length + idx + 1}
              </h3>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                  className="text-xs font-semibold text-[#DC2626] hover:underline"
                >
                  Remove station
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#475569]">
                  Session & Time Slot
                </label>
                <select
                  value={d.sessionId}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((x) => (x.key === d.key ? { ...x, sessionId: e.target.value } : x))
                    )
                  }
                  className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                >
                  {day.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#475569]">
                  Training type
                </label>
                <select
                  value={d.trainingType}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((x) =>
                        x.key === d.key ? { ...x, trainingType: e.target.value } : x
                      )
                    )
                  }
                  className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                >
                  {TRAINING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {d.trainingType === 'Other' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#475569]">
                    Custom training type
                  </label>
                  <input
                    type="text"
                    value={d.customTrainingType}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((x) =>
                          x.key === d.key ? { ...x, customTrainingType: e.target.value } : x
                        )
                      )
                    }
                    placeholder="Specify training type"
                    className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#475569]">
                  Net type
                </label>
                <select
                  value={d.netType}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((x) => (x.key === d.key ? { ...x, netType: e.target.value } : x))
                    )
                  }
                  className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                >
                  {NET_TYPES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#475569]">
                  Ball type
                </label>
                <select
                  value={d.ballType}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((x) => (x.key === d.key ? { ...x, ballType: e.target.value } : x))
                    )
                  }
                  className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                >
                  {BALL_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#475569]">
                  Bowling type
                </label>
                <select
                  value={d.bowlingType}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((x) =>
                        x.key === d.key ? { ...x, bowlingType: e.target.value } : x
                      )
                    )
                  }
                  className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                >
                  {BOWLING_TYPES.map((bw) => (
                    <option key={bw} value={bw}>
                      {bw}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-[#475569]">
                  Specific shot or focus (optional)
                </label>
                <input
                  type="text"
                  value={d.focus}
                  onChange={(e) =>
                    setDrafts((prev) =>
                      prev.map((x) => (x.key === d.key ? { ...x, focus: e.target.value } : x))
                    )
                  }
                  placeholder="e.g. Sweep against spin"
                  className="touch-target w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setDrafts((prev) => [...prev, createDraft(prev.length + 1)])}
          className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF]"
        >
          <Plus className="h-4 w-4" />
          Add station
        </button>

        <button
          type="button"
          onClick={handlePublish}
          className="touch-target rounded-lg bg-[#0F294A] px-6 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1E3A5F]"
        >
          {day.stations.length > 0 ? 'Publish added stations' : 'Publish to live stations'}
        </button>
      </div>
    </div>
  );
};
