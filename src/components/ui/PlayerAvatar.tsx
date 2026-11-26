import React, { useState } from 'react';

interface PlayerAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  const dims =
    size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-9 w-9 text-xs' : 'h-7 w-7 text-[10px]';

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${dims} shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] object-cover object-top ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/15 font-bold text-[var(--accent-primary)] ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
