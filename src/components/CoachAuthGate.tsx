import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import type { CoachAccount } from '../domain/types';

interface CoachAuthGateProps {
  coaches: CoachAccount[];
  onSignIn: (coach: CoachAccount) => void;
}

export const CoachAuthGate: React.FC<CoachAuthGateProps> = ({ coaches, onSignIn }) => {
  const [selectedId, setSelectedId] = useState(coaches[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const coach = coaches.find((c) => c.id === selectedId);
    if (!coach) {
      setError('Select a coach profile.');
      return;
    }
    if (pin.trim() !== coach.pin) {
      setError('Incorrect 4-digit PIN.');
      return;
    }
    setError('');
    onSignIn(coach);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0F294A] text-sm font-bold text-[#FFFFFF]">
            BP
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0F294A]">Batting Practice Planner</h1>
            <p className="text-xs text-[#475569]">Sri Lanka Cricket · High Performance</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#0F172A]">
              Select Coach / Profile
            </label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setError('');
              }}
              className="touch-target w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            >
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#0F172A]">
              4-Digit PIN
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#475569]" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="Enter 4-digit PIN"
                className="touch-target tabular-nums w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2 pr-3 pl-9 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-[#DC2626] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#DC2626]">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="touch-target flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F294A] px-4 py-2.5 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1E3A5F]"
          >
            <ShieldCheck className="h-4 w-4" />
            Sign In to Session
          </button>
        </form>

        <p className="mt-4 text-xs text-[#475569]">
          Demo PINs: Master `1111`, Coaches `2222`-`5555`, Viewer `0000`.
        </p>
      </div>
    </div>
  );
};
