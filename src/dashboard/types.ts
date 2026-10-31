/* Shapes of the owner-only tables (see supabase/schema.sql). */

export type Stage = 'new' | 'contacted' | 'interviewing' | 'offer' | 'signed' | 'cold' | 'not_fit';
export type Tone = 'new' | 'progress' | 'signed' | 'lost';
export type Pillar = 'physical' | 'spiritual' | 'mental' | 'financial';
export type OwnerName = 'Braden' | 'Peter';

export const STAGES: { id: Stage; label: string; side?: boolean }[] = [
  { id: 'new', label: 'New lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer out' },
  { id: 'signed', label: 'Signed' },
  { id: 'cold', label: 'Went cold', side: true },
  { id: 'not_fit', label: 'Not a fit', side: true },
];

export const stageTone: Record<Stage, Tone> = {
  new: 'new',
  contacted: 'new',
  interviewing: 'progress',
  offer: 'progress',
  signed: 'signed',
  cold: 'lost',
  not_fit: 'lost',
};

export const PILLAR_LABEL: Record<Pillar, string> = { physical: 'Physical', spiritual: 'Spiritual', mental: 'Mental', financial: 'Financial' };

export interface Recruit {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  industry_interest: 'fiber' | 'pest' | 'either' | null;
  preferred_market: string | null;
  pillar: Pillar | null;
  source: string | null;
  stage: Stage;
  owner_name: OwnerName | null;
  next_follow_up: string | null;
  start_date: string | null;
  has_car: boolean | null;
  has_license: boolean | null;
  last_touch: string | null;
  signed_at: string | null;
  is_sample: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  author_name: string | null;
  body: string;
  created_at: string;
  recruit_id?: string;
  rep_id?: string;
}

export interface Rep {
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  industry: 'fiber' | 'pest';
  market_id: string | null;
  recruited_by: OwnerName | null;
  start_date: string | null;
  status: 'active' | 'inactive';
  is_sample: boolean;
}

export interface RepStat {
  rep_id: string;
  day: string;
  sales: number;
  installs: number;
}

export interface MarketRow {
  id: string;
  name: string;
  industry: 'fiber' | 'pest' | 'starlink';
  sort: number | null;
}
