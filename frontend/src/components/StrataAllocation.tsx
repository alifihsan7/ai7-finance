import React from "react";

export function StrataAllocationBar() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slateText-primary">Distribusi Alokasi Uang Saku</h2>
          <p className="text-xs sm:text-sm text-slateText-secondary mt-0.5">
            Plafon standar Rp 1.500.000 / 14 hari langsung dipecah ke 4 rekening
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-amberGold px-2.5 py-1 rounded bg-amberGold/10 border border-amberGold/20">
          Bi-Weekly Formula
        </span>
      </div>

      <div className="flex gap-1.5 h-6 rounded-lg overflow-hidden p-1 bg-obsidian-panel border border-obsidian-border">
        <div style={{ flex: 55 }} className="bg-amberGold rounded-l-md transition-all hover:brightness-110 flex items-center justify-center text-xs font-mono font-bold text-obsidian-bg">
          55%
        </div>
        <div style={{ flex: 31.7 }} className="bg-mintRise transition-all hover:brightness-110 flex items-center justify-center text-xs font-mono font-bold text-obsidian-bg">
          31.7%
        </div>
        <div style={{ flex: 6.7 }} className="bg-cyanHub transition-all hover:brightness-110"></div>
        <div style={{ flex: 6.7 }} className="bg-purpleLock rounded-r-md transition-all hover:brightness-110"></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
        <div className="border-l-2 border-amberGold pl-3 py-0.5">
          <div className="text-slateText-primary font-semibold text-sm">Mandiri (55.0%)</div>
          <div className="text-slateText-secondary font-mono text-xs mt-0.5">Rp 825.000 • Saku Harian</div>
        </div>
        <div className="border-l-2 border-mintRise pl-3 py-0.5">
          <div className="text-slateText-primary font-semibold text-sm">Jago / Bibit (31.7%)</div>
          <div className="text-slateText-secondary font-mono text-xs mt-0.5">Rp 475.000 • Subs & Invest</div>
        </div>
        <div className="border-l-2 border-cyanHub pl-3 py-0.5">
          <div className="text-slateText-primary font-semibold text-sm">BRI 1 (6.7%)</div>
          <div className="text-slateText-secondary font-mono text-xs mt-0.5">Rp 100.000 • Hub & Darurat</div>
        </div>
        <div className="border-l-2 border-purpleLock pl-3 py-0.5">
          <div className="text-slateText-primary font-semibold text-sm">BRI 2 (6.7%)</div>
          <div className="text-slateText-secondary font-mono text-xs mt-0.5">Rp 100.000 • Tabungan Kunci</div>
        </div>
      </div>
    </div>
  );
}
