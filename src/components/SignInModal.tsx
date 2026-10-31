import React, { useEffect, useState } from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { ModalShell } from './ModalShell.tsx';
import { labelClass, fieldClass } from '../lib/ui.ts';
import { supabase, isConfigured } from '../lib/supabase.ts';
import { useAuth } from '../lib/auth.tsx';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

const TITLES: Record<Mode, string> = {
  signin: 'Log in to Creed',
  signup: 'Create your account',
  forgot: 'Reset your password',
  reset: 'Set a new password',
};

const SUBTITLES: Record<Mode, string> = {
  signin: 'Your plan, your numbers and your pillar check-ins.',
  signup: 'One account for the site, your growth plan and your check-ins.',
  forgot: "Enter your email and we'll send you a reset link.",
  reset: 'Choose a new password for your account.',
};

/* Friendlier wording for the errors people actually hit */
function explain(message: string) {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match an account.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email first — check your inbox for the link.';
  if (/already registered/i.test(message)) return 'That email already has an account. Log in instead.';
  if (/rate limit/i.test(message)) return 'Too many tries. Wait a minute and try again.';
  return message;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const { recovering, doneRecovering } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Opening a reset link from the email lands here in "set a new password" mode
  useEffect(() => {
    if (recovering) setMode('reset');
  }, [recovering]);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError('');
    setNotice('');
    setPassword('');
  };

  const handleClose = () => {
    switchTo('signin');
    if (recovering) doneRecovering();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsLoading(true);
    setError('');
    setNotice('');
    const site = window.location.origin + window.location.pathname;
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        handleClose();
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: site },
        });
        if (error) throw error;
        if (data.session) handleClose();
        else setNotice(`Check ${email.trim()} for a link to confirm your account, then log in.`);
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: site });
        if (error) throw error;
        setNotice('If that email has an account, a reset link is on its way.');
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        doneRecovering();
        setNotice('Password updated. You’re logged in.');
        setTimeout(handleClose, 1200);
      }
    } catch (err) {
      setError(explain(err instanceof Error ? err.message : 'Something went wrong.'));
    } finally {
      setIsLoading(false);
    }
  };

  const busyLabel = { signin: 'Logging in…', signup: 'Creating account…', forgot: 'Sending…', reset: 'Saving…' }[mode];
  const submitLabel = { signin: 'Log in', signup: 'Create account', forgot: 'Send reset link', reset: 'Save password' }[mode];
  const open = isOpen || recovering;

  return (
    <ModalShell isOpen={open} onClose={handleClose} labelledBy="signin-title">
      <div>
        <div className="w-10 h-10 rounded-md bg-bg border border-line flex items-center justify-center mb-4 text-gold">
          <Lock className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <h2 id="signin-title" className="font-display text-3xl font-semibold tracking-[0.04em] text-ink mb-2">{TITLES[mode]}</h2>
        <p className="text-sm text-ink-muted mb-6">{SUBTITLES[mode]}</p>

        {!isConfigured ? (
          <div className="rounded-md border border-dashed border-gold px-4 py-3 text-sm text-gold">
            Logins aren&apos;t connected yet. Add the Supabase keys to <span className="font-mono">.env</span> (see README) and reload.
          </div>
        ) : (
          <>
            {(mode === 'signin' || mode === 'signup') && (
              <div className="mb-5 inline-flex rounded-full border border-line p-1" role="group" aria-label="Log in or sign up">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => switchTo(m)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                      mode === m ? 'bg-gold text-on-gold' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {m === 'signin' ? 'Log in' : 'Sign up'}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="signin-name" className={labelClass}>Full name</label>
                  <input id="signin-name" type="text" required autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
                </div>
              )}

              {mode !== 'reset' && (
                <div>
                  <label htmlFor="signin-email" className={labelClass}>Email</label>
                  <input id="signin-email" type="email" required autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
                </div>
              )}

              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="signin-password" className={labelClass}>{mode === 'reset' ? 'New password' : 'Password'}</label>
                  <input
                    id="signin-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldClass}
                  />
                  {mode !== 'signin' && <p className="mt-1.5 text-xs text-ink-muted">At least 8 characters.</p>}
                </div>
              )}

              {error && <p role="alert" className="rounded-md border border-[#d9705f] px-3 py-2 text-sm text-[#d9705f]">{error}</p>}
              {notice && (
                <p className="flex items-start gap-2 rounded-md border border-[#7ad19a] px-3 py-2 text-sm text-[#7ad19a]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-md bg-gold text-on-gold font-semibold text-sm hover:bg-gold-glow active:bg-gold-deep transition-colors cursor-pointer mt-2 disabled:opacity-50"
              >
                {isLoading ? busyLabel : submitLabel}
              </button>
            </form>

            <div className="mt-4 text-sm">
              {mode === 'signin' && (
                <button type="button" onClick={() => switchTo('forgot')} className="text-ink-muted hover:text-gold transition-colors cursor-pointer">
                  Forgot password?
                </button>
              )}
              {mode === 'forgot' && (
                <button type="button" onClick={() => switchTo('signin')} className="text-ink-muted hover:text-gold transition-colors cursor-pointer">
                  ← Back to log in
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
