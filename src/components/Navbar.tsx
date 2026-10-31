import React, { useEffect, useRef, useState } from 'react';
import { Logo } from './Logo.tsx';
import { Menu, X, LogOut, LayoutDashboard, Calculator } from 'lucide-react';
import { useAuth, initials } from '../lib/auth.tsx';
import { DASH } from '../lib/route.ts';

/* Signed-in account button + dropdown (desktop) */
function AccountMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!profile) return null;
  const item = 'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface-raised hover:text-gold transition-colors cursor-pointer';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-deep bg-bg font-mono text-xs text-gold hover:border-gold transition-colors cursor-pointer"
      >
        {initials(profile.fullName || profile.email)}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-64 rounded-[10px] border border-line bg-surface p-1.5 shadow-none">
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{profile.fullName}</p>
            <p className="truncate text-xs text-ink-muted">{profile.email}</p>
            <span className={`mt-2 inline-block rounded-[4px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${profile.role === 'owner' ? 'bg-gold text-on-gold' : 'bg-gold-soft text-gold'}`}>
              {profile.role === 'owner' ? 'Owner' : 'Rep'}
            </span>
          </div>
          <div className="pt-1.5">
            <a href="#calculator" onClick={() => setOpen(false)} className={item}>
              <Calculator className="h-4 w-4 text-gold" /> {profile.role === 'owner' ? 'Margin plan' : 'My growth plan'}
            </a>
            {profile.role === 'owner' && (
              <a href={DASH} onClick={() => setOpen(false)} className={item}>
                <LayoutDashboard className="h-4 w-4 text-gold" /> Owner dashboard
              </a>
            )}
            <button onClick={() => { setOpen(false); signOut(); }} className={item}>
              <LogOut className="h-4 w-4 text-gold" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface NavbarProps {
  onApplyClick?: () => void;
  onContactClick?: () => void;
  onSignInClick?: () => void;
}

export function Navbar({ onApplyClick, onContactClick, onSignInClick }: NavbarProps) {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { name: 'Pillars', href: '#pillars' },
    { name: 'Markets', href: '#markets' },
    { name: 'Calculator', href: '#calculator' },
    { name: 'How It Works', href: '#how-it-works' },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-6 sm:px-10 lg:px-16 pt-4 sm:pt-5 pb-2 text-ink">
      <div className="max-w-[1400px] mx-auto">
        {/* Translucent pill bar — deepens once the page scrolls */}
        <div
          className={`relative flex items-center justify-between gap-4 rounded-full border backdrop-blur-2xl px-5 sm:px-7 py-2.5 sm:py-3 transition-colors duration-300 ${
            scrolled ? 'border-line bg-bg/80' : 'border-white/10 bg-white/[0.04]'
          }`}
        >
          {/* Left Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-nav font-medium text-ink-muted">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="hover:text-gold transition-colors duration-200"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Center Logo */}
          <div className="flex items-center justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            <a href="#" className="flex items-center group" aria-label="Creed — back to top">
              <Logo />
            </a>
          </div>

          {/* Right Navigation & CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              onClick={onContactClick}
              className="text-nav font-medium text-ink-muted hover:text-gold transition-colors duration-200 cursor-pointer mr-1"
            >
              Contact
            </button>
            {profile ? (
              <AccountMenu />
            ) : (
              <button
                onClick={onSignInClick}
                className="text-nav font-semibold text-ink bg-surface hover:text-gold border border-line hover:border-gold-deep px-4 py-2 rounded-md transition-colors duration-200 cursor-pointer"
              >
                Log in
              </button>
            )}
            <button
              onClick={onApplyClick}
              className="bg-gold text-on-gold font-semibold text-nav px-[18px] py-2 rounded-md hover:bg-gold-glow active:bg-gold-deep transition-colors duration-200 cursor-pointer"
            >
              Apply
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="lg:hidden flex items-center gap-3">
            <button
              onClick={onApplyClick}
              className="bg-gold text-on-gold font-semibold text-nav px-3.5 py-1.5 rounded-md hover:bg-gold-glow transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-ink-muted hover:text-gold focus-visible:outline-2 focus-visible:outline-gold rounded-md"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 rounded-[10px] border border-line bg-bg/95 backdrop-blur-2xl px-6 py-6 space-y-4">
            <div className="flex flex-col space-y-3 pb-4 border-b border-line text-[15px]">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-ink-muted hover:text-gold py-1 transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
            <div className="flex flex-col space-y-3 pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onContactClick?.();
                }}
                className="text-left text-ink-muted hover:text-gold py-1 text-[15px]"
              >
                Contact
              </button>
              {profile ? (
                <>
                  <p className="pt-1 text-[13px] text-ink-muted">
                    Logged in as <span className="text-ink">{profile.fullName || profile.email}</span>{' '}
                    <span className="font-mono text-[11px] uppercase text-gold">· {profile.role}</span>
                  </p>
                  {profile.role === 'owner' && (
                    <a href={DASH} onClick={() => setMobileMenuOpen(false)} className="text-left text-ink-muted hover:text-gold py-1 text-[15px]">Owner dashboard</a>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="text-left text-ink-muted hover:text-gold py-1 text-[15px]"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignInClick?.();
                  }}
                  className="text-left text-ink-muted hover:text-gold py-1 text-[15px]"
                >
                  Log in
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
