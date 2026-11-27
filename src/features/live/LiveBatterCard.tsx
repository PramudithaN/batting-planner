import React from 'react';
import { CONTACT_OUTCOMES, DISMISSAL_TYPES, type Player } from '../../domain/types';
import { SlcLionCrest } from '../../components/SlcLionCrest';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';

export interface LiveBatterStats {
  totalRuns: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  strikeRate: string;
  solidPct: number;
  outcomeCounts: Record<string, number>;
  dismissalCounts: Record<string, number>;
}

interface LiveBatterCardProps {
  stationNumber: number;
  nextBallNumber: number;
  player?: Player;
  stats: LiveBatterStats;
}

export const LiveBatterCard: React.FC<LiveBatterCardProps> = ({
  stationNumber,
  nextBallNumber,
  player,
  stats,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1E3A8A]/30 shadow-xs">
      <div className="flex items-center justify-between bg-[#0B1F4D] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
        <span>Live Net Stats · Station {stationNumber}</span>
        <span className="tabular-nums text-[#FACC15]">Next: Ball #{nextBallNumber}</span>
      </div>

      <div className="relative flex items-center justify-between gap-3 overflow-hidden border-b-2 border-[#FACC15] bg-gradient-to-r from-[#091E54] via-[#1D4ED8] to-[#0B3B8C] px-3.5 py-2.5 text-white">
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
          <polygon points="338,0 350,0 302,72 290,72" fill="#881337" fillOpacity="0.55" />
          <polygon points="350,0 355,0 307,72 302,72" fill="#FACC15" fillOpacity="0.65" />
        </svg>

        <div className="relative z-10 flex min-w-0 items-center gap-2.5">
          <SlcLionCrest className="h-8 w-8 shrink-0 drop-shadow-sm" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-extrabold uppercase tracking-wide">
              {player?.name}
            </h3>
            {player?.squads && player.squads.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FACC15]">
                {player.squads.join(' · ')}
              </p>
            )}
          </div>
        </div>
        <PlayerAvatar
          name={player?.name ?? 'Player'}
          avatarUrl={player?.avatarUrl}
          size="lg"
          className="relative z-10 border-2 border-[#FACC15]/80 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] bg-[var(--bg-elevated)] text-center sm:grid-cols-6">
        <div className="py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
            Runs
          </p>
          <p className="tabular-nums text-sm font-extrabold text-[var(--text-primary)]">
            {stats.totalRuns}
          </p>
        </div>
        <div className="py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
            Balls
          </p>
          <p className="tabular-nums text-sm font-extrabold text-[var(--text-primary)]">
            {stats.balls}
          </p>
        </div>
        <div className="py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
            Outs
          </p>
          <p className="tabular-nums text-sm font-extrabold text-rose-500">{stats.wickets}</p>
        </div>
        <div className="border-t border-[var(--border-subtle)] py-2 sm:border-t-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
            S. Rate
          </p>
          <p className="tabular-nums text-sm font-extrabold text-[var(--text-primary)]">
            {stats.strikeRate}
          </p>
        </div>
        <div className="border-t border-[var(--border-subtle)] py-2 sm:border-t-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
            4s / 6s
          </p>
          <p className="tabular-nums text-sm font-extrabold text-[var(--text-primary)]">
            {stats.fours}/{stats.sixes}
          </p>
        </div>
        <div className="border-t border-[var(--border-subtle)] py-2 sm:border-t-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] sm:text-[10px]">
            Solid %
          </p>
          <p className="tabular-nums text-sm font-extrabold text-[var(--accent-primary)]">
            {stats.solidPct}%
          </p>
        </div>
      </div>

      {/* All Contact Outcomes Breakdown */}
      <div className="grid grid-cols-3 divide-x divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center sm:grid-cols-6 sm:divide-y-0">
        {CONTACT_OUTCOMES.map((co) => {
          const count = stats.outcomeCounts[co] ?? 0;
          const pct = stats.balls > 0 ? Math.round((count / stats.balls) * 100) : 0;
          const shortLabel = co === 'Played and missed' ? 'Played & Miss' : co;
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

      {/* Session Out / Dismissal Summary */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px]">
        <span className="font-bold uppercase tracking-wider text-rose-500">
          Outs ({stats.wickets}):
        </span>
        {DISMISSAL_TYPES.map((dt) => {
          const cnt = stats.dismissalCounts[dt] ?? 0;
          const short = dt === 'Caught and bowled' ? 'C & B' : dt;
          return (
            <span
              key={dt}
              className={`rounded px-1.5 py-0.5 font-semibold tabular-nums ${
                cnt > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
              }`}
            >
              {short}: {cnt}
            </span>
          );
        })}
      </div>
    </div>
  );
};
