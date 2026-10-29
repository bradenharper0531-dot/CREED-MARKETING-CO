export type Industry = "fiber" | "pest" | "starlink";

export type PayRules = {
  base: number | null;
  cap: number | null;
  step: number;
  bump: number;
  basis: "sold" | "installed";
};

/** A market as reps and the public see it. */
export type Market = {
  id: string;
  slug: string;
  name: string;
  industry: Industry;
  provider: string | null;
  leads: string | null;
  connect: number | null;
  connect_label: string | null;
  public_rate_label: string | null;
  pace: number | null;
  pace_tiers: { l: string; v: number }[] | null;
  notes: string[] | null;
  rep_base: number | null;
  rep_cap: number | null;
  rep_step: number | null;
  rep_bump: number | null;
  rep_basis: "sold" | "installed" | null;
  sort: number | null;
};

/** Owner-only full contract pay. Only ever loaded on the server for owners. */
export type MarketRate = PayRules & { market_id: string; owner_notes: string[] | null };

export type Rep = {
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  industry: "fiber" | "pest";
  market_id: string | null;
  recruited_by: "Braden" | "Peter" | null;
  start_date: string | null;
  status: "active" | "inactive";
  is_sample: boolean;
};

export type RepStat = { rep_id: string; day: string; sales: number; installs: number };

export type Stage = "new" | "contacted" | "interviewing" | "offer" | "signed" | "cold" | "not_fit";

export type Recruit = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  industry_interest: "fiber" | "pest" | "either" | null;
  preferred_market: string | null;
  pillar: Pillar | null;
  source: string | null;
  stage: Stage;
  owner_name: "Braden" | "Peter" | null;
  next_follow_up: string | null;
  last_touch: string | null;
  is_sample: boolean;
  created_at: string;
};

export type Note = { id: string; author_name: string | null; body: string; created_at: string };

export type Pillar = "physical" | "spiritual" | "mental" | "financial";
export const PILLARS: Pillar[] = ["physical", "spiritual", "mental", "financial"];

export type Checkin = {
  id?: string;
  user_id?: string;
  week_start: string;
  physical: number | null;
  spiritual: number | null;
  mental: number | null;
  financial: number | null;
  goals: Partial<Record<Pillar, string>> | null;
};

export const STAGES: { id: Stage; label: string; side?: boolean }[] = [
  { id: "new", label: "New lead" },
  { id: "contacted", label: "Contacted" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer out" },
  { id: "signed", label: "Signed" },
  { id: "cold", label: "Went cold", side: true },
  { id: "not_fit", label: "Not a fit", side: true },
];

export const stageStatus: Record<Stage, "new" | "progress" | "signed" | "lost"> = {
  new: "new",
  contacted: "new",
  interviewing: "progress",
  offer: "progress",
  signed: "signed",
  cold: "lost",
  not_fit: "lost",
};
