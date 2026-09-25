import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  const modalRootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // GSAP modal choreography adhering to gsap-react and gsap-performance skills
  useGSAP(
    () => {
      if (!isOpen) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          normalMotion: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          if (reduceMotion) {
            gsap.set(backdropRef.current, { opacity: 1 });
            gsap.set(dialogCardRef.current, { opacity: 1, y: 0, scale: 1 });
            return;
          }

          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

          tl.fromTo(
            backdropRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.25 }
          ).fromTo(
            dialogCardRef.current,
            { opacity: 0, y: 16, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1, duration: 0.32, clearProps: 'transform' },
            '<0.05'
          );
        }
      );

      return () => mm.revert();
    },
    { dependencies: [isOpen], scope: modalRootRef }
  );

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '4xl': 'sm:max-w-4xl',
  }[maxWidth];

  return (
    <div ref={modalRootRef} className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
        <div
          ref={dialogCardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`relative overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white text-left shadow-2xl w-full ${maxWidthClasses} border border-slate-200 flex flex-col max-h-[92vh]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
            <div>
              <h3 id="modal-title" className="text-base font-semibold text-slate-900 tracking-tight text-balance">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 text-pretty">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Close dialog"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto grow">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
