'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { DayRecord } from '@/lib/types';

interface ArtViewProps {
  data: DayRecord[];
  focusDay: DayRecord | null;
}

export default function ArtView({ data, focusDay }: ArtViewProps) {
  return (
    <div className="art-view">
      <SleepArt data={data} focusDay={focusDay} />
      <HeartArt data={data} focusDay={focusDay} />
      <ActivityArt data={data} focusDay={focusDay} />
      <StressArt data={data} focusDay={focusDay} />
    </div>
  );
}

/* ── Shared helpers ────────────────────────────────────── */

function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    const loop = () => {
      const rect = canvas.getBoundingClientRect();
      drawRef.current(ctx, rect.width, rect.height, (performance.now() - start) / 1000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return canvasRef;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ── Sleep: constellation / star map ──────────────────── */
// Stars placed by sleep phase data, connected by faint lines. Deep sleep = bright blue,
// REM = purple, Light = dim, Awake = red flicker. Gentle drift.

function SleepArt({ data, focusDay }: { data: DayRecord[]; focusDay: DayRecord | null }) {
  const starsRef = useRef<{ x: number; y: number; stage: number; brightness: number; size: number; vx: number; vy: number }[]>([]);
  const initRef = useRef(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    // Initialize stars from data
    if (!initRef.current || starsRef.current.length === 0) {
      const stars: typeof starsRef.current = [];
      const days = data.length > 0 ? data : (focusDay ? [focusDay] : []);
      for (const day of days) {
        if (!day.sleep) continue;
        const phases = day.sleep.phases_5min?.split('|').map(Number) ?? [];
        for (let i = 0; i < phases.length; i += 3) {
          const stage = phases[i] || 2;
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            stage,
            brightness: stage === 1 ? 1 : stage === 3 ? 0.8 : stage === 4 ? 0.3 : 0.5,
            size: stage === 1 ? 3 : stage === 3 ? 2.5 : 1.5,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
          });
        }
      }
      if (stars.length === 0) {
        // Fallback: generate ambient stars
        for (let i = 0; i < 80; i++) {
          stars.push({
            x: Math.random() * w, y: Math.random() * h,
            stage: [1, 2, 3, 4][Math.floor(Math.random() * 4)],
            brightness: 0.3 + Math.random() * 0.7,
            size: 1 + Math.random() * 2,
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
          });
        }
      }
      starsRef.current = stars.slice(0, 200); // cap
      initRef.current = true;
    }

    ctx.fillStyle = '#070714';
    ctx.fillRect(0, 0, w, h);

    const stars = starsRef.current;
    const stageColors: Record<number, string> = {
      1: '#4a90d9', // deep
      2: '#5c6b8a', // light
      3: '#9b59b6', // REM
      4: '#c0392b', // awake
    };

    // Draw connections
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < Math.min(i + 8, stars.length); j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.strokeStyle = stageColors[stars[i].stage] || '#5c6b8a';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw and move stars
    for (const s of stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(t * 1.5 + s.x * 0.01 + s.y * 0.01);
      ctx.globalAlpha = s.brightness * twinkle;
      ctx.fillStyle = stageColors[s.stage] || '#5c6b8a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      if (s.stage === 1 || s.stage === 3) {
        ctx.globalAlpha = s.brightness * twinkle * 0.15;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = w;
      if (s.x > w) s.x = 0;
      if (s.y < 0) s.y = h;
      if (s.y > h) s.y = 0;
    }
    ctx.globalAlpha = 1;
  }, [data, focusDay]);

  const canvasRef = useCanvas(draw);

  return (
    <div className="art-window">
      <span className="art-window-label">Sleep</span>
      <canvas ref={canvasRef} className="art-canvas" />
    </div>
  );
}

/* ── Heart: pulsing rings / ripples ───────────────────── */
// Concentric rings that pulse outward at the heart rate rhythm.
// Color intensity from HRV, ring spacing from resting HR.

