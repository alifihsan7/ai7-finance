import React from "react";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  accent?: "amber" | "cyan" | "mint" | "coral";
  quickAmounts?: number[];
  className?: string;
  autoFocus?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  required = false,
  accent = "amber",
  quickAmounts,
  className = "",
  autoFocus = false,
}: CurrencyInputProps) {
  // Format raw digits to Indonesian thousand separated string (e.g., "150.000")
  const formatDisplay = (raw: string) => {
    if (!raw) return "";
    const clean = raw.replace(/[^\d]/g, "");
    if (!clean) return "";
    return parseInt(clean, 10).toLocaleString("id-ID");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^\d]/g, "");
    onChange(rawVal);
  };

  const accentStyles = {
    amber: {
      badge: "text-amberGold bg-amberGold/10 border-amberGold/30",
      focus: "focus-within:border-amberGold focus-within:ring-1 focus-within:ring-amberGold/30",
      btn: "border-obsidian-border hover:border-amberGold/50 text-slateText-secondary hover:text-amberGold",
    },
    cyan: {
      badge: "text-cyanHub bg-cyanHub/10 border-cyanHub/30",
      focus: "focus-within:border-cyanHub focus-within:ring-1 focus-within:ring-cyanHub/30",
      btn: "border-obsidian-border hover:border-cyanHub/50 text-slateText-secondary hover:text-cyanHub",
    },
    mint: {
      badge: "text-mintRise bg-mintRise/10 border-mintRise/30",
      focus: "focus-within:border-mintRise focus-within:ring-1 focus-within:ring-mintRise/30",
      btn: "border-obsidian-border hover:border-mintRise/50 text-slateText-secondary hover:text-mintRise",
    },
    coral: {
      badge: "text-coralFall bg-coralFall/10 border-coralFall/30",
      focus: "focus-within:border-coralFall focus-within:ring-1 focus-within:ring-coralFall/30",
      btn: "border-obsidian-border hover:border-coralFall/50 text-slateText-secondary hover:text-coralFall",
    },
  };

  const currentAccent = accentStyles[accent] || accentStyles.amber;

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={`relative flex items-stretch min-h-[44px] rounded-2xl overflow-hidden border border-white/[0.08] bg-obsidian-panel transition-all ${currentAccent.focus}`}
      >
        {/* Rp Prefix Badge */}
        <div
          className={`px-3.5 sm:px-4 py-2.5 flex items-center justify-center font-mono font-bold text-xs sm:text-sm border-r select-none tracking-wider ${currentAccent.badge}`}
        >
          Rp
        </div>

        {/* Input Element */}
        <input
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          required={required}
          value={formatDisplay(value)}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full bg-transparent px-3.5 py-2.5 text-slateText-primary font-mono font-semibold text-base sm:text-lg focus:outline-none placeholder:text-zinc-400 placeholder:font-normal"
        />
      </div>

      {/* Quick Amount Suggestion Pills */}
      {quickAmounts && quickAmounts.length > 0 && (
        <div className={`grid gap-2 pt-1 ${quickAmounts.length === 4 ? "grid-cols-4" : quickAmounts.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {quickAmounts.map((amt) => {
            const label =
              amt >= 1000000
                ? `${amt / 1000000}jt`
                : `${amt / 1000}k`;
            return (
              <button
                key={amt}
                type="button"
                onClick={() => onChange(amt.toString())}
                className={`min-h-[44px] py-2 px-2.5 rounded-xl bg-obsidian-panel border text-xs sm:text-sm font-mono font-medium transition-all text-center flex items-center justify-center cursor-pointer ${currentAccent.btn}`}
              >
                +{label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
