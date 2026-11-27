import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart2,
  ChevronDown,
  Download,
  RefreshCw,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  BOWLING_STYLES,
  CONTACT_OUTCOMES,
  type CoachAccount,
  type Player,
  type PracticeDay,
} from '../domain/types';
import { exportDayExcel, exportPlayerHistoryExcel } from '../lib/excelExport';
import { loadAllDays } from '../store/plannerStore';
import { SlcLionCrest } from './SlcLionCrest';
import { PlayerAvatar } from './ui/PlayerAvatar';
import { UiConfirmModal } from './ui/UiConfirmModal';
import { UiDatePicker } from './ui/UiDatePicker';
import { UiGuideTip } from './ui/UiGuideTip';
import { SlcLoader, SlcTopProgressBar } from './ui/SlcLoader';
import { UiSelect } from './ui/UiSelect';
import { WagonWheelSvg } from './WagonWheelSvg';

interface ReportsViewProps {
  day: PracticeDay;
  players: Player[];
  currentCoach: CoachAccount;
  onChangeDate: (date: string) => void;
  onRefresh: () => void;
  onClearHistory: () => void;
  onToast: (msg: string, type?: 'info' | 'error') => void;
  isTipVisible: (id: string) => boolean;
  onDismissTip: (id: string) => void;
  onDismissAllTips: () => void;
}

