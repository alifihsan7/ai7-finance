import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
}

const monthName = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const iso = (date: Date) => date.toISOString().slice(0, 10);
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && iso(date) === value && value >= "0001-01-01";
};

export function DateField({ id, label, value, onChange, min, max, required }: Props) {
  const uid = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [touched, setTouched] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number; transform?: string }>();

  const inRange = (date: string) => (!min || date >= min) && (!max || date <= max);
  const error = draft && (!validDate(draft) || !inRange(draft))
    ? "Isi tanggal yang valid dalam format YYYY-MM-DD dan rentang yang tersedia."
    : "";
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { input.current?.setCustomValidity(error); }, [error]);
  useEffect(() => {
    if (!open) return;
    function placeCalendar() {
      const rect = field.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, window.innerWidth - 16);
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const upward = below < 360 && above > below;
      const height = Math.min(360, Math.max(0, upward ? above : below));
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: upward ? rect.top - 6 : rect.bottom + 6,
        width,
        maxHeight: height,
        transform: upward ? "translateY(-100%)" : undefined,
      });
    }
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !field.current?.contains(event.target) && !popup.current?.contains(event.target)) setOpen(false);
    }
    placeCalendar();
    window.addEventListener("resize", placeCalendar);
    window.addEventListener("scroll", placeCalendar, true);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("resize", placeCalendar);
      window.removeEventListener("scroll", placeCalendar, true);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  const shiftMonth = (amount: number) => {
    const next = new Date(month);
    next.setUTCMonth(month.getUTCMonth() + amount, 1);
    if (next.getUTCFullYear() >= 1 && next.getUTCFullYear() <= 9999) setMonth(next);
  };
  const days = new Date(month);
  days.setUTCMonth(month.getUTCMonth() + 1, 0);
  const first = new Date(month);
  first.setUTCDate(1);
  const offset = (first.getUTCDay() + 6) % 7;

  return (
    <div ref={field} className="tillfold-date" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <div className="tillfold-date-field">
        <input ref={input} id={id} aria-label={label} type="text" value={draft}
          placeholder="YYYY-MM-DD" autoComplete="off" maxLength={10} required={required}
          aria-invalid={Boolean(touched && error)} aria-describedby={touched && error ? `${uid}-error` : undefined}
          onBlur={() => setTouched(true)}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (!next || (validDate(next) && inRange(next))) onChange(next);
          }} />
        <button ref={trigger} type="button" aria-label="Pilih tanggal" title="Pilih tanggal"
          aria-expanded={open} aria-controls={open ? uid : undefined}
          onClick={() => {
            if (!open) setMonth(new Date(validDate(value) ? value : new Date().toISOString().slice(0, 10)));
            setOpen(!open);
          }}><Calendar size={16} aria-hidden="true" /></button>
      </div>
      {touched && error && <p id={`${uid}-error`} className="mt-1 text-xs text-luma-coral">{error}</p>}
      {open && position && createPortal(
        <div ref={popup} id={uid} className="tillfold-calendar" style={position} role="group" aria-label="Kalender">
          <div className="flex items-center justify-between gap-1">
            <button type="button" aria-label="Bulan sebelumnya" onClick={() => shiftMonth(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
            <span className="text-xs font-medium text-center" aria-live="polite">{monthName.format(month)}</span>
            <button type="button" aria-label="Bulan berikutnya" onClick={() => shiftMonth(1)}><ChevronRight size={16} aria-hidden="true" /></button>
          </div>
          <div className="grid grid-cols-7 gap-px text-center">
            {["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"].map((day) => <span key={day} aria-hidden="true" className="py-1 text-[10px] text-luma-smoke">{day}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: days.getUTCDate() }, (_, index) => {
              const day = index + 1;
              const date = new Date(first);
              date.setUTCDate(day);
              const key = iso(date);
              return <button key={key} type="button" aria-label={key} aria-pressed={key === value}
                disabled={!inRange(key)} onClick={() => {
                  setDraft(key);
                  onChange(key);
                  setOpen(false);
                  trigger.current?.focus();
                }}>{day}</button>;
            })}
          </div>
        </div>,
        field.current?.closest('[role="dialog"]') || document.body
      )}
    </div>
  );
}
