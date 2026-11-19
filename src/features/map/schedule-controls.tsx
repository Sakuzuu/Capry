"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/icon";
import { displayDate, displayTime, shiftDate } from "@/lib/events/publication-validation";

export function TimeField({ field, label, value, onChange, invalid, optional = false }: {
  field: "startTime" | "endTime"; label: string; value: string; onChange: (value: string) => void; invalid: boolean; optional?: boolean;
}) {
  const id = useId();
  const [hour = "", minute = ""] = value.split(":");
  function update(part: 0 | 1, text: string) {
    const clean = text.replace(/\D/g, "").slice(0, 2);
    const parts = part === 0 ? [clean, minute] : [hour, clean];
    onChange(parts.every((piece) => !piece) ? "" : parts.join(":"));
  }
  function adjust(event: KeyboardEvent<HTMLInputElement>, part: 0 | 1) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const limit = part === 0 ? 24 : 60;
    const current = Number(part === 0 ? hour : minute) || 0;
    update(part, String((current + (event.key === "ArrowUp" ? 1 : -1) + limit) % limit).padStart(2, "0"));
  }
  return <div className="schedule-field">
    <div className="schedule-field-heading"><span id={`${id}-label`}>{label}</span><span>{optional ? "Opcional" : "24 horas"}</span></div>
    <div className={`time-control${invalid ? " is-invalid" : ""}`} role="group" aria-labelledby={`${id}-label`}>
      <Icon name="clock" />
      <input type="text" inputMode="numeric" autoComplete="off" maxLength={2} pattern="([01][0-9]|2[0-3])" placeholder="HH" aria-label={`${label}, horas`} data-field={field} aria-invalid={invalid} aria-describedby={invalid ? "publish-validation" : `${id}-help`} value={hour} required={!optional || Boolean(value)} onChange={(e) => update(0, e.target.value)} onBlur={() => { if (hour.length === 1) update(0, hour.padStart(2, "0")); }} onKeyDown={(e) => adjust(e, 0)} />
      <span className="time-colon" aria-hidden="true">:</span>
      <input type="text" inputMode="numeric" autoComplete="off" maxLength={2} pattern="[0-5][0-9]" placeholder="MM" aria-label={`${label}, minutos`} data-field={field} aria-invalid={invalid} aria-describedby={invalid ? "publish-validation" : `${id}-help`} value={minute} required={!optional || Boolean(value)} onChange={(e) => update(1, e.target.value)} onBlur={() => { if (minute.length === 1) update(1, minute.padStart(2, "0")); }} onKeyDown={(e) => adjust(e, 1)} />
      {optional && value && <button type="button" className="time-clear" onClick={() => onChange("")} aria-label="Quitar hora de fin"><Icon name="close" /></button>}
    </div>
    <span id={`${id}-help`} className="schedule-field-help">{displayTime(value) || (optional ? "Vacío significa fin indefinido." : "Ejemplo: 23:00 es 11:00 p. m.")}</span>
  </div>;
}

const monthFormat = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric", timeZone: "UTC" });
const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

export function DateField({ value, today, onChange, invalid }: { value: string; today: string; onChange: (value: string) => void; invalid: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || today).slice(0, 7));
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const tomorrow = shiftDate(today, 1);
  function select(day: string) { onChange(day); setOpen(false); trigger.current?.focus(); }
  function changeMonth(direction: number) {
    const next = new Date(first);
    next.setUTCMonth(next.getUTCMonth() + direction);
    setMonth(next.toISOString().slice(0, 7));
  }
  function moveDay(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const movements: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7, End: 6 - (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7 };
    if (!(event.key in movements)) return;
    event.preventDefault();
    const target = shiftDate(day, movements[event.key]);
    if (target < today) return;
    if (target.slice(0, 7) !== month) {
      setMonth(target.slice(0, 7));
      requestAnimationFrame(() => calendar.current?.querySelector<HTMLButtonElement>(`[data-day="${target}"]`)?.focus());
    } else calendar.current?.querySelector<HTMLButtonElement>(`[data-day="${target}"]`)?.focus();
  }
  return <div className="schedule-field date-field" onKeyDown={(event) => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <div className="schedule-field-heading"><span id={`${id}-label`}>¿Qué día empieza?</span><span>Elige una fecha</span></div>
    <div className="date-shortcuts"><button type="button" aria-pressed={value === today} onClick={() => select(today)}>Hoy</button><button type="button" aria-pressed={value === tomorrow} onClick={() => select(tomorrow)}>Mañana</button><button ref={trigger} type="button" className={`date-trigger${invalid ? " is-invalid" : ""}`} data-field="eventDate" aria-describedby={invalid ? "publish-validation" : undefined} aria-label={value ? `Cambiar fecha: ${displayDate(value)}` : "Elegir otra fecha"} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => { if (!open) setMonth((value && value >= today ? value : today).slice(0, 7)); setOpen(!open); }}><Icon name="calendar" /><span>{value && value !== today && value !== tomorrow ? displayDate(value) : "Otra fecha"}</span><Icon name="chevron-down" /></button></div>
    {open && <div id={`${id}-calendar`} ref={calendar} className="schedule-calendar" role="group" aria-labelledby={`${id}-month`}>
      <div className="calendar-heading"><span id={`${id}-month`}>{monthFormat.format(first)}</span><div><button type="button" aria-label="Mes anterior" disabled={month <= today.slice(0, 7)} onClick={() => changeMonth(-1)}><Icon name="chevron-left" /></button><button type="button" aria-label="Mes siguiente" onClick={() => changeMonth(1)}><Icon name="chevron-right" /></button></div></div>
      <div className="calendar-grid"><div className="calendar-week" aria-hidden="true">{weekdays.map((day, index) => <span key={index}>{day}</span>)}</div><div className="calendar-days">{Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: count }, (_, index) => {
        const day = `${month}-${String(index + 1).padStart(2, "0")}`;
        return <button type="button" key={day} data-day={day} disabled={day < today} aria-label={displayDate(day)} aria-pressed={day === value} aria-current={day === today ? "date" : undefined} onClick={() => select(day)} onKeyDown={(event) => moveDay(event, day)}>{index + 1}</button>;
      })}</div></div><button type="button" className="calendar-close" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Cerrar calendario</button>
    </div>}
    <span className="schedule-field-help">{value ? displayDate(value) : "Hoy, mañana o el día que tengas en mente."}</span>
  </div>;
}
