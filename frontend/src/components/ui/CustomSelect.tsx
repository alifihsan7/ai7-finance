import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  accent?: "amber" | "mint" | "cyan";
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih opsi...",
  disabled = false,
  className = "",
  accent = "amber",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    openUpward: boolean;
  }>({
    left: 0,
    width: 0,
    maxHeight: 240,
    openUpward: false,
  });

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownEstimatedHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward = spaceBelow < dropdownEstimatedHeight && spaceAbove > spaceBelow;

    if (openUpward) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(260, Math.max(140, spaceAbove - 20)),
        openUpward: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(260, Math.max(140, spaceBelow - 20)),
        openUpward: false,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    function handleScrollOrResize() {
      updatePosition();
    }

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full bg-obsidian-panel border rounded-xl px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between gap-2 transition-all select-none ${
          disabled
            ? "opacity-50 cursor-not-allowed border-obsidian-border"
            : isOpen
            ? accent === "mint"
              ? "border-mintRise ring-1 ring-mintRise/30 text-slateText-primary"
              : accent === "cyan"
              ? "border-cyanHub ring-1 ring-cyanHub/30 text-slateText-primary"
              : "border-amberGold ring-1 ring-amberGold/30 text-slateText-primary"
            : "border-obsidian-border hover:border-obsidian-borderStrong text-slateText-primary"
        }`}
      >
        <span className="min-w-0 flex-1 font-medium flex items-center gap-2 pr-1 overflow-hidden">
          {selectedOption?.color && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.color}`} />
          )}
          <span className="truncate block flex-1">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slateText-muted shrink-0 transition-transform duration-200 ${
            isOpen
              ? accent === "mint"
                ? "rotate-180 text-mintRise"
                : accent === "cyan"
                ? "rotate-180 text-cyanHub"
                : "rotate-180 text-amberGold"
              : ""
          }`}
        />
      </button>

      {/* Floating Custom Dropdown Menu via Portal to break out of modal overflow clipping */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.openUpward ? undefined : coords.top,
              bottom: coords.openUpward ? coords.bottom : undefined,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              zIndex: 99999,
            }}
            className="bg-obsidian-card border border-obsidian-borderStrong rounded-xl shadow-2xl py-1.5 overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-150"
          >
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
          </div>,
          document.body
        )}
    </div>
  );
}
