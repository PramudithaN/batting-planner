import React from 'react';
import { LENGTHS, LINES } from '../domain/types';

interface PitchMapSvgProps {
  selectedLine?: string;
  selectedLength?: string;
  onSelect: (line: string, length: string) => void;
}

export const PitchMapSvg: React.FC<PitchMapSvgProps> = ({
  selectedLine,
  selectedLength,
  onSelect,
}) => {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#0F294A]">
        <span>1-Tap Pitch Map (Length x Line)</span>
        <span className="font-normal text-[#475569]">
          {selectedLength && selectedLine ? `${selectedLength} / ${selectedLine}` : 'Tap zone'}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {LENGTHS.map((length) =>
          LINES.map((line) => {
            const active = selectedLine === line && selectedLength === length;
            return (
              <button
                key={`${length}-${line}`}
                type="button"
                title={`${length} - ${line}`}
                onClick={() => onSelect(line, length)}
                className={`h-8 rounded border text-[10px] font-medium transition-colors ${
                  active
                    ? 'border-[#2563EB] bg-[#2563EB] text-[#FFFFFF]'
                    : 'border-[#E2E8F0] bg-[#FEFCE8] text-[#475569] hover:border-[#D97706]'
                }`}
              >
                {length.slice(0, 2)}
              </button>
            );
          })
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[#475569]">
        <span>Wide Off</span>
        <span>Off</span>
        <span>Middle</span>
        <span>Leg</span>
        <span>Wide Leg</span>
      </div>
    </div>
  );
};
