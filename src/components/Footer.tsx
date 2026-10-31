import React from 'react';
import { Logo } from './Logo.tsx';

export function Footer() {
  return (
    <footer className="w-full border-t border-line bg-bg px-6 sm:px-10 lg:px-16 py-12 text-ink">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <a href="#" className="group w-fit" aria-label="Creed — back to top">
            <Logo />
          </a>
          <p className="font-mono text-xs tracking-[0.14em] text-ink-muted uppercase">
            Physical · Spiritual · Mental · Financial
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
          <a href="#pillars" className="hover:text-gold transition-colors">Pillars</a>
          <a href="#markets" className="hover:text-gold transition-colors">Markets</a>
          <a href="#calculator" className="hover:text-gold transition-colors">Calculator</a>
          <a href="#how-it-works" className="hover:text-gold transition-colors">How It Works</a>
        </nav>
        <p className="font-mono text-xs text-ink-muted">© 2026 Creed Marketing</p>
      </div>
    </footer>
  );
}
