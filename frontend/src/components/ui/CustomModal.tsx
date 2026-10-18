import React, { useEffect } from "react";
import { X } from "lucide-react";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: "amber" | "cyan" | "mint" | "coral";
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function CustomModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  accent = "amber",
  children,
  maxWidth = "md",
}: CustomModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  const accentStyles = {
    amber: {
      bar: "bg-gradient-to-r from-amberGold/80 via-amberGold to-transparent",
      icon: "bg-amberGold/15 border-amberGold/30 text-amberGold",
    },
    cyan: {
      bar: "bg-gradient-to-r from-cyanHub/80 via-cyanHub to-transparent",
      icon: "bg-cyanHub/15 border-cyanHub/30 text-cyanHub",
    },
    mint: {
      bar: "bg-gradient-to-r from-mintRise/80 via-mintRise to-transparent",
      icon: "bg-mintRise/15 border-mintRise/30 text-mintRise",
    },
    coral: {
      bar: "bg-gradient-to-r from-coralFall/80 via-coralFall to-transparent",
      icon: "bg-coralFall/15 border-coralFall/30 text-coralFall",
    },
  };

  const currentAccent = accentStyles[accent] || accentStyles.amber;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative bg-obsidian-card border border-obsidian-borderStrong/90 rounded-2xl w-full shadow-2xl p-6 sm:p-7 animate-in zoom-in-95 duration-200 ${maxWidthStyles[maxWidth]}`}
      >
        {/* Subtle Accent Glow Line at Top */}
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${currentAccent.bar}`} />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slateText-muted hover:text-slateText-primary hover:bg-obsidian-hover border border-transparent hover:border-obsidian-border transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-5 pr-8">
          {icon && (
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${currentAccent.icon}`}
            >
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slateText-primary leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slateText-secondary mt-1 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Modal Content Body */}
        <div>{children}</div>
      </div>
    </div>
  );
}