function HeartArt({ data, focusDay }: { data: DayRecord[]; focusDay: DayRecord | null }) {
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const hr = focusDay?.heart?.resting_hr ?? 65;
    const hrv = focusDay?.heart?.hrv_avg ?? 40;
    const bps = hr / 60; // beats per second
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#0f0508';
    ctx.fillRect(0, 0, w, h);

    const maxRadius = Math.max(w, h) * 0.7;
    const ringCount = 12;
    const beatPhase = (t * bps) % 1;
    const hrvNorm = clamp(hrv / 100, 0, 1); // higher HRV = calmer colors

    for (let i = 0; i < ringCount; i++) {
      const phase = ((i / ringCount) + beatPhase) % 1;
      const radius = phase * maxRadius;
      const alpha = (1 - phase) * 0.6;

      // Pulse distortion
      const pulse = Math.sin(t * bps * Math.PI * 2) * 0.1 + 1;
      const r = radius * pulse;

      const red = Math.round(lerp(255, 180, hrvNorm));
      const green = Math.round(lerp(60, 100, hrvNorm));
      const blue = Math.round(lerp(80, 140, hrvNorm));

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `rgb(${red},${green},${blue})`;
      ctx.lineWidth = 1.5 + (1 - phase) * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Center glow that pulses
    const glowPulse = 0.4 + 0.6 * Math.pow(Math.sin(t * bps * Math.PI * 2) * 0.5 + 0.5, 3);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    grad.addColorStop(0, `rgba(255, 80, 100, ${glowPulse * 0.5})`);
    grad.addColorStop(1, 'rgba(255, 80, 100, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.fillRect(cx - 60, cy - 60, 120, 120);

    // HR text
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${hr} BPM`, cx, cy + 4);
    ctx.globalAlpha = 1;
  }, [focusDay]);

  const canvasRef = useCanvas(draw);

  return (
    <div className="art-window">
      <span className="art-window-label">Heart</span>
      <canvas ref={canvasRef} className="art-canvas" />
    </div>
  );
}

/* ── Activity: flowing energy particles ───────────────── */
// Particles flow upward with velocity proportional to activity level.
// More active = more particles, faster, brighter green. Calm = slow drift.

function ActivityArt({ data, focusDay }: { data: DayRecord[]; focusDay: DayRecord | null }) {
  const particlesRef = useRef<{ x: number; y: number; vy: number; vx: number; size: number; life: number; maxLife: number }[]>([]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const steps = focusDay?.workout?.steps ?? 5000;
    const activeMins = focusDay?.workout?.active_min ?? 20;
    const intensity = clamp(steps / 15000, 0.1, 1);
    const density = Math.floor(lerp(1, 5, intensity));

    ctx.fillStyle = 'rgba(5, 15, 10, 0.15)';
    ctx.fillRect(0, 0, w, h);

    const particles = particlesRef.current;

    // Spawn new particles
    for (let i = 0; i < density; i++) {
      if (particles.length < 300) {
        const maxLife = 120 + Math.random() * 180;
        particles.push({
          x: Math.random() * w,
          y: h + 10,
          vy: -(0.5 + Math.random() * 2 * intensity),
          vx: (Math.random() - 0.5) * 0.8,
          size: 1 + Math.random() * 2.5 * intensity,
          life: 0,
          maxLife,
        });
      }
    }

    // Draw wave lines at bottom
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#55efc4';
    ctx.lineWidth = 1;
    for (let l = 0; l < 3; l++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y = h - 20 - l * 15 + Math.sin(x * 0.02 + t * 0.8 + l) * 8;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.x += p.vx + Math.sin(t * 2 + p.y * 0.01) * 0.3;
      p.y += p.vy;

      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.7 ? (1 - lifeRatio) / 0.3 : 1;

      if (p.life > p.maxLife || p.y < -20) {
        particles.splice(i, 1);
        continue;
      }

      const green = Math.round(lerp(180, 239, intensity));
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = `rgb(85, ${green}, 196)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Trail
      ctx.globalAlpha = alpha * 0.15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Activity hint
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#55efc4';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${(steps / 1000).toFixed(1)}k steps  ${activeMins}m active`, w / 2, h - 8);
    ctx.globalAlpha = 1;
  }, [focusDay]);

  const canvasRef = useCanvas(draw);

  return (
    <div className="art-window">
      <span className="art-window-label">Activity</span>
      <canvas ref={canvasRef} className="art-canvas" />
    </div>
  );
}

/* ── Stress: organic flow field ───────────────────────── */
// Smooth flowing lines — calm/recovered = smooth parallel curves in cool blue,
// stressed = turbulent crossing lines in warm amber/red.

function StressArt({ data, focusDay }: { data: DayRecord[]; focusDay: DayRecord | null }) {
  const linesRef = useRef<{ points: { x: number; y: number }[]; hue: number; speed: number }[]>([]);
  const initRef = useRef(false);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const stressHigh = focusDay?.stress?.stress_high ?? 60;
    const recoveryHigh = focusDay?.stress?.recovery_high ?? 120;
    const total = stressHigh + recoveryHigh || 1;
    const stressRatio = stressHigh / total; // 0 = fully recovered, 1 = fully stressed
    const turbulence = lerp(0.3, 2.5, stressRatio);

    if (!initRef.current || linesRef.current.length === 0) {
      const lines: typeof linesRef.current = [];
      const count = 25;
      for (let i = 0; i < count; i++) {
        const y = (i / count) * h;
        const pts: { x: number; y: number }[] = [];
        for (let x = 0; x <= w; x += 8) {
          pts.push({ x, y: y + (Math.random() - 0.5) * 10 });
        }
        lines.push({
          points: pts,
          hue: lerp(200, 30, stressRatio) + (Math.random() - 0.5) * 30,
          speed: 0.3 + Math.random() * 0.7,
        });
      }
      linesRef.current = lines;
      initRef.current = true;
    }

    ctx.fillStyle = `rgba(10, 8, 15, 0.08)`;
    ctx.fillRect(0, 0, w, h);

    for (const line of linesRef.current) {
      ctx.beginPath();
      const hue = lerp(200, 30, stressRatio) + Math.sin(t * 0.3 + line.hue * 0.01) * 15;
      const sat = lerp(40, 80, stressRatio);
      const light = lerp(50, 55, stressRatio);
      ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.35)`;
      ctx.lineWidth = 1.2;

      for (let i = 0; i < line.points.length; i++) {
        const p = line.points[i];
        // Flow field: noise-like displacement
        const noiseX = Math.sin(p.x * 0.008 + t * line.speed * 0.5) * turbulence;
        const noiseY = Math.cos(p.y * 0.01 + t * line.speed * 0.3 + p.x * 0.005) * turbulence * 8;
        const drawX = p.x + noiseX * 5;
        const drawY = p.y + noiseY;

        if (i === 0) ctx.moveTo(drawX, drawY);
        else ctx.lineTo(drawX, drawY);
      }
      ctx.stroke();
    }

    // Summary label
    const summary = focusDay?.stress?.day_summary ?? 'normal';
    const labelColor = stressRatio > 0.5
      ? `hsla(30, 70%, 60%, 0.3)`
      : `hsla(200, 50%, 60%, 0.3)`;
    ctx.globalAlpha = 1;
    ctx.fillStyle = labelColor;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(summary, w / 2, h - 8);
  }, [focusDay]);

  const canvasRef = useCanvas(draw);

  return (
    <div className="art-window">
      <span className="art-window-label">Stress</span>
      <canvas ref={canvasRef} className="art-canvas" />
    </div>
  );
}
