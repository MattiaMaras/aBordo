import React, { useEffect, useRef } from 'react';

interface ModalProps {
  onClose: () => void;
  /** id dell'elemento che fa da titolo, per aria-labelledby */
  labelledBy?: string;
  /** classi extra per il pannello (es. max-w-2xl) */
  className?: string;
  /** chiusura cliccando sullo sfondo (disattivarla nei form per evitare perdite di dati) */
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Contenitore modale accessibile: role=dialog, aria-modal, focus trap,
 * chiusura con Escape, ripristino del focus e blocco dello scroll di sfondo.
 */
export const Modal: React.FC<ModalProps> = ({
  onClose,
  labelledBy,
  className = 'max-w-md',
  closeOnBackdrop = true,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const getFocusables = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    (getFocusables()[0] ?? panel)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const els = getFocusables();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`bg-white rounded-xl shadow-2xl w-full overflow-hidden focus:outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