const OUTCOME_BAR_COLOR: Record<string, string> = {
  Solid: '#2563EB',
  'Not middled': '#F59E0B',
  'Played and missed': '#64748B',
  Beaten: '#EF4444',
  Edged: '#F97316',
  Left: '#0EA5E9',
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  day,
  players,
  currentCoach,
  onChangeDate,
  onRefresh,
  onClearHistory,
  onToast,
  isTipVisible,
  onDismissTip,
  onDismissAllTips,
}) => {
  const [filterStationId, setFilterStationId] = useState('all');
  const [filterPlayerId, setFilterPlayerId] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [reportStance, setReportStance] = useState<'RHB' | 'LHB'>('RHB');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  useEffect(() => {
    if (filterPlayerId === 'all') {
      setReportStance('RHB');
    } else {
      const player = players.find((p) => p.id === filterPlayerId);
      setReportStance(player?.battingHand ?? 'RHB');
    }
  }, [filterPlayerId, players]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<'day' | 'player' | null>(null);

  const handleExportDay = async () => {
    setIsExporting('day');
    try {
      await exportDayExcel(day, players);
      onToast('Day report downloaded.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPlayer = async () => {
    setIsExporting('player');
    try {
      await exportPlayerHistoryExcel(loadAllDays(), players);
      onToast('Player history report downloaded.');
    } finally {
      setIsExporting(null);
    }
  };

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);
  const playerAvatarMap = useMemo(
    () => new Map(players.map((p) => [p.id, p.avatarUrl])),
    [players]
  );
  const activeBalls = useMemo(() => day.balls.filter((b) => !b.isUndone), [day.balls]);

  const filteredBalls = useMemo(
    () =>
      activeBalls.filter((b) => {
        if (filterStationId !== 'all' && b.stationId !== filterStationId) return false;
        if (filterPlayerId !== 'all' && b.playerId !== filterPlayerId) return false;
        if (filterStyle === 'Unrecorded') {
          if (b.bowlingStyle) return false;
        } else if (filterStyle !== 'all' && b.bowlingStyle !== filterStyle) {
          return false;
        }
        return true;
      }),
    [activeBalls, filterStationId, filterPlayerId, filterStyle]
  );

  const totalStats = useMemo(() => {
    let runs = 0;
    let fours = 0;
    let sixes = 0;
    let solid = 0;
    for (const b of filteredBalls) {
      const r = Number(b.runs);
      if (!Number.isNaN(r)) runs += r;
      if (b.runs === '4') fours++;
      if (b.runs === '6') sixes++;
      if (b.contactOutcome === 'Solid') solid++;
    }
    const balls = filteredBalls.length;
    const solidPct = balls > 0 ? Math.round((solid / balls) * 100) : 0;
    const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0';
    return { runs, fours, sixes, balls, solidPct, strikeRate };
  }, [filteredBalls]);

  // Chart 1: Contact Outcome Breakdown
  const outcomeBreakdown = useMemo(() => {
    const total = filteredBalls.length || 1;
    return CONTACT_OUTCOMES.map((co) => {
      const count = filteredBalls.filter((b) => b.contactOutcome === co).length;
      return {
        label: co,
        count,
        pct: Math.round((count / total) * 100),
        color: OUTCOME_BAR_COLOR[co] ?? '#64748B',
      };
    });
  }, [filteredBalls]);

  // Chart 2: Performance vs Bowling Style
  const bowlingStyleBreakdown = useMemo(() => {
    const styles = [...BOWLING_STYLES, 'Unrecorded'] as const;
    return styles
      .map((style) => {
        const balls = filteredBalls.filter((b) =>
          style === 'Unrecorded' ? !b.bowlingStyle : b.bowlingStyle === style
        );
        const solid = balls.filter((b) => b.contactOutcome === 'Solid').length;
        const runs = balls.reduce((sum, b) => {
          const n = Number(b.runs);
          return sum + (Number.isNaN(n) ? 0 : n);
        }, 0);
        return {
          style,
          balls: balls.length,
          runs,
          solidPct: balls.length > 0 ? Math.round((solid / balls.length) * 100) : 0,
        };
      })
      .filter((x) => x.balls > 0);
  }, [filteredBalls]);

  // Chart 3: Top Shot Types
  const topShotsBreakdown = useMemo(() => {
    const counts = new Map<string, { balls: number; solid: number; runs: number }>();
    for (const b of filteredBalls) {
      if (!b.shotType) continue;
      const prev = counts.get(b.shotType) ?? { balls: 0, solid: 0, runs: 0 };
      const r = Number(b.runs);
      counts.set(b.shotType, {
        balls: prev.balls + 1,
        solid: prev.solid + (b.contactOutcome === 'Solid' ? 1 : 0),
        runs: prev.runs + (Number.isNaN(r) ? 0 : r),
      });
    }
    return Array.from(counts.entries())
      .map(([shot, d]) => ({
        shot,
        balls: d.balls,
        runs: d.runs,
        solidPct: Math.round((d.solid / d.balls) * 100),
      }))
      .sort((a, b) => b.balls - a.balls)
      .slice(0, 6);
  }, [filteredBalls]);

  // Scorecard Rows (Completed + Active)
  const scorecardRows = useMemo(() => {
    const rows: Array<{
      key: string;
      playerId: string;
      playerName: string;
      stationId: string;
      stationLabel: string;
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      strikeRate: string;
      solidPct: number;
      rating?: number;
      coach?: string;
      remarks?: string;
      isCompleted: boolean;
    }> = [];

    const seenKeys = new Set<string>();

    for (const c of day.completions) {
      const key = `${c.stationId}::${c.playerId}`;
      seenKeys.add(key);
      const st = day.stations.find((s) => s.id === c.stationId);
      const balls = activeBalls.filter(
        (b) => b.stationId === c.stationId && b.playerId === c.playerId
      );
      let rSum = 0;
      let fours = 0;
      let sixes = 0;
      let solid = 0;
      for (const b of balls) {
        const n = Number(b.runs);
        if (!Number.isNaN(n)) rSum += n;
        if (b.runs === '4') fours++;
        if (b.runs === '6') sixes++;
        if (b.contactOutcome === 'Solid') solid++;
      }
      rows.push({
        key,
        playerId: c.playerId,
        playerName: playerMap.get(c.playerId) ?? c.playerId,
        stationId: c.stationId,
        stationLabel: st ? `Station ${st.stationNumber} · ${st.netType}` : 'Removed Station',
        runs: rSum,
        balls: balls.length,
        fours,
        sixes,
        strikeRate: balls.length > 0 ? ((rSum / balls.length) * 100).toFixed(1) : '0.0',
        solidPct: balls.length > 0 ? Math.round((solid / balls.length) * 100) : 0,
        rating: c.rating,
        coach: c.observingCoach,
        remarks: c.remarks,
        isCompleted: true,
      });
    }

    for (const b of activeBalls) {
      const key = `${b.stationId}::${b.playerId}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const st = day.stations.find((s) => s.id === b.stationId);
      const balls = activeBalls.filter(
        (x) => x.stationId === b.stationId && x.playerId === b.playerId
      );
      let rSum = 0;
      let fours = 0;
      let sixes = 0;
      let solid = 0;
      for (const x of balls) {
        const n = Number(x.runs);
        if (!Number.isNaN(n)) rSum += n;
        if (x.runs === '4') fours++;
        if (x.runs === '6') sixes++;
        if (x.contactOutcome === 'Solid') solid++;
      }
      rows.push({
        key,
        playerId: b.playerId,
        playerName: playerMap.get(b.playerId) ?? b.playerId,
        stationId: b.stationId,
        stationLabel: st ? `Station ${st.stationNumber} · ${st.netType}` : 'Removed Station',
        runs: rSum,
        balls: balls.length,
        fours,
        sixes,
        strikeRate: balls.length > 0 ? ((rSum / balls.length) * 100).toFixed(1) : '0.0',
        solidPct: balls.length > 0 ? Math.round((solid / balls.length) * 100) : 0,
        coach: b.coachName,
        isCompleted: false,
      });
    }

    return rows;
  }, [day.completions, day.stations, activeBalls, playerMap]);

  // Station Summary Table
  const stationSummaryRows = useMemo(() => {
    return day.stations.map((st) => {
      const balls = activeBalls.filter((b) => b.stationId === st.id);
      const solid = balls.filter((b) => b.contactOutcome === 'Solid').length;
      const runs = balls.reduce((sum, b) => {
        const n = Number(b.runs);
        return sum + (Number.isNaN(n) ? 0 : n);
      }, 0);
      const completed = day.completions.filter((c) => c.stationId === st.id).length;
      return {
        id: st.id,
        number: st.stationNumber,
        netType: st.netType,
        trainingType: st.trainingType === 'Other' ? st.customTrainingType : st.trainingType,
        balls: balls.length,
        runs,
        solidPct: balls.length > 0 ? Math.round((solid / balls.length) * 100) : 0,
        completed,
      };
    });
  }, [day.stations, day.completions, activeBalls]);

  const handleClear = () => {
    if (currentCoach.role !== 'master') return;
    setConfirmClearOpen(true);
  };

  return (
    <div className="space-y-4">
      <SlcTopProgressBar active={Boolean(isExporting)} />

      {/* Top Controls & Report Downloads */}
      <div className="ui-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <UiDatePicker value={day.practiceDate} onChange={onChangeDate} />
          <button type="button" onClick={onRefresh} className="ui-btn-secondary">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="relative flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(isExporting)}
            onClick={() => {
              onDismissTip('reports-dashboard');
              handleExportDay();
            }}
            className={`ui-btn-primary ${
              isTipVisible('reports-dashboard') ? 'ring-2 ring-[#2563EB] ring-offset-2' : ''
            }`}
          >
            {isExporting === 'day' ? (
              <SlcLoader size="sm" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isExporting === 'day' ? 'Generating...' : 'Download Day Report (.xlsx)'}</span>
          </button>
          <button
            type="button"
            disabled={Boolean(isExporting)}
            onClick={handleExportPlayer}
            className="ui-btn-secondary"
          >
            {isExporting === 'player' ? (
              <SlcLoader size="sm" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>
              {isExporting === 'player' ? 'Generating...' : 'Download Player History (.xlsx)'}
            </span>
          </button>
          <UiGuideTip
            visible={isTipVisible('reports-dashboard')}
            title="Download Reports Anytime"
            description="Export formatted Excel (.xlsx) reports here, or explore the live charts, 3D Wagon Wheel, and Scorecard below."
            position="bottom"
            align="right"
            actionLabel="Got it"
            onDismiss={() => onDismissTip('reports-dashboard')}
            onDismissAll={onDismissAllTips}
          />
        </div>
      </div>

      {/* Dashboard Filters */}
      {day.stations.length > 0 && (
        <div className="ui-card grid gap-2.5 p-3 sm:grid-cols-3">
          <UiSelect
            size="sm"
            value={filterStationId}
            onChange={setFilterStationId}
            options={[
              { value: 'all', label: 'All stations' },
              ...day.stations.map((s) => ({
                value: s.id,
                label: `Station ${s.stationNumber} (${s.netType})`,
              })),
            ]}
          />
          <UiSelect
            size="sm"
            value={filterPlayerId}
            onChange={setFilterPlayerId}
            options={[
              { value: 'all', label: 'All players' },
              ...day.availablePlayerIds.map((pid) => ({
                value: pid,
                label: playerMap.get(pid) ?? pid,
              })),
            ]}
          />
          <UiSelect
            size="sm"
            value={filterStyle}
            onChange={setFilterStyle}
            options={[
              { value: 'all', label: 'All bowling styles' },
              ...BOWLING_STYLES.map((bs) => ({ value: bs, label: bs })),
              { value: 'Unrecorded', label: 'Unrecorded' },
            ]}
          />
        </div>
      )}

      {/* Live KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="ui-card p-4">
          <div className="flex items-center justify-between">
            <p className="ui-label mb-0">Total Balls</p>
            <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
          </div>
          <p className="tabular-nums mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {totalStats.balls}
          </p>
          <p className="tabular-nums mt-1 text-xs text-[var(--text-muted)]">
            {totalStats.runs} runs · SR {totalStats.strikeRate}
          </p>
        </div>

        <div className="ui-card p-4">
          <div className="flex items-center justify-between">
            <p className="ui-label mb-0">Solid Contact %</p>
            <Target className="h-4 w-4 text-[var(--accent-primary)]" />
          </div>
          <p className="tabular-nums mt-2 text-2xl font-bold text-[var(--accent-primary)]">
            {totalStats.solidPct}%
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
              style={{ width: `${totalStats.solidPct}%` }}
            />
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="flex items-center justify-between">
            <p className="ui-label mb-0">Boundaries</p>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="tabular-nums mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {totalStats.fours + totalStats.sixes}
          </p>
          <p className="tabular-nums mt-1 text-xs text-[var(--text-muted)]">
            4s: {totalStats.fours} · 6s: {totalStats.sixes}
          </p>
        </div>

        <div className="ui-card p-4">
          <div className="flex items-center justify-between">
            <p className="ui-label mb-0">Completed Nets</p>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <p className="tabular-nums mt-2 text-2xl font-bold text-amber-500">
            {day.completions.length}
          </p>
          <p className="tabular-nums mt-1 text-xs text-[var(--text-muted)]">
            Across {day.stations.length} station(s)
          </p>
        </div>
      </div>

      {/* Live Analytics Graphs */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Graph 1: Contact Outcome Breakdown */}
        <div className="ui-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Contact Outcome Distribution
            </h3>
            <BarChart2 className="h-4 w-4 text-[var(--text-muted)]" />
          </div>

          {filteredBalls.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">No deliveries logged.</p>
          ) : (
            <div className="space-y-2.5">
              {/* Segmented Stacked Bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                {outcomeBreakdown.map((item) =>
                  item.count > 0 ? (
                    <div
                      key={item.label}
                      title={`${item.label}: ${item.count} (${item.pct}%)`}
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  ) : null
                )}
              </div>

              <div className="space-y-1.5">
                {outcomeBreakdown.map((item) => (
                  <div key={item.label} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text-secondary)]">
                        {item.label}
                      </span>
                      <span className="tabular-nums font-bold text-[var(--text-primary)]">
                        {item.count} ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Graph 2: Performance vs Bowling Style */}
        <div className="ui-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Solid % by Bowling Style
            </h3>
            <Target className="h-4 w-4 text-[var(--text-muted)]" />
          </div>

          {bowlingStyleBreakdown.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">No data available.</p>
          ) : (
            <div className="space-y-2.5">
              {bowlingStyleBreakdown.map((item) => (
                <div key={item.style} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-[var(--text-secondary)]">
                      {item.style}
                    </span>
                    <span className="tabular-nums shrink-0 font-bold text-[var(--text-primary)]">
                      {item.solidPct}% · {item.balls}b ({item.runs}r)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                      style={{ width: `${item.solidPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Graph 3: Top Shot Types */}
        <div className="ui-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Shot Types</h3>
            <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
          </div>

          {topShotsBreakdown.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">
              No shot types recorded.
            </p>
          ) : (
            <div className="space-y-2.5">
              {topShotsBreakdown.map((item) => {
                const maxBalls = topShotsBreakdown[0]?.balls || 1;
                const widthPct = Math.round((item.balls / maxBalls) * 100);
                return (
                  <div key={item.shot} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-[var(--text-secondary)]">
                        {item.shot}
                      </span>
                      <span className="tabular-nums shrink-0 font-bold text-[var(--text-primary)]">
                        {item.balls}b · {item.runs}r · {item.solidPct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3D Wagon Wheel + Broadcast Scorecard Table */}
      <div className="grid gap-4 lg:grid-cols-12">
        {day.stations.length > 0 && (
          <div className="ui-card space-y-4 p-4 lg:col-span-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">3D Wagon Wheel</h3>
            <WagonWheelSvg
              balls={filteredBalls}
              stance={reportStance}
              onChangeStance={setReportStance}
            />
          </div>
        )}

        {/* Broadcast Cricket Scorecard */}
        <div
          className={`ui-card overflow-hidden ${
            day.stations.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
          }`}
        >
          <div className="relative flex items-center justify-between overflow-hidden border-b-2 border-[#FACC15] bg-[#071A4B] px-4 py-3 text-white">
            {/* Subtle Sri Lanka Broadcast Geometric Speed Stripes */}
            <svg
              aria-hidden="true"
              viewBox="0 0 400 64"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <polygon points="180,0 250,0 205,64 135,64" fill="#1D4ED8" fillOpacity="0.22" />
              <polygon points="260,0 286,0 241,64 215,64" fill="#38BDF8" fillOpacity="0.14" />
              <polygon points="322,0 334,0 289,64 277,64" fill="#881337" fillOpacity="0.55" />
              <polygon points="334,0 339,0 294,64 289,64" fill="#FACC15" fillOpacity="0.65" />
            </svg>

            <div className="relative z-10">
              <h3 className="text-base font-extrabold tracking-wide text-[#FACC15]">
                SCORE CARD
              </h3>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-200">
                Sri Lanka · {day.practiceDate}
              </p>
            </div>
            <SlcLionCrest className="relative z-10 h-9 w-9 shrink-0 drop-shadow-sm" />
          </div>

          {scorecardRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              No practice balls or completed records for this date yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[540px] divide-y divide-[var(--border-subtle)]">
              <div className="grid grid-cols-12 items-center bg-[var(--bg-elevated)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <div className="col-span-4">Batting</div>
                <div className="col-span-1 text-right">R</div>
                <div className="col-span-1 text-right">B</div>
                <div className="col-span-1 text-right">4s</div>
                <div className="col-span-1 text-right">6s</div>
                <div className="col-span-2 text-right">S.Rate</div>
                <div className="col-span-1 text-right">Sld%</div>
                <div className="col-span-1 text-right">Rtg</div>
              </div>

              {scorecardRows.map((row) => {
                const expanded = expandedRowId === row.key;
                return (
                  <div
                    key={row.key}
                    className="px-4 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]/60"
                  >
                    <div className="grid grid-cols-12 items-center gap-1 text-xs">
                      <div className="col-span-4 flex min-w-0 items-center gap-2">
                        <PlayerAvatar
                          name={row.playerName}
                          avatarUrl={playerAvatarMap.get(row.playerId)}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[var(--text-primary)]">
                            {row.playerName}
                          </p>
                          <p className="truncate text-[10px] text-[var(--text-muted)]">
                            {row.isCompleted ? 'Completed' : 'In Progress'}
                          </p>
                        </div>
                      </div>

                      <div className="tabular-nums col-span-1 text-right font-bold text-[var(--text-primary)]">
                        {row.runs}
                      </div>
                      <div className="tabular-nums col-span-1 text-right text-[var(--text-secondary)]">
                        {row.balls}
                      </div>
                      <div className="tabular-nums col-span-1 text-right text-[var(--text-secondary)]">
                        {row.fours}
                      </div>
                      <div className="tabular-nums col-span-1 text-right text-[var(--text-secondary)]">
                        {row.sixes}
                      </div>
                      <div className="tabular-nums col-span-2 text-right text-[var(--text-secondary)]">
                        {row.strikeRate}
                      </div>
                      <div className="tabular-nums col-span-1 text-right font-semibold text-[var(--accent-primary)]">
                        {row.solidPct}%
                      </div>
                      <div className="tabular-nums col-span-1 text-right font-bold text-amber-500">
                        {typeof row.rating === 'number' ? row.rating : '-'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedRowId(expanded ? null : row.key)}
                      className="mt-2 flex w-full items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]"
                    >
                      <span className="truncate">
                        {row.stationLabel}
                        {row.coach ? ` · Coach: ${row.coach}` : ''}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                          expanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {expanded && (
                      <div className="mt-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                        {row.remarks ? (
                          <p>
                            <strong className="text-[var(--text-primary)]">Remarks:</strong>{' '}
                            {row.remarks}
                          </p>
                        ) : (
                          <p className="text-[var(--text-muted)]">No coach remarks recorded.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="grid grid-cols-12 items-center bg-[#071A4B] px-4 py-2.5 text-xs font-bold text-white">
                <div className="col-span-4 text-[#FACC15]">TOTAL</div>
                <div className="tabular-nums col-span-1 text-right">{totalStats.runs}</div>
                <div className="tabular-nums col-span-1 text-right">{totalStats.balls}</div>
                <div className="tabular-nums col-span-1 text-right">{totalStats.fours}</div>
                <div className="tabular-nums col-span-1 text-right">{totalStats.sixes}</div>
                <div className="tabular-nums col-span-2 text-right">{totalStats.strikeRate}</div>
                <div className="tabular-nums col-span-1 text-right text-[#FACC15]">
                  {totalStats.solidPct}%
                </div>
                <div className="col-span-1 text-right">-</div>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Station-by-Station Summary Table */}
      {stationSummaryRows.length > 0 && (
        <div className="ui-card overflow-x-auto p-4">
          <h3 className="mb-3 text-sm font-bold text-[var(--text-primary)]">
            Net / Station Breakdown
          </h3>
          <table className="w-full min-w-[540px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-2 pr-3">Station</th>
                <th className="py-2 pr-3">Net Type</th>
                <th className="py-2 pr-3">Training</th>
                <th className="py-2 pr-3 text-right">Balls</th>
                <th className="py-2 pr-3 text-right">Runs</th>
                <th className="py-2 pr-3 text-right">Solid %</th>
                <th className="py-2 text-right">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {stationSummaryRows.map((st) => (
                <tr key={st.id} className="hover:bg-[var(--bg-elevated)]">
                  <td className="py-2.5 pr-3 font-bold text-[var(--text-primary)]">
                    Station {st.number}
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{st.netType}</td>
                  <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{st.trainingType}</td>
                  <td className="tabular-nums py-2.5 pr-3 text-right font-semibold">{st.balls}</td>
                  <td className="tabular-nums py-2.5 pr-3 text-right font-semibold">{st.runs}</td>
                  <td className="tabular-nums py-2.5 pr-3 text-right font-bold text-[var(--accent-primary)]">
                    {st.solidPct}%
                  </td>
                  <td className="tabular-nums py-2.5 text-right font-semibold">{st.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Master-Only Admin History Wipe */}
      {currentCoach.role === 'master' && (
        <div className="ui-card flex flex-wrap items-center justify-between gap-3 border-rose-500/30 p-4">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Admin History Management
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Master role only. Permanently removes all local practice history.
            </p>
          </div>
          <button type="button" onClick={handleClear} className="ui-btn-danger">
            <Trash2 className="h-4 w-4" />
            <span>Clear All History</span>
          </button>
        </div>
      )}

      <UiConfirmModal
        open={confirmClearOpen}
        title="Clear All Practice History?"
        description="This will permanently delete all saved local practice days, ball logs, and completions. This action cannot be undone."
        confirmLabel="Clear All History"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          onClearHistory();
          setConfirmClearOpen(false);
          onToast('All practice history cleared.');
        }}
      />
    </div>
  );
};
