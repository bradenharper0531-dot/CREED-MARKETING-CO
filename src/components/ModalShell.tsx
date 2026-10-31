import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  maxWidth?: string;
  children: React.ReactNode;
}

/* Shared modal frame: centred card over a blurred backdrop.
   Closes on the × button, a backdrop click, or Escape; locks page scroll while open. */
export function ModalShell({ isOpen, onClose, labelledBy, maxWidth = 'max-w-md', children }: ModalShellProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} max-h-[calc(100vh-2rem)] overflow-y-auto bg-surface border border-line rounded-[10px] p-6 sm:p-8 text-ink`}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-ink-muted hover:text-gold transition-colors p-1 rounded-md focus-visible:outline-2 focus-visible:outline-gold"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
