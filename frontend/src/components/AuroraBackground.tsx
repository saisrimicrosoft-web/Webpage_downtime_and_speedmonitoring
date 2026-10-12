'use client';

/**
 * AuroraBackground — decorative only. Remove from layout.tsx to revert.
 * Zero logic, zero effect on routing/auth/data.
 * Blur is ONLY on the background blobs — never on card content.
 */

import { useEffect, useRef } from 'react';

export default function AuroraBackground() {
  const layerRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
    if (prefersReduced || isTouch) return;

    let mx = 0, my = 0;

    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const tick = () => {
      if (layerRef.current) {
        layerRef.current.style.transform =
          `translate(${mx * 18}px, ${my * 10}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Shared face styles for cubes
  const cubeface = (size: number, t: string, bg: string) => ({
    position: 'absolute' as const,
    width: size, height: size,
    border: '1px solid rgba(255,255,255,0.13)',
    borderRadius: 4,
    transform: t,
    background: bg,
    backfaceVisibility: 'hidden' as const,
  });

  return (
    <div
      aria-hidden="true"
      className="aurora-background transition-opacity duration-300"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
      }}
    >
      {/* ── Parallax wrapper ─────────────────────── */}
      <div ref={layerRef} style={{ position: 'absolute', inset: '-8%', willChange: 'transform' }}>

        {/* BLOB 1 — orange/red — top-left (matches reference) */}
        <div className="aurora-blob" style={{
          position: 'absolute',
          top: '-8%', left: '-12%',
          width: '55%', height: '50%',
          borderRadius: '40% 60% 55% 45%',
          background: 'radial-gradient(ellipse at 35% 35%, #ff4500 0%, #ff7a3d 30%, #ff3d8b 60%, transparent 78%)',
          filter: 'blur(75px)',
          opacity: 0.16,
          animation: 'aurora-1 20s ease-in-out infinite alternate',
          willChange: 'transform',
        }} />

        {/* BLOB 2 — purple/blue — top-right (matches reference) */}
        <div className="aurora-blob" style={{
          position: 'absolute',
          top: '-12%', right: '-8%',
          width: '52%', height: '48%',
          borderRadius: '60% 40% 45% 55%',
          background: 'radial-gradient(ellipse at 65% 30%, #7b3dff 0%, #2d6bff 50%, #22d3c5 75%, transparent 88%)',
          filter: 'blur(85px)',
          opacity: 0.18,
          animation: 'aurora-2 17s ease-in-out infinite alternate',
          willChange: 'transform',
        }} />

        {/* BLOB 3 — teal center fade-in */}
        <div className="aurora-blob" style={{
          position: 'absolute',
          top: '2%', left: '25%',
          width: '50%', height: '30%',
          borderRadius: '50% 50% 60% 40%',
          background: 'radial-gradient(ellipse at 50% 60%, #7b3dff 0%, #2d6bff 40%, transparent 70%)',
          filter: 'blur(65px)',
          opacity: 0.08,
          animation: 'aurora-3 28s ease-in-out infinite alternate',
          willChange: 'transform',
        }} />
      </div>

      {/* ── 3D Cube — top left (pink/purple faces like reference) ── */}
      <div className="shape-cube" style={{
        position: 'absolute',
        top: '7%', left: '5%',
        width: 54, height: 54,
        perspective: 380,
        animation: 'float-a 11s ease-in-out infinite',
        willChange: 'transform',
      }}>
        <div style={{
          width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transform: 'rotateX(28deg) rotateY(42deg)',
          position: 'relative',
        }}>
          {[
            ['translateZ(27px)',              'linear-gradient(135deg,rgba(255,61,139,.35),rgba(123,61,255,.25))'],
            ['translateZ(-27px) rotateY(180deg)', 'linear-gradient(135deg,rgba(45,107,255,.28),rgba(123,61,255,.20))'],
            ['translateX(-27px) rotateY(-90deg)', 'linear-gradient(135deg,rgba(255,122,61,.22),rgba(255,61,139,.18))'],
            ['translateX(27px)  rotateY(90deg)',  'linear-gradient(135deg,rgba(255,255,255,.14),rgba(45,107,255,.22))'],
            ['translateY(-27px) rotateX(90deg)',  'linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,61,139,.16))'],
            ['translateY(27px)  rotateX(-90deg)', 'linear-gradient(135deg,rgba(123,61,255,.18),rgba(34,211,197,.12))'],
          ].map(([t, bg], i) => (
            <div key={i} style={cubeface(54, t, bg)} />
          ))}
        </div>
      </div>

      {/* ── 3D Cube — top right (blue/teal faces like reference) ── */}
      <div className="shape-cube" style={{
        position: 'absolute',
        top: '5%', right: '7%',
        width: 42, height: 42,
        perspective: 300,
        animation: 'float-b 9s ease-in-out 1.5s infinite',
        willChange: 'transform',
      }}>
        <div style={{
          width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transform: 'rotateX(22deg) rotateY(-38deg)',
          position: 'relative',
        }}>
          {[
            ['translateZ(21px)',              'linear-gradient(135deg,rgba(45,107,255,.35),rgba(34,211,197,.22))'],
            ['translateZ(-21px) rotateY(180deg)', 'linear-gradient(135deg,rgba(123,61,255,.28),rgba(45,107,255,.22))'],
            ['translateX(-21px) rotateY(-90deg)', 'linear-gradient(135deg,rgba(123,61,255,.30),rgba(34,211,197,.18))'],
            ['translateX(21px)  rotateY(90deg)',  'linear-gradient(135deg,rgba(255,255,255,.14),rgba(45,107,255,.24))'],
            ['translateY(-21px) rotateX(90deg)',  'linear-gradient(135deg,rgba(255,255,255,.24),rgba(45,107,255,.16))'],
            ['translateY(21px)  rotateX(-90deg)', 'linear-gradient(135deg,rgba(34,211,197,.18),rgba(123,61,255,.14))'],
          ].map(([t, bg], i) => (
            <div key={i} style={cubeface(42, t, bg)} />
          ))}
        </div>
      </div>

      {/* ── Ring — right side mid ──────────────────────── */}
      <div className="shape-ring" style={{
        position: 'absolute',
        top: '32%', right: '4%',
        width: 48, height: 48,
        animation: 'float-ring 13s ease-in-out 1s infinite',
        willChange: 'transform',
      }}>
        <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
          <defs>
            <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#ff3d8b" stopOpacity="0.65"/>
              <stop offset="55%"  stopColor="#7b3dff" stopOpacity="0.45"/>
              <stop offset="100%" stopColor="#2d6bff" stopOpacity="0.30"/>
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="18" fill="none" stroke="url(#rg)" strokeWidth="3.5"
            style={{ filter:'drop-shadow(0 0 7px rgba(123,61,255,0.55))' }}/>
          <circle cx="24" cy="24" r="11" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.2"/>
        </svg>
      </div>

      {/* ── Hexagon — left mid ─────────────────────────── */}
      <div className="shape-hex" style={{
        position: 'absolute',
        top: '42%', left: '3%',
        width: 40, height: 40,
        animation: 'float-c 10s ease-in-out 3s infinite',
        willChange: 'transform',
      }}>
        <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
          <defs>
            <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#22d3c5" stopOpacity="0.45"/>
              <stop offset="100%" stopColor="#7b3dff" stopOpacity="0.30"/>
            </linearGradient>
          </defs>
          <polygon points="20,2 36,11 36,29 20,38 4,29 4,11"
            fill="rgba(255,255,255,0.025)"
            stroke="url(#hg)" strokeWidth="1.4"
            style={{ filter:'drop-shadow(0 0 8px rgba(34,211,197,0.40))' }}/>
        </svg>
      </div>

    </div>
  );
}
