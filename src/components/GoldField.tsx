import React, { useEffect, useRef } from 'react';

type Particle = { x: number; y: number; vx: number; vy: number; px: number; py: number; r: number; a: number };

/* The hero background: slow-rising gold dust on a canvas. Particles near the
   cursor are pushed away, brighten, and draw faint threads back to it. */
export function GoldField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const RADIUS = 140;
    const mouse = { x: -9999, y: -9999 };
    let w = 0;
    let h = 0;
    let raf = 0;
    let pts: Particle[] = [];

    const seed = () => {
      const count = Math.round(Math.min(140, (w * h) / 9000));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.25 + 0.05),
        px: 0,
        py: 0,
        r: Math.random() * 1.4 + 0.4,
        a: Math.random() * 0.45 + 0.15,
      }));
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduce) draw(false);
    };

    const draw = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        let boost = 0;
        if (animate) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < RADIUS * RADIUS) {
            const d = Math.sqrt(d2) || 1;
            const f = 1 - d / RADIUS;
            p.px += (dx / d) * f * 0.9;
            p.py += (dy / d) * f * 0.9;
            boost = f;
            ctx.strokeStyle = `rgba(245,197,24,${f * 0.22})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
          p.px *= 0.92;
          p.py *= 0.92;
          p.x += p.vx + p.px;
          p.y += p.vy + p.py;
          if (p.y < -10) {
            p.y = h + 10;
            p.x = Math.random() * w;
          }
          if (p.y > h + 10) p.y = -10;
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
        }
        ctx.fillStyle = `rgba(255,216,77,${Math.min(1, p.a + boost * 0.6)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + boost * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      draw(true);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (!reduce) {
      window.addEventListener('pointermove', onMove);
      document.documentElement.addEventListener('pointerleave', onLeave);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
