import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ModalShell } from './ModalShell.tsx';
import { labelClass, fieldClass } from '../lib/ui.ts';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} labelledBy="contact-title">
      {!submitted ? (
        <div>
          <h2 id="contact-title" className="font-display text-3xl font-semibold tracking-[0.04em] text-ink mb-2">Contact Creed</h2>
          <p className="text-sm text-ink-muted mb-6">
            Questions about a market, the pay or what the group is about? Send it here.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="contact-name" className={labelClass}>Name</label>
              <input id="contact-name" type="text" required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>

            <div>
              <label htmlFor="contact-email" className={labelClass}>Email</label>
              <input id="contact-email" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
            </div>

            <div>
              <label htmlFor="contact-message" className={labelClass}>Message</label>
              <textarea
                id="contact-message"
                rows={3}
                required
                placeholder="What do you want to know?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${fieldClass} resize-none`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-md bg-gold text-on-gold font-semibold text-sm hover:bg-gold-glow active:bg-gold-deep transition-colors cursor-pointer mt-2"
            >
              Send message
            </button>
          </form>
        </div>
      ) : (
        <div className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-gold-soft border border-gold flex items-center justify-center mx-auto mb-4 text-gold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 id="contact-title" className="font-display text-2xl font-semibold tracking-[0.04em] text-ink mb-2">Message sent</h3>
          <p className="text-sm text-ink-muted max-w-xs mx-auto mb-6">
            Thanks for reaching out. Someone from Creed will get back to you within 24 hours.
          </p>
          <button
            onClick={handleClose}
            className="py-2.5 px-6 rounded-md bg-gold text-on-gold font-semibold text-sm hover:bg-gold-glow transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </ModalShell>
  );
}
