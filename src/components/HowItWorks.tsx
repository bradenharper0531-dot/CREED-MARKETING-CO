import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal.tsx';
import { trackSpotlight } from '../lib/spotlight.ts';

interface HowItWorksProps {
  onApplyClick?: () => void;
}

export function HowItWorks({ onApplyClick }: HowItWorksProps) {
  const steps = [
    {
      n: '01',
      title: 'Apply',
      body: "Two minutes. Tell us who you are, which market you want and which pillar you most want to grow.",
    },
    {
      n: '02',
      title: 'Train with the team',
      body: 'Learn the pitch, the product and the routine. Mornings, meetings and doors — together.',
    },
    {
      n: '03',
      title: 'Hit your market',
      body: 'Travel to a market, knock with the group, and watch all four pillars move at the same time.',
    },
  ];

  return (
    <section id="how-it-works" className="w-full bg-[#080807] border-t border-line py-24 sm:py-32 px-6 sm:px-10 lg:px-16 text-ink">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-gold-soft text-gold font-mono text-eyebrow font-medium uppercase mb-5">
            <ArrowRight className="w-3 h-3" />
            How It Works
          </div>
          <h2 className="font-display text-display-xs sm:text-display-sm font-semibold text-ink">
            Three steps in.
          </h2>
        </Reveal>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <li key={s.n}>
              <Reveal delay={i * 120} className="h-full">
                <div
                  onPointerMove={trackSpotlight}
                  className="spotlight h-full rounded-[10px] border border-line bg-surface p-8 hover:border-gold-deep transition-colors duration-300"
                >
                  <span className="font-mono text-sm text-gold tabular">{s.n} / 03</span>
                  <h3 className="mt-6 font-display text-3xl font-semibold tracking-[0.04em] text-ink">{s.title}</h3>
                  <p className="mt-3 text-[15px] text-ink-muted leading-relaxed">{s.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        {/* Closing CTA banner */}
        <Reveal className="mt-20">
          <div
            onPointerMove={trackSpotlight}
            className="spotlight p-8 sm:p-12 rounded-[10px] bg-surface border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8"
          >
            <div>
              <h3 className="font-display text-display-xs font-semibold text-ink">Become more with Creed.</h3>
              <p className="text-[15px] text-ink-muted mt-3">Two-minute application. Tell us which pillar you most want to grow.</p>
            </div>
            <button
              onClick={onApplyClick}
              className="shrink-0 px-8 py-3.5 rounded-md bg-gold text-on-gold font-semibold text-[15px] hover:bg-gold-glow hover:-translate-y-0.5 active:translate-y-0 active:bg-gold-deep transition-all duration-200 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
