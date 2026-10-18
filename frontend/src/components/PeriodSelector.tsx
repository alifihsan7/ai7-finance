import React, { useState, useEffect, useRef } from "react";
import { Calendar, ChevronDown, Check, Clock, CalendarDays, SlidersHorizontal } from "lucide-react";

export interface PeriodOption {
  id: string;
  type: "cycle" | "week" | "month" | "custom";
  label: string;
  start: string;
  end: string;
  month?: string;
  is_current?: boolean;
}

interface PeriodSelectorProps {
  currentPeriod: PeriodOption;
  onSelectPeriod: (period: PeriodOption) => void;
  formatRupiah?: (val: number) => string;
}

export function PeriodSelector({
  currentPeriod,
  onSelectPeriod,
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"cycle" | "week" | "month" | "custom">("cycle");
  const [periodGroups, setPeriodGroups] = useState<{
    cycles: PeriodOption[];
    weeks: PeriodOption[];
    months: PeriodOption[];
  }>({
    cycles: [],
    weeks: [],
    months: [],
  });

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/v1/analytics/periods")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setPeriodGroups({
            cycles: data.cycles || [],
            weeks: data.weeks || [],
            months: data.months || [],
          });
        }
      })
      .catch((err) => console.error("Error fetching periods:", err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    const customOpt: PeriodOption = {
      id: `custom_${customStart}_${customEnd}`,
      type: "custom",
      label: `Kustom (${customStart} – ${customEnd})`,
      start: customStart,
      end: customEnd,
    };
    onSelectPeriod(customOpt);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-obsidian-card border border-obsidian-border hover:border-amberGold/50 text-slateText-primary hover:bg-obsidian-hover transition inline-flex items-center gap-2 shadow-xs group"
      >
        <Calendar className="w-4 h-4 text-amberGold shrink-0 group-hover:scale-105 transition-transform" />
        <span className="font-mono text-xs font-semibold max-w-[200px] sm:max-w-none truncate">
          {currentPeriod.label || "Pilih Periode"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slateText-muted shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-amberGold" : ""
          }`}
        />
      </button>

      {/* Floating Modal Popover */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-2 z-[90] w-80 sm:w-96 bg-obsidian-card border border-obsidian-borderStrong rounded-2xl shadow-2xl overflow-hidden p-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Type Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-obsidian-panel rounded-xl border border-obsidian-border mb-3">
            <button
              type="button"
              onClick={() => setActiveTab("cycle")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === "cycle"
                  ? "bg-amberGold text-[#0B0D11] shadow-xs"
                  : "text-slateText-secondary hover:text-slateText-primary"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Siklus</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("week")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === "week"
                  ? "bg-amberGold text-[#0B0D11] shadow-xs"
                  : "text-slateText-secondary hover:text-slateText-primary"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Minggu</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("month")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === "month"
                  ? "bg-amberGold text-[#0B0D11] shadow-xs"
                  : "text-slateText-secondary hover:text-slateText-primary"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Bulan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("custom")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === "custom"
                  ? "bg-amberGold text-[#0B0D11] shadow-xs"
                  : "text-slateText-secondary hover:text-slateText-primary"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Kustom</span>
            </button>
          </div>

          {/* Tab Content List */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {activeTab === "cycle" && (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slateText-muted px-2 py-1">
                  Siklus Gajian 14 Harian
                </div>
                {periodGroups.cycles.length === 0 ? (
                  <div className="text-xs text-slateText-muted p-3 text-center">
                    Belum ada riwayat siklus
                  </div>
                ) : (
                  periodGroups.cycles.map((opt) => {
                    const isSelected = currentPeriod.id === opt.id || currentPeriod.start === opt.start;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSelectPeriod(opt);
                          setIsOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-amberGold/15 border border-amberGold/30 text-amberGold font-semibold"
                            : "hover:bg-obsidian-hover border border-transparent text-slateText-primary"
                        }`}
                      >
                        <div>
                          <div>{opt.label}</div>
                          <div className="text-[10px] text-slateText-muted font-mono mt-0.5">
                            {opt.start} s/d {opt.end}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amberGold shrink-0" />}
                      </button>
                    );
                  })
                )}
              </>
            )}

            {activeTab === "week" && (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slateText-muted px-2 py-1">
                  Periode Mingguan (7 Hari)
                </div>
                {periodGroups.weeks.map((opt) => {
                  const isSelected = currentPeriod.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onSelectPeriod(opt);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-amberGold/15 border border-amberGold/30 text-amberGold font-semibold"
                          : "hover:bg-obsidian-hover border border-transparent text-slateText-primary"
                      }`}
                    >
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10px] text-slateText-muted font-mono mt-0.5">
                          {opt.start} s/d {opt.end}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amberGold shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}

            {activeTab === "month" && (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slateText-muted px-2 py-1">
                  Bulan Kalender
                </div>
                {periodGroups.months.map((opt) => {
                  const isSelected = currentPeriod.id === opt.id || currentPeriod.month === opt.month;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onSelectPeriod(opt);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-amberGold/15 border border-amberGold/30 text-amberGold font-semibold"
                          : "hover:bg-obsidian-hover border border-transparent text-slateText-primary"
                      }`}
                    >
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10px] text-slateText-muted font-mono mt-0.5">
                          {opt.start} s/d {opt.end}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amberGold shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}

            {activeTab === "custom" && (
              <form onSubmit={handleApplyCustom} className="p-2 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slateText-muted">
                  Tentukan Rentang Tanggal Bebas
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slateText-muted mb-1">Tanggal Mulai</label>
                    <input
                      type="date"
                      required
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-2.5 py-1.5 text-xs text-slateText-primary focus:outline-none focus:border-amberGold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slateText-muted mb-1">Tanggal Selesai</label>
                    <input
                      type="date"
                      required
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full bg-obsidian-panel border border-obsidian-border rounded-lg px-2.5 py-1.5 text-xs text-slateText-primary focus:outline-none focus:border-amberGold"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-amberGold text-[#0B0D11] font-bold text-xs rounded-lg hover:bg-amber-400 transition"
                >
                  Terapkan Rentang
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
