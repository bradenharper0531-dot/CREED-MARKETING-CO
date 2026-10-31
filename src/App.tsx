import React, { useState } from 'react';
import { ScrollProgress } from './components/ScrollProgress.tsx';
import { CursorGlow } from './components/CursorGlow.tsx';
import { SmokeField } from './components/SmokeField.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { Marquee } from './components/Marquee.tsx';
import { Pillars } from './components/Pillars.tsx';
import { Markets } from './components/Markets.tsx';
import { Calculator } from './components/Calculator.tsx';
import { HowItWorks } from './components/HowItWorks.tsx';
import { Footer } from './components/Footer.tsx';
import { ApplyModal } from './components/ApplyModal.tsx';
import { ContactModal } from './components/ContactModal.tsx';
import { SignInModal } from './components/SignInModal.tsx';
import { Dashboard } from './dashboard/Dashboard.tsx';
import { useHash, DASH } from './lib/route.ts';

export default function App() {
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const hash = useHash();

  /* Owner dashboard: /#/dashboard (owners only — see src/dashboard) */
  if (hash.startsWith(DASH)) {
    return (
      <>
        <Dashboard hash={hash} onSignIn={() => setIsSignInOpen(true)} />
        <SignInModal isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
      </>
    );
  }

  const handleSeePath = () => {
    const el = document.getElementById('pillars');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between selection:bg-gold selection:text-on-gold">
      {/* Global motion: scroll progress bar + cursor-following glow */}
      <ScrollProgress />
      <CursorGlow />
      <SmokeField />

      {/* Top Navigation */}
      <Navbar
        onApplyClick={() => setIsApplyOpen(true)}
        onContactClick={() => setIsContactOpen(true)}
        onSignInClick={() => setIsSignInOpen(true)}
      />

      <main className="flex-1">
        <Hero
          onApplyClick={() => setIsApplyOpen(true)}
          onSeePathClick={handleSeePath}
        />
        <Marquee />
        <Pillars />
        <Markets />
        <Calculator />
        <HowItWorks onApplyClick={() => setIsApplyOpen(true)} />
      </main>

      <Footer />

      {/* Interactive Modals */}
      <ApplyModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
      />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
      />
    </div>
  );
}
