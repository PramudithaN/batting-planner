import React, { useEffect, useState } from 'react';
import { Delete, ShieldCheck } from 'lucide-react';
import type { CoachAccount } from '../domain/types';
import { SlcLionCrest } from './SlcLionCrest';

interface CoachAuthGateProps {
  coaches: CoachAccount[];
  onSignIn: (coach: CoachAccount) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

const ROLE_BADGE: Record<string, string> = {
  master: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  coach: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  viewer: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export const CoachAuthGate: React.FC<CoachAuthGateProps> = ({ coaches, onSignIn }) => {
  const [selectedId, setSelectedId] = useState(coaches[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const selectedCoach = coaches.find((c) => c.id === selectedId);

  const attemptSignIn = (nextPin: string, coachId = selectedId) => {
    const coach = coaches.find((c) => c.id === coachId);
    if (!coach) {
      setError('Select a coach profile.');
      return;
    }
    if (nextPin !== coach.pin) {
      setError('Incorrect PIN. Try again.');
      setPin('');
      return;
    }
    setError('');
    onSignIn(coach);
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    setError('');
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      window.setTimeout(() => attemptSignIn(next), 90);
    }
  };

  const handleBackspace = () => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="theme-dark flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-4 text-[var(--text-primary)]">
      <div className="ui-card w-full max-w-2xl overflow-hidden shadow-xl">
        {/* Sri Lanka Jersey Accent Strap */}
        <div className="flex h-1 w-full">
          <div className="w-1/2 bg-[#881337]" />
          <div className="w-1/2 bg-[#EAB308]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-6 py-4">
          <div className="flex items-center gap-3">
            <SlcLionCrest className="h-10 w-10 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-white">Sri Lanka Cricket</h1>
              <p className="text-xs font-medium text-[#EAB308]">
                High Performance · Batting Practice Planner
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-300">
            Coach Sign-In · v{__APP_VERSION__}
          </span>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-12">
          {/* Coach Profile List */}
          <div className="space-y-2 md:col-span-7">
            <p className="ui-label">1. Select Profile</p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              {coaches.map((c) => {
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setPin('');
                      setError('');
                    }}
                    className={`touch-target flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                      active
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/15'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                          active
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {getInitials(c.name)}
                      </div>
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {c.name}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        ROLE_BADGE[c.role] ?? ''
                      }`}
                    >
                      {c.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Digit PIN Pad */}
          <div className="ui-card-elevated flex flex-col justify-between p-5 md:col-span-5">
            <div>
              <p className="ui-label">2. Enter 4-Digit PIN</p>
              <p className="truncate text-sm font-semibold text-[var(--accent-primary)]">
                {selectedCoach?.name}
              </p>

              <div className="my-4 flex items-center justify-center gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`h-3 w-3 rounded-full transition-colors ${
                      idx < pin.length
                        ? 'bg-[var(--accent-primary)]'
                        : 'border border-[var(--border-strong)] bg-[var(--bg-surface)]'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-center text-xs font-semibold text-rose-400">
                  {error}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="ui-btn-secondary h-11 text-base font-bold"
                >
                  {digit}
                </button>
              ))}
              <div className="flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="ui-btn-secondary h-11 text-base font-bold"
              >
                0
              </button>
              <button
                type="button"
                aria-label="Backspace"
                onClick={handleBackspace}
                className="ui-btn-secondary h-11"
              >
                <Delete className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-center text-[11px] text-[var(--text-muted)]">
              PINs: Master 1111 · Coaches 2222-5555 · Viewer 0000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
