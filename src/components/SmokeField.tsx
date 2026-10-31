import React, { useEffect, useRef } from 'react';

/* Gold smoke and a few rising embers across the whole site, like the furnace
   the hero mark was poured in is still just off-screen. One fixed canvas,
   screen-blended so it only ever lightens: black stays black, text stays
   readable. It drifts with the scroll for depth, stops when the tab is hidden,
   and holds still for anyone with reduced motion turned on. */

const PUFFS = 16;
const EMBERS = 26;

type Puff = { x: number; y: number; r: number; vy: number; sway: number; ph: number; a: number; warm: boolean; depth: number };
type Ember = { x: number; y: number; vy: number; vx: number; sz: number; ph: number; fl: number; life: number; age: number };

function sprite(rgb: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, `rgba(${rgb},0.55)`);
  r.addColorStop(0.45, `rgba(${rgb},0.2)`);
  r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return c;
}

export function SmokeField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const warm = sprite('196,150,60');
    const ash = sprite('130,112,86');

    let w = 0;
    let h = 0;
    const size = () => {
      // smoke is soft anyway, so a lower-res canvas costs nothing visually
      w = cv.width = Math.ceil(window.innerWidth / 2);
      h = cv.height = Math.ceil(window.innerHeight / 2);
    };
    size();

    const puffs: Puff[] = Array.from({ length: PUFFS }, () => ({
      x: Math.random(),
      y: Math.random() * 1.3,
      r: 0.22 + Math.random() * 0.34,
      vy: 0.006 + Math.random() * 0.01,
      sway: 0.02 + Math.random() * 0.05,
      ph: Math.random() * 6.28,
      a: 0.18 + Math.random() * 0.32,
      warm: Math.random() < 0.65,
      depth: 0.05 + Math.random() * 0.2,
    }));
    const newEmber = (e?: Ember): Ember => {
      const n = e ?? ({} as Ember);
      n.x = Math.random();
      n.y = 1 + Math.random() * 0.2;
      n.vy = 0.03 + Math.random() * 0.06;
      n.vx = (Math.random() - 0.5) * 0.01;
      n.sz = 0.6 + Math.random() * 1.3;
      n.ph = Math.random() * 6.28;
      n.fl = 3 + Math.random() * 6;
      n.life = 8 + Math.random() * 10;
      n.age = e ? 0 : Math.random() * n.life;
      return n;
    };
    const embers: Ember[] = Array.from({ length: EMBERS }, () => newEmber());

    let raf = 0;
    let last = performance.now();
    let t = 0;

    const draw = () => {
      const scroll = window.scrollY / Math.max(1, window.innerHeight);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of puffs) {
        const r = p.r * h;
        const x = (p.x + p.sway * Math.sin(t * 0.15 + p.ph)) * w;
        let y = (((p.y - scroll * p.depth) % 1.3) + 1.3) % 1.3;
        y = (y - 0.15) * h;
        ctx.globalAlpha = p.a * (0.75 + 0.25 * Math.sin(t * 0.2 + p.ph));
        ctx.drawImage(p.warm ? warm : ash, x - r, y - r, r * 2, r * 2);
      }
      for (const e of embers) {
        const k = e.age / e.life;
        const x = (e.x + 0.015 * Math.sin(t * 0.8 + e.ph)) * w;
        const y = (e.y - k * e.vy * e.life) * h;
        const a = Math.sin(Math.PI * k) * (0.55 + 0.45 * Math.sin(t * e.fl + e.ph));
        const r = e.sz * 3;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,232,160,${a})`);
        g.addColorStop(0.3, `rgba(255,170,50,${a * 0.7})`);
        g.addColorStop(1, 'rgba(255,110,20,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      for (const p of puffs) {
        p.y -= p.vy * dt;
        if (p.y < -0.2) p.y += 1.3;
      }
      for (const e of embers) {
        e.age += dt;
        e.x += e.vx * dt;
        if (e.age > e.life) newEmber(e);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      if (still || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      size();
      draw();
    };
    const onScroll = () => {
      if (still) draw();
    };

    draw();
    start();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', start);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', start);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2] h-full w-full opacity-50 mix-blend-screen"
    />
  );
}
