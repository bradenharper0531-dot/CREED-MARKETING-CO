import React from 'react';
import { Dumbbell, Sun, Brain, TrendingUp, Diamond } from 'lucide-react';
import { Reveal } from './Reveal.tsx';
import { trackSpotlight } from '../lib/spotlight.ts';

export function Pillars() {
  const pillars = [
    {
      icon: Dumbbell,
      title: 'Physical',
      principle: 'Outwork anyone at the door.',
      description: 'Early mornings, training and taking care of your body, so you still have energy at the last door of the day.',
    },
    {
      icon: Sun,
      title: 'Spiritual',
      principle: 'Know why you knock.',
      description: 'Faith, gratitude and purpose — the reason behind the reps when the day gets hard.',
    },
    {
      icon: Brain,
      title: 'Mental',
      principle: 'Rejection is the gym.',
      description: 'Discipline, reading, mentorship and the mindset that turns a no into the next yes.',
    },
    {
      icon: TrendingUp,
      title: 'Financial',
      principle: 'Earn it. Then build with it.',
      description: 'Earning, saving, investing and building ownership instead of spending it.',
    },
  ];

  const day = ['Morning training', 'Team meeting', 'Doors', 'Debrief', 'Evening reset'];

  return (
    <section id="pillars" className="w-full bg-bg py-24 sm:py-32 px-6 sm:px-10 lg:px-16 text-ink">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-gold-soft text-gold font-mono text-eyebrow font-medium uppercase mb-5">
            <Diamond className="w-3 h-3" />
            The Creed
          </div>
          <h2 className="font-display text-display-xs sm:text-display-sm font-semibold text-ink">
            Sales is the vehicle. Becoming more is the point.
          </h2>
          <p className="mt-5 text-lede text-ink-muted">
            Creed is a self-development group. Door-to-door sales forces discipline, confidence, resilience and communication — so we use it to build people physically, spiritually, mentally and financially. The money is one of four results, not the whole point.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.title} delay={i * 90}>
                <div
                  onPointerMove={trackSpotlight}
                  className="spotlight h-full p-7 rounded-[10px] bg-surface border border-line hover:border-gold-deep transition-colors duration-300 group"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-11 h-11 rounded-md bg-gold-soft border border-gold-deep/40 flex items-center justify-center text-gold group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <span className="font-mono text-xs text-ink-muted tabular">0{i + 1} / 04</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold tracking-[0.04em] text-ink">{pillar.title}</h3>
                  <p className="mt-2 text-[15px] font-semibold text-gold">{pillar.principle}</p>
                  <p className="mt-3 text-sm text-ink-muted leading-relaxed">{pillar.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* A day in the life */}
        <Reveal className="mt-16">
          <div className="rounded-[10px] border border-line bg-surface p-6 sm:p-8">
            <p className="font-mono text-eyebrow text-gold uppercase mb-6">A day in the life</p>
            <ol className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-0">
              {day.map((step, i) => (
                <li key={step} className="relative flex sm:flex-col items-center sm:items-start gap-3 sm:gap-4 sm:pr-4">
                  <span className="flex items-center w-full gap-3">
                    <span className="w-2.5 h-2.5 shrink-0 rotate-45 bg-gold" />
                    {i < day.length - 1 && <span className="hidden sm:block h-px flex-1 bg-line" />}
                  </span>
                  <span className="sm:mt-0 text-[15px] font-semibold text-ink whitespace-nowrap">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
