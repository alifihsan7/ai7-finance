import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: "amber" | "cyan" | "mint" | "coral" | "ember" | "sage" | "gold";
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

/* Luma Dark Glass v2.0 modal shell — smoked charcoal, rounded-3xl, ember focus.
   Legacy accent keys remapped: amber->gold, cyan->gold, mint->sage, coral->coral. */
export function CustomModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  accent = "ember",
  children,
  maxWidth = "md",
}: CustomModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
      if (e.key === "Tab" && isOpen && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
        )).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
      if (isOpen) previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-xl",
    xl: "max-w-2xl",
  };

  const accentStyles: Record<string, { bar: string; icon: string; ring: string }> = {
    amber: {
      bar: "bg-luma-gold",
      icon: "bg-luma-gold/10 border-luma-gold/30 text-luma-gold",
      ring: "focus-visible:ring-luma-gold/70",
    },
    cyan: {
      bar: "bg-luma-gold",
      icon: "bg-luma-gold/10 border-luma-gold/30 text-luma-gold",
      ring: "focus-visible:ring-luma-gold/70",
    },
    mint: {
      bar: "bg-luma-sage",
      icon: "bg-luma-sage/10 border-luma-sage/30 text-luma-sage",
      ring: "focus-visible:ring-luma-sage/70",
    },
    coral: {
      bar: "bg-luma-coral",
      icon: "bg-luma-coral/10 border-luma-coral/30 text-luma-coral",
      ring: "focus-visible:ring-luma-coral/70",
    },
    ember: {
      bar: "bg-luma-ember",
      icon: "bg-luma-ember/10 border-luma-ember/30 text-luma-ember",
      ring: "focus-visible:ring-luma-ember/70",
    },
    sage: {
      bar: "bg-luma-sage",
      icon: "bg-luma-sage/10 border-luma-sage/30 text-luma-sage",
      ring: "focus-visible:ring-luma-sage/70",
    },
    gold: {
      bar: "bg-luma-gold",
      icon: "bg-luma-gold/10 border-luma-gold/30 text-luma-gold",
      ring: "focus-visible:ring-luma-gold/70",
    },
  };

  const currentAccent = accentStyles[accent] || accentStyles.ember;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`luma-dialog-panel relative rounded-3xl w-full shadow-luma-glass flex flex-col max-h-[90dvh] my-auto ${maxWidthStyles[maxWidth]}`}
      >
        {/* Warm ember accent line at top */}
        <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full pointer-events-none overflow-hidden z-20">
          <div className={`w-full h-full ${currentAccent.bar}`} />
        </div>

        {/* Close Button — 44x44 touch target */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog"
          className="absolute top-3 sm:top-4 right-3 sm:right-4 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-luma-smoke hover:text-luma-ivory hover:bg-white/[0.08] active:bg-white/[0.14] active:scale-95 border border-transparent hover:border-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luma-ember/70 transition-all duration-150 z-20 touch-manipulation cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Modal Header (Fixed at top of modal) */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-start gap-3.5 pr-12 sm:pr-14">
            {icon && (
              <div
                className={`p-2.5 rounded-2xl border shrink-0 ${currentAccent.icon}`}
              >
                {icon}
              </div>
            )}
            <div>
              <h3 className="font-bold text-base sm:text-lg text-luma-ivory leading-tight tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-luma-smoke mt-1 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body — Luma form wells live here */}
        <div className="p-5 sm:p-6 overflow-y-auto luma-form-scope">
          {children}
        </div>
      </div>
    </div>
  );
}
