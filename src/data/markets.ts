import type { CalcMarket } from '../lib/payPlan.ts';

/* Calculator presets — the same locked numbers as the Creed Co Fiber Growth Plan (rep pay). */
export const CALC_MARKETS: CalcMarket[] = [
  { name: 'Laie / Honolulu', leads: '80,000', connect: 65, connectLabel: '60–70%', provider: null, base: 150, cap: 225, step: 20, bump: 25, basis: 'sold', pace: 2 },
  {
    name: 'Utah', leads: 'Hundreds of thousands (all of Utah)', connect: 85, connectLabel: '85%', provider: 'Utopia Fiber', base: 150, cap: 225, step: 20, bump: 25, basis: 'sold', pace: 3,
    paceTiers: [
      { l: 'Avg 2–4', v: 3 },
      { l: 'Decent 5–7', v: 6 },
      { l: 'Dawgs 8–12', v: 10 },
    ],
  },
  { name: 'Arizona', leads: null, connect: 80, connectLabel: '80% (depends on ISP)', provider: 'Varies by ISP', base: 150, cap: 225, step: 20, bump: 25, basis: 'sold', pace: 2 },
  { name: 'Minnesota', leads: null, connect: 80, connectLabel: '80% (est.)', provider: null, base: 150, cap: 225, step: 20, bump: 25, basis: 'sold', pace: 2 },
  { name: 'Indiana', leads: null, connect: 90, connectLabel: '90%', provider: 'T-Fiber', base: 150, cap: 225, step: 20, bump: 25, basis: 'sold', pace: 2 },
  { name: 'Missouri', leads: null, connect: 80, connectLabel: '80% (est.)', provider: null, base: 150, cap: 225, step: 20, bump: 25, basis: 'sold', pace: 2 },
];

export type Industry = 'fiber' | 'pest' | 'starlink';

export interface MarketCard {
  name: string;
  industry: Industry;
  provider: string | null;
  leads: string | null;
  connect: string | null;
  pay: string | null;
  pace?: string[];
}

/* Public market cards. Missing values render as "—", never invented. */
export const MARKET_CARDS: MarketCard[] = [
  ...CALC_MARKETS.map((m): MarketCard => ({
    name: m.name,
    industry: 'fiber',
    provider: m.provider,
    leads: m.leads,
    connect: m.connectLabel,
    pay: `$${m.base} → $${m.cap}`,
    pace: m.paceTiers?.map((t) => t.l),
  })),
  { name: 'Wyoming', industry: 'fiber', provider: null, leads: null, connect: null, pay: null },
  { name: 'Starlink', industry: 'starlink', provider: 'Starlink', leads: null, connect: null, pay: '$100 / $175 / $250 by tier' },
];
