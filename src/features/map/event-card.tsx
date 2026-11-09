"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crowdLabel, eventName, eventSchedule, plannedLevel, type CrowdLevel, type LiveEvent } from "./live-event";

type Mine = { planned: boolean; crowdLevel: CrowdLevel | null } | null;
type Response = { event: LiveEvent; mine: Mine; error?: string };
const quitoDateTime = new Intl.DateTimeFormat("es-EC", {
  timeZone: "America/Guayaquil", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
});
const crowdOptions: { level: CrowdLevel; label: string }[] = [
  { level: "low", label: "Bajo" }, { level: "medium", label: "Medio" }, { level: "full", label: "Full" },
];

export function EventCard({ initialEvent, canInteract, onClose, onUpdate }: {
  initialEvent: LiveEvent; canInteract: boolean; onClose?: () => void; onUpdate?: (event: LiveEvent) => void;
}) {
  const [event, setEvent] = useState(initialEvent);
  const [mine, setMine] = useState<Mine>(null);
  const [loadingMine, setLoadingMine] = useState(canInteract);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/events/${initialEvent.id}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo actualizar esta ficha.");
        return response.json() as Promise<Response>;
      })
      .then((data) => { if (!controller.signal.aborted) {
        setEvent(data.event);
        setMine(data.mine);
        setLoadingMine(canInteract && !data.mine);
        if (canInteract && !data.mine) setError("Tu sesión terminó. Vuelve a iniciar sesión para participar.");
      } })
      .catch(() => { if (!controller.signal.aborted) { setError("No se pudo actualizar esta ficha."); setLoadingMine(true); } });
    return () => controller.abort();
  }, [initialEvent.id, canInteract]);

  async function respond(payload: { action: "attendance"; planned: boolean } | { action: "crowd"; level: CrowdLevel } | { action: "remove_crowd" }) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as Response;
      if (!response.ok || !result.event) throw new Error(result.error || "No se pudo guardar tu respuesta.");
      setEvent(result.event);
      setMine(result.mine);
      onUpdate?.(result.event);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar tu respuesta.");
    } finally { setBusy(false); }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(`/evento/${event.id}`, window.location.origin).toString());
      setCopied(true);
    } catch { setError("No se pudo copiar el enlace. Abre la ficha para compartirlo."); }
  }

  const reservation = plannedLevel(event.planned_count);
  const canAttend = event.accepts_attendance || Boolean(mine?.planned);
  const canRespond = canAttend || event.accepts_crowd || Boolean(mine?.crowdLevel);
  return (
    <article className={`map-event-summary${onClose ? "" : " event-page-card"}`} aria-label={`Ficha de ${eventName(event)}`}>
      <div className="map-event-summary-top">
        <span className="map-event-kicker">{event.status === "planned" && event.accepts_attendance ? "Fiesta futura" : event.status === "active" && event.accepts_crowd ? "Fiesta en curso" : "Fiesta finalizada"}</span>
        {onClose && <button type="button" className="map-summary-close" onClick={onClose} aria-label="Cerrar ficha">×</button>}
      </div>
      <h3>{eventName(event)}</h3>
      <p className="map-event-time">{eventSchedule(event)} · hora de Quito</p>
      <div className="map-event-signals">
        <span className={`map-planned-level level-${reservation}`}>Reserva {crowdLabel(reservation)} · <strong>{event.planned_count}</strong> planean ir</span>
        <span className={`map-crowd-level level-${event.crowd_level ?? "none"}`}>Aforo {crowdLabel(event.crowd_level)} · {event.report_count} {event.report_count === 1 ? "reporte" : "reportes"}</span>
      </div>
      {event.last_report_at && <p className="map-event-report">Último reporte: {quitoDateTime.format(new Date(event.last_report_at))} (Quito)</p>}
      {canInteract && canRespond ? <div className="event-response-actions">
        {canAttend && <button className={`event-attendance-button${mine?.planned ? " is-active" : ""}`} type="button" disabled={busy || loadingMine}
          aria-pressed={Boolean(mine?.planned)} onClick={() => void respond({ action: "attendance", planned: !mine?.planned })}>
          {mine?.planned ? "✓ Planeo ir · retirar" : "Planeo ir"}
        </button>}
        {event.accepts_crowd && <div className="event-crowd-actions" aria-label="Reportar aforo">
          <span>¿Cuánta gente hay?</span>
          <div>{crowdOptions.map(({ level, label }) => <button type="button" key={level}
            className={`level-${level}${mine?.crowdLevel === level ? " is-active" : ""}`}
            aria-pressed={mine?.crowdLevel === level} disabled={busy || loadingMine}
            onClick={() => void respond({ action: "crowd", level })}>{label}</button>)}</div>
        </div>}
        {mine?.crowdLevel && <button className="event-remove-report" type="button" disabled={busy || loadingMine}
          onClick={() => void respond({ action: "remove_crowd" })}>Retirar mi reporte</button>}
        {busy && <p className="event-response-status" role="status">Guardando respuesta…</p>}
      </div> : !canInteract && canRespond ? <Link className="event-login-link" href="/acceder">Inicia sesión para participar</Link> : null}
      {error && <p className="event-response-error" role="alert">{error}</p>}
      <div className="event-share-actions">
        <Link href={`/evento/${event.id}`}>Ver ficha y enlace</Link>
        <button type="button" onClick={() => void copyLink()}>{copied ? "Enlace copiado" : "Copiar enlace"}</button>
      </div>
    </article>
  );
}
