import React from 'react';
import { WAGON_RUN_COLORS, type BallEvent } from '../domain/types';

interface WagonWheelSvgProps {
  interactive?: boolean;
  selectedX?: number;
  selectedY?: number;
  onSelectPoint?: (x: number, y: number) => void;
  balls?: BallEvent[];
}

export const WagonWheelSvg: React.FC<WagonWheelSvgProps> = ({
  interactive = false,
  selectedX,
  selectedY,
  onSelectPoint,
  balls = [],
}) => {
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onSelectPoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 80);
    onSelectPoint(Math.max(4, Math.min(96, x)), Math.max(4, Math.min(76, y)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (!interactive || !onSelectPoint) return;
    const step = 4;
    const curX = selectedX ?? 50;
    const curY = selectedY ?? 55;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSelectPoint(Math.max(4, curX - step), curY);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSelectPoint(Math.min(96, curX + step), curY);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onSelectPoint(curX, Math.max(4, curY - step));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onSelectPoint(curX, Math.min(76, curY + step));
    }
  };

  const mappedBalls = balls.filter(
    (b) => !b.isUndone && typeof b.shotX === 'number' && typeof b.shotY === 'number'
  );

  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 100 80"
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'application' : 'img'}
        aria-label={
          interactive
            ? 'Interactive cricket ground for shot location. Click or use arrow keys to mark.'
            : 'Cricket ground wagon wheel'
        }
        onClick={handleSvgClick}
        onKeyDown={handleKeyDown}
        className={`w-full max-w-[340px] rounded-lg border border-[#E2E8F0] bg-[#ECFDF5] ${
          interactive ? 'cursor-crosshair focus:outline-2 focus:outline-[#2563EB]' : ''
        }`}
      >
        {/* Outer boundary */}
        <ellipse cx="50" cy="40" rx="45" ry="35" fill="#D1FAE5" stroke="#16A34A" strokeWidth="1" />
        {/* 30-yard inner circle */}
        <ellipse
          cx="50"
          cy="40"
          rx="26"
          ry="20"
          fill="none"
          stroke="#059669"
          strokeWidth="0.6"
          strokeDasharray="2 2"
        />
        {/* Pitch */}
        <rect x="47" y="29" width="6" height="22" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.5" />
        {/* Batter origin */}
        <circle cx="50" cy="34" r="1.4" fill="#0F294A" />

        {/* Plotted shot rays */}
        {mappedBalls.map((b) => {
          const color = WAGON_RUN_COLORS[b.runs ?? 'Unrecorded'] ?? WAGON_RUN_COLORS.Unrecorded;
          return (
            <g key={b.id}>
              <line
                x1="50"
                y1="34"
                x2={b.shotX}
                y2={b.shotY}
                stroke={color}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx={b.shotX} cy={b.shotY} r="1.6" fill={color} />
            </g>
          );
        })}

        {/* Active interactive marker */}
        {interactive && typeof selectedX === 'number' && typeof selectedY === 'number' && (
          <g>
            <line
              x1="50"
              y1="34"
              x2={selectedX}
              y2={selectedY}
              stroke="#0F294A"
              strokeWidth="1.4"
              strokeDasharray="2 1"
            />
            <circle cx={selectedX} cy={selectedY} r="2.6" fill="#2563EB" stroke="#FFFFFF" strokeWidth="0.8" />
          </g>
        )}
      </svg>

      {!interactive && (
        <div className="flex flex-wrap gap-3 text-xs text-[#475569]">
          {Object.entries(WAGON_RUN_COLORS).map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
