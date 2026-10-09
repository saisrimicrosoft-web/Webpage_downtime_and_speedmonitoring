'use client';
import React from 'react';
import { getSslStatus } from '@/lib/ssl';

interface Props {
  daysLeft: number;
  maxDays?: number;
  size?: number;
  className?: string;
}

export default function SslGauge({ daysLeft, maxDays = 365, size = 80, className = '' }: Props) {
  const cfg = getSslStatus(daysLeft);
  const r = (size / 2) * 0.78;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, daysLeft <= 0 ? 1 : daysLeft / maxDays));
  const dash = pct * circ;
  const label = daysLeft <= 0 ? 'EXP' : daysLeft > 999 ? '999+' : `${daysLeft}d`;
  const fontSize = size < 60 ? size * 0.18 : size * 0.16;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`SSL certificate: ${cfg.label}, ${daysLeft} days remaining`}
    >
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size * 0.08} />
      {/* Arc */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={cfg.barColor}
        strokeWidth={size * 0.09}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      {/* Label */}
      <text
        x={cx} y={cy + fontSize * 0.38}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="800"
        fill={cfg.barColor}
        fontFamily="inherit"
      >
        {label}
      </text>
    </svg>
  );
}
