import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  description?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih opsi...",
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-obsidian-panel border rounded-lg px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-all select-none ${
          disabled
            ? "opacity-50 cursor-not-allowed border-obsidian-border"
            : isOpen
            ? "border-amberGold ring-1 ring-amberGold/30 text-slateText-primary"
            : "border-obsidian-border hover:border-obsidian-borderStrong text-slateText-primary"
        }`}
      >
        <span className="truncate min-w-0 font-medium flex items-center gap-2 pr-1">
          {selectedOption?.color && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.color}`} />
          )}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slateText-muted shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-amberGold" : ""
          }`}
        />
      </button>

      {/* Floating Custom Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-[100] bg-obsidian-card border border-obsidian-borderStrong rounded-xl shadow-2xl py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3.5 py-2 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-colors select-none ${
                  isSelected
                    ? "bg-amberGold/10 text-amberGold font-semibold"
                    : "text-slateText-primary hover:bg-obsidian-hover hover:text-slateText-primary"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {opt.color && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />
                  )}
                  <div className="truncate">
                    <div>{opt.label}</div>
                    {opt.description && (
                      <div className="text-[11px] text-slateText-muted font-normal">
                        {opt.description}
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-amberGold shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
