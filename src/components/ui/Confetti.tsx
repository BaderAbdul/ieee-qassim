'use client';

import { useEffect, useRef } from 'react';

const COLORS = ['#00629B', '#E87722', '#F5C518', '#22C55E', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];

interface Piece { x: number; y: number; w: number; h: number; vx: number; vy: number; rot: number; vr: number; color: string; sway: number; phase: number }

/**
 * Colourful scraps that fall from the top of the screen for a few seconds, then remove themselves.
 * Purely decorative (aria-hidden, no pointer events) and skipped for people who prefer reduced motion.
 * Remount it with a new `burstKey` to throw another round.
 */
export default function Confetti({ burstKey, durationMs = 5500 }: { burstKey: string | number; durationMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const count = window.innerWidth < 640 ? 110 : 190;
    const pieces: Piece[] = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.6,        // staggered above the top edge
      w: 6 + Math.random() * 8, h: 10 + Math.random() * 12,
      vx: (Math.random() - 0.5) * 1.2, vy: 2 + Math.random() * 3.2,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      sway: 0.6 + Math.random() * 1.6, phase: Math.random() * Math.PI * 2,
    }));

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const fade = elapsed > durationMs - 1200 ? Math.max(0, (durationMs - elapsed) / 1200) : 1;
      context.globalAlpha = fade;
      for (const piece of pieces) {
        piece.phase += 0.04;
        piece.x += piece.vx + Math.sin(piece.phase) * piece.sway;
        piece.y += piece.vy;
        piece.rot += piece.vr;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rot);
        context.fillStyle = piece.color;
        context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        context.restore();
      }
      if (elapsed < durationMs) frame = requestAnimationFrame(tick);
      else context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [burstKey, durationMs]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[300] h-full w-full" />;
}
