import React, { useMemo, useState } from 'react';
import { Calendar, Download, RefreshCw, Trash2 } from 'lucide-react';
import {
  BOWLING_STYLES,
  type CoachAccount,
  type Player,
  type PracticeDay,
} from '../domain/types';
import { exportDayExcel, exportPlayerHistoryExcel } from '../lib/excelExport';
import { loadAllDays } from '../store/plannerStore';
import { WagonWheelSvg } from './WagonWheelSvg';

interface ReportsViewProps {
  day: PracticeDay;
  players: Player[];
  currentCoach: CoachAccount;
  onChangeDate: (date: string) => void;
  onRefresh: () => void;
  onClearHistory: () => void;
  onToast: (msg: string, type?: 'info' | 'error') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  day,
  players,
  currentCoach,
  onChangeDate,
  onRefresh,
  onClearHistory,
  onToast,
}) => {
  const [filterStationId, setFilterStationId] = useState('all');
  const [filterPlayerId, setFilterPlayerId] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);

  const activeBalls = useMemo(() => day.balls.filter((b) => !b.isUndone), [day.balls]);

  const overallSolidPct = useMemo(() => {
    if (activeBalls.length === 0) return 0;
    const solid = activeBalls.filter((b) => b.contactOutcome === 'Solid').length;
    return Math.round((solid / activeBalls.length) * 100);
  }, [activeBalls]);

  const filteredWagonBalls = useMemo(
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

  const handleClear = () => {
    if (currentCoach.role !== 'master') return;
    if (window.confirm('Clear all saved practice history? This cannot be undone.')) {
      onClearHistory();
      onToast('All practice history cleared.');
    }
  };

  return (
    <div className="space-y-5">
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
            className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm font-semibold text-[#0F294A]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportDayExcel(day, players)}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-[#0F294A] px-4 py-2 text-sm font-semibold text-[#FFFFFF]"
          >
            <Download className="h-4 w-4" />
            Download day Excel
          </button>
          <button
            type="button"
            onClick={() => exportPlayerHistoryExcel(loadAllDays(), players)}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#2563EB] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#2563EB]"
          >
            <Download className="h-4 w-4" />
            Download player Excel
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
          <p className="text-xs font-semibold text-[#475569]">Total Balls Logged</p>
          <p className="tabular-nums mt-1 text-2xl font-bold text-[#0F294A]">
            {activeBalls.length}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
          <p className="text-xs font-semibold text-[#475569]">Overall Solid %</p>
          <p className="tabular-nums mt-1 text-2xl font-bold text-[#16A34A]">
            {overallSolidPct}%
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
          <p className="text-xs font-semibold text-[#475569]">Completed Records</p>
          <p className="tabular-nums mt-1 text-2xl font-bold text-[#2563EB]">
            {day.completions.length}
          </p>
        </div>
      </div>

      {/* Saved Wagon Wheels */}
      {day.stations.length > 0 && (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 space-y-4">
          <h3 className="text-sm font-bold text-[#0F294A]">Saved wagon wheels</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={filterStationId}
              onChange={(e) => setFilterStationId(e.target.value)}
              className="touch-target rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm"
            >
              <option value="all">All stations</option>
              {day.stations.map((s) => (
                <option key={s.id} value={s.id}>
                  Station {s.stationNumber} ({s.netType})
                </option>
              ))}
            </select>

            <select
              value={filterPlayerId}
              onChange={(e) => setFilterPlayerId(e.target.value)}
              className="touch-target rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm"
            >
              <option value="all">All players</option>
              {day.availablePlayerIds.map((pid) => (
                <option key={pid} value={pid}>
                  {playerMap.get(pid) ?? pid}
                </option>
              ))}
            </select>

            <select
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="touch-target rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-sm"
            >
              <option value="all">All bowling styles</option>
              {BOWLING_STYLES.map((bs) => (
                <option key={bs} value={bs}>
                  {bs}
                </option>
              ))}
              <option value="Unrecorded">Unrecorded</option>
            </select>
          </div>

          <WagonWheelSvg balls={filteredWagonBalls} />
        </div>
      )}

      {/* Completed Records Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
        <h3 className="mb-3 text-sm font-bold text-[#0F294A]">Completed records</h3>
        {day.completions.length === 0 ? (
          <p className="text-sm text-[#475569]">No completed records for this date.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 pr-3">Station</th>
                <th className="py-2 pr-3">Balls</th>
                <th className="py-2 pr-3">Solid %</th>
                <th className="py-2 pr-3">Rating</th>
                <th className="py-2">Coach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {day.completions.map((c) => {
                const st = day.stations.find((s) => s.id === c.stationId);
                const balls = activeBalls.filter(
                  (b) => b.stationId === c.stationId && b.playerId === c.playerId
                );
                const solidCount = balls.filter((b) => b.contactOutcome === 'Solid').length;
                const solidPct =
                  balls.length > 0 ? Math.round((solidCount / balls.length) * 100) : 0;

                return (
                  <tr key={c.id} className="text-[#0F172A]">
                    <td className="py-2.5 pr-3 font-medium">
                      {playerMap.get(c.playerId) ?? c.playerId}
                    </td>
                    <td className="py-2.5 pr-3">
                      {st ? `Station ${st.stationNumber} (${st.netType})` : c.stationId}
                    </td>
                    <td className="tabular-nums py-2.5 pr-3">{balls.length}</td>
                    <td className="tabular-nums py-2.5 pr-3">{solidPct}%</td>
                    <td className="tabular-nums py-2.5 pr-3 font-semibold">{c.rating}/10</td>
                    <td className="py-2.5">{c.observingCoach}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Master-Only Admin History Wipe */}
      {currentCoach.role === 'master' && (
        <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4">
          <div>
            <p className="text-sm font-bold text-[#0F294A]">Admin History Management</p>
            <p className="text-xs text-[#475569]">
              Master role only. Permanently removes all local practice history.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#DC2626] px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
          >
            <Trash2 className="h-4 w-4" />
            Clear all history
          </button>
        </div>
      )}
    </div>
  );
};
