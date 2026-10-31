import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, CalendarCheck } from 'lucide-react';
import { ModalShell } from './ModalShell.tsx';
import { MARKET_CARDS } from '../data/markets.ts';
import { labelClass, fieldClass } from '../lib/ui.ts';
import { supabase } from '../lib/supabase.ts';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* Where applicants book their interview (Calendly, Cal.com, Google booking page…).
   Name and email ride along so the booking form comes pre-filled where supported. */
const BOOKING_URL = (import.meta.env.VITE_BOOKING_URL as string | undefined) || '';

function bookingLink(name: string, email: string) {
  if (!BOOKING_URL) return '';
  try {
    const u = new URL(BOOKING_URL);
    if (name) u.searchParams.set('name', name);
    if (email) u.searchParams.set('email', email);
    return u.toString();
  } catch {
    return BOOKING_URL;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  instagram: '',
  industry: 'Either',
  market: 'Not sure yet',
  pillar: 'Physical',
  startDate: '',
  car: '',
  license: '',
  heardFrom: '',
  company: '', // honeypot — real people never see or fill this
};

export function ApplyModal({ isOpen, onClose }: ApplyModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(EMPTY);

  const update = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.company) {
      setSubmitted(true); // bot — pretend it worked, save nothing
      return;
    }
    if (!supabase) {
      setError('Applications aren’t connected yet. DM us on Instagram in the meantime.');
      return;
    }
    setSending(true);
    /* Lands in the owners' recruiting pipeline as a "New lead". The database only
       lets the public INSERT a new lead — nobody can read applications back but owners. */
    const { error } = await supabase.from('recruits').insert({
      name: formData.name.trim().slice(0, 120),
      phone: formData.phone.trim().slice(0, 40),
      email: formData.email.trim().toLowerCase().slice(0, 160),
      instagram: formData.instagram.trim().slice(0, 60) || null,
      industry_interest: formData.industry === 'Fiber' ? 'fiber' : formData.industry === 'Pest control' ? 'pest' : 'either',
      preferred_market: formData.market === 'Not sure yet' ? null : formData.market,
      pillar: formData.pillar.toLowerCase(),
      start_date: formData.startDate || null,
      has_car: formData.car === 'yes',
      has_license: formData.license === 'yes',
      source: formData.heardFrom.trim().slice(0, 120) || null,
      stage: 'new',
    });
    setSending(false);
    if (error) {
      setError('Something went wrong sending that. Try again, or DM us on Instagram.');
      return;
    }
    setSubmitted(true);
  };

  const handleClose = () => {
    if (submitted) setFormData(EMPTY);
    setSubmitted(false);
    setError('');
    onClose();
  };

  const firstName = formData.name.trim().split(' ')[0] || 'friend';
  const book = bookingLink(formData.name.trim(), formData.email.trim());

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} labelledBy="apply-title" maxWidth="max-w-lg">
      {!submitted ? (
        <div>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-[4px] bg-gold-soft text-gold font-mono text-eyebrow font-medium uppercase mb-4">
            Application
          </div>
          <h2 id="apply-title" className="font-display text-3xl font-semibold tracking-[0.04em] text-ink">Apply to Creed</h2>
          <p className="text-sm text-ink-muted mt-2 mb-6">
            Two minutes. Send it, then book your interview on the next screen.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="apply-name" className={labelClass}>Name</label>
                <input id="apply-name" type="text" required autoComplete="name" placeholder="Your name" value={formData.name} onChange={update('name')} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="apply-phone" className={labelClass}>Phone</label>
                <input id="apply-phone" type="tel" required autoComplete="tel" placeholder="(555) 555-5555" value={formData.phone} onChange={update('phone')} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="apply-email" className={labelClass}>Email</label>
                <input id="apply-email" type="email" required autoComplete="email" placeholder="you@email.com" value={formData.email} onChange={update('email')} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="apply-ig" className={labelClass}>Instagram</label>
                <input id="apply-ig" type="text" placeholder="@handle" value={formData.instagram} onChange={update('instagram')} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="apply-industry" className={labelClass}>Industry interest</label>
                <select id="apply-industry" value={formData.industry} onChange={update('industry')} className={fieldClass}>
                  <option value="Fiber">Fiber</option>
                  <option value="Pest control">Pest control</option>
                  <option value="Either">Either</option>
                </select>
              </div>
              <div>
                <label htmlFor="apply-market" className={labelClass}>Preferred market</label>
                <select id="apply-market" value={formData.market} onChange={update('market')} className={fieldClass}>
                  <option value="Not sure yet">Not sure yet</option>
                  {MARKET_CARDS.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="apply-start" className={labelClass}>Available to start</label>
                <input id="apply-start" type="date" required min={today()} value={formData.startDate} onChange={update('startDate')} className={`${fieldClass} font-mono`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="apply-car" className={labelClass}>Have a car?</label>
                  <select id="apply-car" required value={formData.car} onChange={update('car')} className={fieldClass}>
                    <option value="" disabled>Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="apply-license" className={labelClass}>License?</label>
                  <select id="apply-license" required value={formData.license} onChange={update('license')} className={fieldClass}>
                    <option value="" disabled>Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="apply-pillar" className={labelClass}>Which pillar do you most want to grow?</label>
              <select id="apply-pillar" value={formData.pillar} onChange={update('pillar')} className={fieldClass}>
                <option value="Physical">Physical</option>
                <option value="Spiritual">Spiritual</option>
                <option value="Mental">Mental</option>
                <option value="Financial">Financial</option>
              </select>
            </div>

            <div>
              <label htmlFor="apply-heard" className={labelClass}>How did you hear about us?</label>
              <input id="apply-heard" type="text" placeholder="A friend, Instagram, a rep at your door…" value={formData.heardFrom} onChange={update('heardFrom')} className={fieldClass} />
            </div>

            {/* honeypot */}
            <input
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={formData.company}
              onChange={update('company')}
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />

            {error && <p role="alert" className="rounded-md border border-[#d9705f] px-3 py-2 text-sm text-[#d9705f]">{error}</p>}

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 px-6 rounded-md bg-gold text-on-gold font-semibold text-sm hover:bg-gold-glow active:bg-gold-deep transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{sending ? 'Sending…' : 'Send application'}</span>
                {!sending && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-gold-soft border border-gold flex items-center justify-center mx-auto mb-4 text-gold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 id="apply-title" className="font-display text-2xl font-semibold tracking-[0.04em] text-ink mb-2">Application received</h3>
          <p className="text-sm text-ink-muted max-w-sm mx-auto mb-6">
            {book
              ? <>You&apos;re in the pipeline, {firstName}. Last step — pick a time for your interview with Braden or Peter.</>
              : <>Thank you, {firstName}. One of the owners will reach out at <span className="text-ink font-medium font-mono">{formData.phone}</span> soon. Start with the {formData.pillar.toLowerCase()} pillar today.</>}
          </p>
          {book ? (
            <div className="flex flex-col items-center gap-3">
              <a
                href={book}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 py-3 px-6 rounded-md bg-gold text-on-gold font-semibold text-sm hover:bg-gold-glow transition-colors"
              >
                <CalendarCheck className="w-4 h-4" />
                Book your interview
              </a>
              <button onClick={handleClose} className="text-sm text-ink-muted hover:text-gold transition-colors cursor-pointer">
                I&apos;ll book later
              </button>
            </div>
          ) : (
            <button
              onClick={handleClose}
              className="py-2.5 px-6 rounded-md bg-gold text-on-gold font-semibold text-sm hover:bg-gold-glow transition-colors cursor-pointer"
            >
              Back to the site
            </button>
          )}
        </div>
      )}
    </ModalShell>
  );
}
