import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, CalendarCheck } from 'lucide-react';
import { ModalShell } from './ModalShell.tsx';
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

const EMPTY = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  industry: '',
  experience: '',
  company: '', // honeypot — real people never see or fill this
};

const EXPERIENCE_MAX = 600;

export function ApplyModal({ isOpen, onClose }: ApplyModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(EMPTY);

  const update = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
    /* Lands in the recruiting pipeline as a "New lead" and emails Braden and Peter
       (supabase/functions/new-applicant-email). The database only lets the public
       INSERT a new lead — nobody can read applications back but owners and team leads. */
    const { error } = await supabase.from('recruits').insert({
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.slice(0, 120),
      phone: formData.phone.trim().slice(0, 40),
      email: formData.email.trim().toLowerCase().slice(0, 160),
      industry_interest: formData.industry === 'pest' ? 'pest' : 'fiber',
      experience: formData.experience.trim().slice(0, EXPERIENCE_MAX),
      source: 'Website application',
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

  const firstName = formData.firstName.trim() || 'friend';
  const book = bookingLink(`${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(), formData.email.trim());

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} labelledBy="apply-title" maxWidth="max-w-lg">
      {!submitted ? (
        <div>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-[4px] bg-gold-soft text-gold font-mono text-eyebrow font-medium uppercase mb-4">
            Application
          </div>
          <h2 id="apply-title" className="font-display text-3xl font-semibold tracking-[0.04em] text-ink">Apply to Creed</h2>
          <p className="text-sm text-ink-muted mt-2 mb-6">
            One minute. Braden and Peter read every one.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="apply-first" className={labelClass}>First name</label>
                <input id="apply-first" type="text" required autoComplete="given-name" value={formData.firstName} onChange={update('firstName')} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="apply-last" className={labelClass}>Last name</label>
                <input id="apply-last" type="text" required autoComplete="family-name" value={formData.lastName} onChange={update('lastName')} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="apply-phone" className={labelClass}>Phone</label>
                <input id="apply-phone" type="tel" required autoComplete="tel" placeholder="(555) 555-5555" value={formData.phone} onChange={update('phone')} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="apply-email" className={labelClass}>Email</label>
                <input id="apply-email" type="email" required autoComplete="email" placeholder="you@email.com" value={formData.email} onChange={update('email')} className={fieldClass} />
              </div>
            </div>

            <fieldset>
              <legend className={labelClass}>Which are you applying for?</legend>
              <div className="grid grid-cols-2 gap-3">
                {([['fiber', 'Fiber'], ['pest', 'Pest control']] as const).map(([v, label]) => (
                  <label
                    key={v}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${
                      formData.industry === v ? 'border-gold bg-gold-soft text-gold' : 'border-line text-ink-muted hover:border-ink-muted hover:text-ink'
                    }`}
                  >
                    <input type="radio" name="industry" value={v} required checked={formData.industry === v} onChange={update('industry')} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="apply-experience" className={labelClass}>Previous work experience</label>
                <span className="font-mono text-[11px] text-ink-muted">{formData.experience.length}/{EXPERIENCE_MAX}</span>
              </div>
              <textarea
                id="apply-experience"
                required
                rows={3}
                maxLength={EXPERIENCE_MAX}
                placeholder="A few sentences: jobs you've had, sales or customer-facing work, sports, anything you're proud of."
                value={formData.experience}
                onChange={update('experience')}
                className={`${fieldClass} resize-y`}
              />
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
              : <>Thank you, {firstName}. Braden or Peter will reach out at <span className="text-ink font-medium font-mono">{formData.phone}</span> soon.</>}
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
