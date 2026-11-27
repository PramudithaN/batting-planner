import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Edit3,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { PLAYER_POOL_SOURCES } from '../../domain/roster';
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
} from '../../domain/types';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';
import { UiConfirmModal } from '../../components/ui/UiConfirmModal';
import { UiDatePicker } from '../../components/ui/UiDatePicker';
import { UiGuideTip } from '../../components/ui/UiGuideTip';
import { UiSelect } from '../../components/ui/UiSelect';
import { UiTimePicker } from '../../components/ui/UiTimePicker';
import { hapticSuccess } from '../../lib/haptics';

interface DaySetupViewProps {
  day: PracticeDay;
  players: Player[];
  currentCoach: CoachAccount;
  onChangeDate: (date: string) => void;
  onAddPlayer: (name: string) => Player | null;
  onTogglePlayer: (playerId: string) => void;
  onSetAvailablePlayers: (playerIds: string[]) => void;
  onSaveSession: (session: SessionSlot) => void;
  onPublishStations: (stations: StationConfig[]) => void;
  onEditPublishedStation: (station: StationConfig) => void;
  onDeletePublishedStation: (stationId: string) => void;
  onGoToLive: () => void;
  onToast: (msg: string, type?: 'info' | 'error') => void;
  isTipVisible: (id: string) => boolean;
  onDismissTip: (id: string) => void;
  onDismissAllTips: () => void;
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

const STATION_PRESETS = [
  {
    label: 'Pace Net',
    trainingType: 'Random',
    netType: 'Outdoor net',
    ballType: 'White New Ball',
    bowlingType: 'National Bowlers',
  },
  {
    label: 'Spin Net',
    trainingType: 'Block',
    netType: 'Outdoor net',
    ballType: 'White Semi Ball',
    bowlingType: 'Net Bowlers',
  },
  {
    label: 'Center Wicket',
    trainingType: 'Situation',
    netType: 'Center wicket',
    ballType: 'Red New Ball',
    bowlingType: 'National Bowlers',
  },
] as const;

export const DaySetupView: React.FC<DaySetupViewProps> = ({
  day,
  players,
  currentCoach,
  onChangeDate,
  onAddPlayer,
  onTogglePlayer,
  onSetAvailablePlayers,
  onSaveSession,
  onPublishStations,
  onEditPublishedStation,
  onDeletePublishedStation,
  onGoToLive,
  onToast,
  isTipVisible,
  onDismissTip,
  onDismissAllTips,
}) => {
  const isViewer = currentCoach.role === 'viewer';
  const [section, setSection] = useState<'players' | 'stations'>('players');
  const [search, setSearch] = useState('');
  const [customPlayerName, setCustomPlayerName] = useState('');
  const [showAddPlayerInput, setShowAddPlayerInput] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('10:45');
  const [newSessionEnd, setNewSessionEnd] = useState('12:00');
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [pendingDeleteStation, setPendingDeleteStation] = useState<StationConfig | null>(null);

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

  const handleQuickSquad = (squad: string) => {
    if (isViewer) return;
    if (squad === 'CLEAR') {
      onSetAvailablePlayers([]);
      return;
    }
    if (squad === 'ALL') {
      onSetAvailablePlayers(players.map((p) => p.id));
      return;
    }
    const matching = players.filter((p) => p.squads.includes(squad)).map((p) => p.id);
    const merged = Array.from(new Set([...day.availablePlayerIds, ...matching]));
    onSetAvailablePlayers(merged);
    onToast(`Added ${squad} squad (${matching.length} players).`);
  };

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
      setShowAddPlayerInput(false);
      onToast(`${added.name} added to practice.`);
    }
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
    setShowAddSlot(false);
    onToast('Time slot added.');
  };

  const handleGoToStations = () => {
    if (day.availablePlayerIds.length === 0) {
      onToast('Select at least one player first.', 'error');
      return;
    }
    setSection('stations');
  };

  const handlePublish = () => {
    if (isViewer) return;
    if (day.availablePlayerIds.length === 0) {
      onToast('Select at least one available player first.', 'error');
      setSection('players');
      return;
    }
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

    hapticSuccess();
    onPublishStations(newStations);
    setDrafts([createDraft(1)]);
    onGoToLive();
  };

  const updateDraft = (key: string, patch: Partial<DraftStation>) => {
    setDrafts((prev) => prev.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Clean Header + Guided Step Switcher */}
      <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <UiDatePicker value={day.practiceDate} onChange={onChangeDate} />

          <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSection('players')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                section === 'players'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              1. Players & Schedule ({day.availablePlayerIds.length})
            </button>
            <button
              type="button"
              onClick={() => setSection('stations')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                section === 'stations'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              2. Net Stations ({day.stations.length})
            </button>
          </div>
        </div>

        {day.stations.length > 0 && (
          <button type="button" onClick={onGoToLive} className="ui-btn-primary">
            <span>Go to Live Nets ({day.stations.length})</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {section === 'players' ? (
        <div key="players-step" className="ui-view-enter space-y-4">
          {/* Compact Time Slots Card */}
          <div className="ui-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)]">
                  <Clock className="h-4 w-4 text-[var(--accent-primary)]" />
                  Time Slots:
                </span>
                {day.sessions.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)]"
                  >
                    <strong>{s.name}</strong> ·{' '}
                    <span className="tabular-nums text-[var(--text-muted)]">
                      {s.startTime}–{s.endTime}
                    </span>
                  </span>
                ))}
              </div>

              {!isViewer && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      onDismissTip('setup-slots');
                      setShowAddSlot((v) => !v);
                    }}
                    className={`ui-btn-secondary min-h-[34px] px-3 py-1 text-xs ${
                      isTipVisible('setup-slots') ? 'ring-2 ring-[#2563EB] ring-offset-2' : ''
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{showAddSlot ? 'Close' : 'Add Slot'}</span>
                  </button>
                  <UiGuideTip
                    visible={isTipVisible('setup-slots')}
                    title="1. Add Time Slots"
                    description="Click '+ Add Slot' here if you want to add morning/afternoon practice sessions."
                    position="bottom"
                    align="right"
                    onDismiss={() => onDismissTip('setup-slots')}
                    onDismissAll={onDismissAllTips}
                  />
                </div>
              )}
            </div>

            {showAddSlot && !isViewer && (
              <div className="mt-3 grid gap-2 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-12">
                <input
                  type="text"
                  placeholder="Slot name (e.g. Afternoon Spin)"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="ui-input sm:col-span-5"
                />
                <UiTimePicker
                  value={newSessionStart}
                  onChange={setNewSessionStart}
                  className="sm:col-span-3"
                />
                <UiTimePicker
                  value={newSessionEnd}
                  onChange={setNewSessionEnd}
                  className="sm:col-span-3"
                />
                <button
                  type="button"
                  onClick={handleAddSession}
                  className="ui-btn-primary sm:col-span-1"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Spacious Player Selection Card */}
          <div className="ui-card space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--accent-primary)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Select Available Players
                </h3>
                <span className="tabular-nums rounded-md bg-[var(--accent-primary)]/15 px-2 py-0.5 text-xs font-bold text-[var(--accent-primary)]">
                  {day.availablePlayerIds.length} selected
                </span>
              </div>

              {!isViewer && (
                <div className="relative flex flex-wrap items-center gap-1.5">
                  {(['ODI', 'T20I', 'Test', 'Sri Lanka A', 'ALL', 'CLEAR'] as const).map((sq) => (
                    <button
                      key={sq}
                      type="button"
                      onClick={() => {
                        onDismissTip('setup-players');
                        handleQuickSquad(sq);
                      }}
                      className={`${
                        sq === 'CLEAR'
                          ? 'ui-btn-danger min-h-[32px] px-2.5 py-1 text-xs'
                          : 'ui-btn-secondary min-h-[32px] px-2.5 py-1 text-xs'
                      } ${
                        !isTipVisible('setup-slots') && isTipVisible('setup-players') && sq === 'ODI'
                          ? 'ring-2 ring-[#2563EB] ring-offset-2'
                          : ''
                      }`}
                    >
                      {sq === 'ALL' ? 'All' : sq === 'CLEAR' ? 'Clear' : `+ ${sq}`}
                    </button>
                  ))}
                  <UiGuideTip
                    visible={!isTipVisible('setup-slots') && isTipVisible('setup-players')}
                    title="2. Select Players"
                    description="Tap a squad button (+ ODI, + T20I, + Test) or individual players below to mark who is available."
                    position="bottom"
                    align="right"
                    onDismiss={() => onDismissTip('setup-players')}
                    onDismissAll={onDismissAllTips}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search squad by name..."
                  className="ui-input pl-9"
                />
              </div>

              {!isViewer && !showAddPlayerInput && (
                <button
                  type="button"
                  onClick={() => setShowAddPlayerInput(true)}
                  className="ui-btn-secondary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Guest Player</span>
                </button>
              )}
            </div>

            {showAddPlayerInput && !isViewer && (
              <form
                onSubmit={handleAddCustomPlayer}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5"
              >
                <input
                  type="text"
                  value={customPlayerName}
                  onChange={(e) => setCustomPlayerName(e.target.value)}
                  placeholder="Enter player full name..."
                  className="ui-input flex-1"
                />
                <button type="submit" className="ui-btn-primary">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPlayerInput(false)}
                  className="ui-btn-secondary"
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3">
              {filteredPlayers.map((p) => {
                const checked = day.availablePlayerIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isViewer}
                    onClick={() => onTogglePlayer(p.id)}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                      checked
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                            : 'border-[var(--border-strong)] bg-[var(--bg-surface)]'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <PlayerAvatar name={p.name} avatarUrl={p.avatarUrl} size="sm" />
                      <span className="truncate font-semibold text-[var(--text-primary)]">
                        {p.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-[var(--text-muted)]">
                      {p.isCustom ? 'Added' : p.squads[0] ?? ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] pt-3 sm:flex-row sm:items-center sm:justify-between">
              <details className="text-[11px] text-[var(--text-muted)]">
                <summary className="cursor-pointer font-semibold text-[var(--text-secondary)]">
                  Squad pool sources
                </summary>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                  {PLAYER_POOL_SOURCES.map((src) => (
                    <li key={src}>{src}</li>
                  ))}
                </ul>
              </details>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    onDismissTip('setup-next-nets');
                    handleGoToStations();
                  }}
                  className={`ui-btn-primary w-full px-6 sm:w-auto ${
                    !isTipVisible('setup-slots') &&
                    !isTipVisible('setup-players') &&
                    isTipVisible('setup-next-nets')
                      ? 'ring-2 ring-[#2563EB] ring-offset-2'
                      : ''
                  }`}
                >
                  <span>Next: Configure Nets</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <UiGuideTip
                  visible={
                    !isTipVisible('setup-slots') &&
                    !isTipVisible('setup-players') &&
                    isTipVisible('setup-next-nets')
                  }
                  title="3. Continue to Nets"
                  description="Once your players are selected, click here to set up your practice net stations."
                  position="top"
                  align="right"
                  actionLabel="Got it"
                  onDismiss={() => onDismissTip('setup-next-nets')}
                  onDismissAll={onDismissAllTips}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 2: CLEAN NET STATIONS BUILDER */
        <div key="stations-step" className="ui-view-enter space-y-4">
          {day.stations.length > 0 && (
            <div className="ui-card p-4">
              <h3 className="mb-3 text-sm font-bold text-[var(--text-primary)]">
                Published Nets ({day.stations.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {day.stations.map((st) => {
                  const isEditing = editingStationId === st.id;
                  return (
                    <div key={st.id} className="ui-card-elevated p-3.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            Station {st.stationNumber}
                          </span>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {st.sessionName} · {st.startTime}–{st.endTime}
                          </p>
                        </div>
                        {!isViewer && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingStationId(isEditing ? null : st.id)}
                              className="ui-btn-secondary min-h-[30px] px-2 py-1"
                              title="Edit station"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteStation(st)}
                              className="ui-btn-danger min-h-[30px] px-2 py-1"
                              title="Delete station"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="rounded bg-[var(--accent-primary)]/15 px-2 py-0.5 font-semibold text-[var(--accent-primary)]">
                          {st.trainingType === 'Other' ? st.customTrainingType : st.trainingType}
                        </span>
                        <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                          {st.netType}
                        </span>
                        <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                          {st.ballType}
                        </span>
                        <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-medium text-[var(--text-secondary)]">
                          {st.bowlingType}
                        </span>
                      </div>

                      {isEditing && (
                        <div className="mt-3 grid gap-2 border-t border-[var(--border-subtle)] pt-3">
                          <UiSelect
                            size="sm"
                            value={st.netType}
                            onChange={(val) => onEditPublishedStation({ ...st, netType: val })}
                            options={NET_TYPES.map((n) => ({ value: n, label: n }))}
                          />
                          <UiSelect
                            size="sm"
                            value={st.ballType}
                            onChange={(val) => onEditPublishedStation({ ...st, ballType: val })}
                            options={BALL_TYPES.map((b) => ({ value: b, label: b }))}
                          />
                          <UiSelect
                            size="sm"
                            value={st.bowlingType}
                            onChange={(val) =>
                              onEditPublishedStation({ ...st, bowlingType: val })
                            }
                            options={BOWLING_TYPES.map((bw) => ({ value: bw, label: bw }))}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isViewer && (
            <div className="space-y-4">
              {drafts.map((d, idx) => (
                <div key={d.key} className="ui-card space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Configure Station {day.stations.length + idx + 1}
                    </h3>
                    <div className="relative flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                        Presets:
                      </span>
                      {STATION_PRESETS.map((preset, pIdx) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            onDismissTip('setup-presets');
                            updateDraft(d.key, {
                              trainingType: preset.trainingType,
                              netType: preset.netType,
                              ballType: preset.ballType,
                              bowlingType: preset.bowlingType,
                            });
                          }}
                          className={`ui-btn-secondary min-h-[30px] px-2.5 py-1 text-[11px] ${
                            idx === 0 && pIdx === 0 && isTipVisible('setup-presets')
                              ? 'ring-2 ring-[#2563EB] ring-offset-2'
                              : ''
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                      {idx === 0 && (
                        <UiGuideTip
                          visible={isTipVisible('setup-presets')}
                          title="4. Quick Station Presets"
                          description="Tap a preset here to auto-fill Training, Net, Ball, and Bowling type in 1 click."
                          position="bottom"
                          align="right"
                          onDismiss={() => onDismissTip('setup-presets')}
                          onDismissAll={onDismissAllTips}
                        />
                      )}
                      {drafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((prev) => prev.filter((x) => x.key !== d.key))
                          }
                          className="ui-link ml-2 text-rose-500"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Clean 2-Column Dropdown Form */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="ui-label">Time Slot</label>
                      <UiSelect
                        value={d.sessionId}
                        onChange={(val) => updateDraft(d.key, { sessionId: val })}
                        options={day.sessions.map((s) => ({
                          value: s.id,
                          label: `${s.name} (${s.startTime}–${s.endTime})`,
                        }))}
                      />
                    </div>

                    <div>
                      <label className="ui-label">Training Type</label>
                      <UiSelect
                        value={d.trainingType}
                        onChange={(val) => updateDraft(d.key, { trainingType: val })}
                        options={TRAINING_TYPES.map((t) => ({ value: t, label: t }))}
                      />
                    </div>

                    {d.trainingType === 'Other' && (
                      <div>
                        <label className="ui-label">Custom Training Type</label>
                        <input
                          type="text"
                          value={d.customTrainingType}
                          onChange={(e) =>
                            updateDraft(d.key, { customTrainingType: e.target.value })
                          }
                          placeholder="Specify training type"
                          className="ui-input"
                        />
                      </div>
                    )}

                    <div>
                      <label className="ui-label">Net / Surface</label>
                      <UiSelect
                        value={d.netType}
                        onChange={(val) => updateDraft(d.key, { netType: val })}
                        options={NET_TYPES.map((n) => ({ value: n, label: n }))}
                      />
                    </div>

                    <div>
                      <label className="ui-label">Ball Type</label>
                      <UiSelect
                        value={d.ballType}
                        onChange={(val) => updateDraft(d.key, { ballType: val })}
                        options={BALL_TYPES.map((b) => ({ value: b, label: b }))}
                      />
                    </div>

                    <div>
                      <label className="ui-label">Bowling Type</label>
                      <UiSelect
                        value={d.bowlingType}
                        onChange={(val) => updateDraft(d.key, { bowlingType: val })}
                        options={BOWLING_TYPES.map((bw) => ({ value: bw, label: bw }))}
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="ui-label">Specific Focus (Optional)</label>
                      <input
                        type="text"
                        value={d.focus}
                        onChange={(e) => updateDraft(d.key, { focus: e.target.value })}
                        placeholder="e.g. Sweep against spin, Leaving outside off"
                        className="ui-input"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSection('players')}
                    className="ui-btn-secondary flex-1 sm:flex-none"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Players</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => [...prev, createDraft(prev.length + 1)])}
                    className="ui-btn-secondary flex-1 sm:flex-none"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Another Station</span>
                  </button>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      onDismissTip('setup-publish');
                      handlePublish();
                    }}
                    className={`ui-btn-primary w-full px-6 sm:w-auto ${
                      !isTipVisible('setup-presets') && isTipVisible('setup-publish')
                        ? 'ring-2 ring-[#2563EB] ring-offset-2'
                        : ''
                    }`}
                  >
                    <span>
                      {day.stations.length > 0 ? 'Publish & Go Live' : 'Publish to Live Nets'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <UiGuideTip
                    visible={!isTipVisible('setup-presets') && isTipVisible('setup-publish')}
                    title="5. Publish to Live Nets"
                    description="Click here to publish your stations and jump straight to live ball-by-ball scoring."
                    position="top"
                    align="right"
                    actionLabel="Got it"
                    onDismiss={() => onDismissTip('setup-publish')}
                    onDismissAll={onDismissAllTips}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <UiConfirmModal
        open={Boolean(pendingDeleteStation)}
        title={
          pendingDeleteStation
            ? `Delete Station ${pendingDeleteStation.stationNumber}?`
            : 'Delete Station?'
        }
        description="Are you sure you want to remove this station from today's practice plan? This action cannot be undone."
        confirmLabel="Delete Station"
        onCancel={() => setPendingDeleteStation(null)}
        onConfirm={() => {
          if (pendingDeleteStation) {
            onDeletePublishedStation(pendingDeleteStation.id);
            setPendingDeleteStation(null);
          }
        }}
      />
    </div>
  );
};
