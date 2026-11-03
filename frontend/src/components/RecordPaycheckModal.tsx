"use client";

import { useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/api";
import { CurrencyInput } from "./ui/CurrencyInput";
import { CustomModal } from "./ui/CustomModal";

interface Receipt {
  id: number;
  amount: number;
  account: string;
  date: string;
  cycle_end: string | null;
  allocations: { account_id: number; account: string | null; amount: number; transfer_id: number | null }[];
}

interface Props {
  isOpen: boolean;
  accounts: string[];
  onClose: () => void;
  onSuccess: (cycle?: { start: string; end: string }) => void;
  onConfigure: () => void;
}

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

export function RecordPaycheckModal({ isOpen, accounts, onClose, onSuccess, onConfigure }: Props) {
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [date, setDate] = useState(today);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [startCycle, setStartCycle] = useState(true);
  const [cycleType, setCycleType] = useState("");
  const [cycleDays, setCycleDays] = useState("14");
  const [saveDefault, setSaveDefault] = useState(false);
  const [cycleLabel, setCycleLabel] = useState("Ikuti default");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [previousReceipt, setPreviousReceipt] = useState<Receipt | null>(null);
  const [showAllocations, setShowAllocations] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestKey = useRef("");
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setReceipt(null);
    setShowAllocations(false);
    setError("");
    setCycleOpen(false);
    void authFetch("/api/v1/paycheck/config").then(async (response) => {
      if (!response.ok || !active) return;
      const { config } = await response.json();
      if (!active) return;
      setAccount((current) => current || config.source_account || "");
      setCycleLabel(config.cycle_type === "monthly_date" ? "Bulanan" : `${config.cycle_days} hari`);
    }).catch(() => {});
    void authFetch("/api/v1/paycheck/record/latest").then(async (response) => {
      if (!response.ok || !active) return;
      const data = await response.json();
      if (active) setPreviousReceipt(data);
    }).catch(() => {});
    return () => { active = false; };
  }, [isOpen]);

  const selectedAccount = accounts.includes(account) ? account : accounts[0] || "";
  const nominal = Number(amount.replace(/\D/g, ""));
  const canResume = previousReceipt?.allocations.some((item) => item.account && !item.transfer_id);
  const cycleSummary = !startCycle ? "Pakai siklus berjalan" :
    cycleType === "custom" ? `Siklus ${cycleDays} hari` :
    cycleType === "weekly" ? "Siklus 7 hari" : cycleType === "biweekly" ? "Siklus 14 hari" :
    cycleType === "monthly" ? "Siklus 30 hari" : `Siklus · ${cycleLabel}`;

  async function submit(path: string, body?: object) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const response = await authFetch(path, {
        method: "POST",
        ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(typeof data?.detail === "string" ? data.detail : "Perubahan gagal disimpan.");
      }
      const data: Receipt = await response.json();
      setReceipt(data);
      setPreviousReceipt(data);
      if (body) {
        requestKey.current = "";
        setAmount("");
        setCycleType("");
        setSaveDefault(false);
        setStartCycle(true);
      }
      onSuccess(body && data.cycle_end ? { start: data.date, end: data.cycle_end } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Perubahan gagal disimpan.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <CustomModal isOpen={isOpen} onClose={() => { if (!pending) onClose(); }}
      title={showAllocations ? "Bagi gaji" : receipt ? "Gaji tercatat" : "Catat gaji"} maxWidth="md">
      <div className="space-y-4">
        {error && <p role="alert" className="text-sm text-luma-coral">{error}</p>}
        {receipt ? (
          <>
            <div className="luma-matte space-y-1 p-4">
              <p className="ai7-type-metric">{rupiah.format(receipt.amount)}</p>
              <p className="text-sm text-luma-smoke">{receipt.account} · {receipt.date}</p>
              {receipt.cycle_end && <p className="text-sm text-luma-smoke">Siklus sampai {receipt.cycle_end}</p>}
            </div>
            {showAllocations && (
              <>
                <p className="text-sm text-luma-smoke">Catat transfer setelah uang dipindahkan.</p>
                <ul className="space-y-2">
                  {receipt.allocations.map((item) => (
                    <li key={item.account_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-luma-smokeline py-2">
                      <div className="min-w-0">
                        <p>{item.account || "Rekening tidak tersedia"}</p>
                        <p className="text-sm text-luma-smoke">{rupiah.format(item.amount)}</p>
                      </div>
                      {item.transfer_id ? <span className="text-sm text-luma-sage">Tercatat</span> :
                        <button type="button" className="luma-action-secondary"
                          disabled={pending || !item.account}
                          onClick={() => void submit(`/api/v1/paycheck/record/${receipt.id}/transfer/${item.account_id}`)}>
                          Catat transfer
                        </button>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={pending} onClick={onClose} className="luma-action-secondary">Tutup</button>
              {!showAllocations && receipt.allocations.length > 0 && (
                <button type="button" onClick={() => setShowAllocations(true)} className="luma-action-primary">Bagi gaji</button>
              )}
            </div>
          </>
        ) : (
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (!selectedAccount || nominal <= 0) return;
            requestKey.current ||= crypto.randomUUID();
            void submit("/api/v1/paycheck/record", {
              request_key: requestKey.current, total_amount: nominal, account: selectedAccount, date,
              start_cycle: startCycle, cycle_type: startCycle && cycleType ? cycleType : null,
              cycle_days: startCycle && cycleType === "custom" ? Number(cycleDays) : null,
              save_cycle_default: startCycle && !!cycleType && saveDefault,
            });
          }}>
            <div>
              <p className="mb-1 text-sm font-medium">Nominal gaji</p>
              <CurrencyInput value={amount} onChange={setAmount} placeholder="Nominal gaji" required />
            </div>
            <label className="block space-y-1 text-sm">
              <span>Rekening penerima</span>
              <select className="w-full" value={selectedAccount} required onChange={(event) => setAccount(event.target.value)}>
                {!accounts.length && <option value="">Tambahkan rekening dulu</option>}
                {accounts.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Tanggal gaji masuk</span>
              <input className="w-full" type="date" value={date} required max={today()} onChange={(event) => setDate(event.target.value)} />
            </label>
            <div className="luma-matte space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">{cycleSummary}</span>
                <button type="button" className="luma-text-action px-2" aria-expanded={cycleOpen}
                  onClick={() => setCycleOpen(!cycleOpen)}>Ubah</button>
              </div>
              {cycleOpen && (
                <>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" checked={startCycle} onChange={(event) => setStartCycle(event.target.checked)} />
                    Mulai siklus baru
                  </label>
                  {startCycle && (
                    <>
                      <label className="block space-y-1 text-sm">
                        <span>Durasi siklus</span>
                        <select className="w-full" value={cycleType} onChange={(event) => { setCycleType(event.target.value); setSaveDefault(false); }}>
                          <option value="">Default · {cycleLabel}</option>
                          <option value="weekly">Mingguan · 7 hari</option>
                          <option value="biweekly">Dua mingguan · 14 hari</option>
                          <option value="monthly">Bulanan · 30 hari</option>
                          <option value="custom">Kustom</option>
                        </select>
                      </label>
                      {cycleType === "custom" && <label className="block space-y-1 text-sm">
                        <span>Jumlah hari</span>
                        <input className="w-full" type="number" required min={1} max={365} value={cycleDays}
                          onChange={(event) => setCycleDays(event.target.value)} />
                      </label>}
                      {cycleType && <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input type="checkbox" checked={saveDefault} onChange={(event) => setSaveDefault(event.target.checked)} />
                        Jadikan default
                      </label>}
                    </>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {canResume && <button type="button" className="luma-text-action" disabled={pending} onClick={() => {
                  setReceipt(previousReceipt);
                  setShowAllocations(true);
                }}>Lanjut bagi gaji</button>}
                <button type="button" className="luma-text-action" disabled={pending} onClick={onConfigure}>Atur alokasi</button>
              </div>
              <button type="submit" className="luma-action-primary" disabled={pending || !selectedAccount || nominal <= 0}>
                {pending ? "Menyimpan…" : "Simpan gaji"}
              </button>
            </div>
          </form>
        )}
      </div>
    </CustomModal>
  );
}
