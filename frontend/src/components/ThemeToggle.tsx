"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  size = "md",
  className = "",
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = resolvedTheme === "light";
  const sizeClasses =
    size === "sm"
      ? "w-8 h-8 p-1.5"
      : "w-9 h-9 p-2";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  // Prevent layout shift during SSR hydration
  if (!mounted) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-obsidian-card border border-white/[0.08] opacity-50 shrink-0 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isLight ? "Beralih ke Obsidian Dark (Mode Gelap)" : "Beralih ke Clean Light (Mode Terang)"}
      aria-label={isLight ? "Beralih ke Mode Gelap" : "Beralih ke Mode Terang"}
      className={`relative ${sizeClasses} rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 group cursor-pointer shrink-0 select-none ${
        isLight
          ? "bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-xs"
          : "bg-obsidian-card hover:bg-obsidian-hover border border-white/[0.08] hover:border-amberGold/50 text-amberGold hover:shadow-[0_0_12px_rgba(250,204,21,0.15)] shadow-xs"
      } ${className}`}
    >
      <div className="relative flex items-center justify-center w-full h-full">
        {isLight ? (
          <Moon
            className={`${iconSize} stroke-[2.2] transition-transform duration-500 transform group-hover:-rotate-12 text-slate-800`}
          />
        ) : (
          <Sun
            className={`${iconSize} stroke-[2.2] transition-transform duration-500 transform group-hover:rotate-45 text-amberGold`}
          />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold ml-2 text-slateText-primary">
          {isLight ? "Mode Terang" : "Mode Gelap"}
        </span>
      )}
    </button>
  );
}
