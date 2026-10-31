/* Pay engine — ported line for line from the Creed Co Fiber Growth Plan calculator.
   Rate = base + bump for every `step` accounts in the month, capped. The raise applies
   to every account sold that month and resets on the 1st. */

export interface PayRule {
  base: number;
  cap: number;
  step: number;
  bump: number;
  basis: 'sold' | 'installed';
}

export interface CalcMarket extends PayRule {
  name: string;
  leads: string | null;
  connect: number;
  connectLabel: string;
  provider: string | null;
  pace: number;
  paceTiers?: { l: string; v: number }[];
}

export function rules(r: PayRule, ir: number, extra = 0) {
  const base = r.base + extra;
  const cap = r.cap;
  const step = Math.max(1, r.step || 1);
  const bump = r.bump || 0;
  const counted = (s: number) => Math.floor(r.basis === 'installed' ? s * ir : s);
  const rateAt = (s: number) => Math.min(cap, base + bump * Math.floor(counted(s) / step));
  return { base, cap, step, bump, basis: r.basis, counted, rateAt, payAt: (s: number) => s * ir * rateAt(s) };
}

export type Rules = ReturnType<typeof rules>;

/* Splits n work days into this month's remainder (dl days, on top of `prior` sold),
   then full months of wdm days each; every month is paid at its own tier. */
export function projector(R: Rules, prior: number, dl: number, wdm: number) {
  return (pace: number, n: number) => {
    let rem = Math.max(0, n);
    const c1 = Math.min(rem, dl);
    const months = [prior + pace * c1];
    rem -= c1;
    if (wdm > 0) {
      while (rem > 1e-9) {
        const c = Math.min(rem, wdm);
        months.push(pace * c);
        rem -= c;
      }
    }
    return {
      pay: months.reduce((a, m) => a + R.payAt(m), 0),
      sold: prior + pace * Math.max(0, n),
      rate: R.rateAt(months[months.length - 1]),
    };
  };
}

export const money = (n: number) => (Number.isFinite(n) ? '$' + Math.round(n).toLocaleString('en-US') : '—');

export const num = (n: number, d = 1) =>
  Number.isFinite(n) ? (+n).toLocaleString('en-US', { maximumFractionDigits: d }) : '—';

export function autoDaysLeft(daysPerWeek: number) {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.round((end - d.getDate() + 1) * (Math.min(7, daysPerWeek || 0) / 7));
}
