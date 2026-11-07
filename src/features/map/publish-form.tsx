"use client";

import { useState, type FormEvent } from "react";
import type { Coordinates } from "./coordinates";

type Candidate = {
  id: string; latitude: number; longitude: number; event_date: string | null;
  start_time: string; end_time: string | null; end_day_offset: number;
  status: string; same_schedule: boolean;
};
type Result = { outcome: "candidates" | "needs_confirmation" | "candidate_changed" | "created" | "confirmed"; candidates?: Candidate[]; event_id?: string };

export function PublishForm({ point, onDone, onClose }: {
  point: Coordinates | null;
  onDone: (id: string, coordinates: Coordinates) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"active" | "planned">("active");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [nextDay, setNextDay] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(action: "check" | "create" | "confirm", candidateId?: string, allowSeparate = false): Promise<Result> {
    const response = await fetch("/api/events/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: point?.latitude, longitude: point?.longitude,
        eventDate: eventDate || null, startTime, endTime: endTime || null,
        endDayOffset: endTime && nextDay ? 1 : 0, status, action,
        candidateId: candidateId ?? null, allowSeparate,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo publicar.");
    return result;
  }

  async function publish(action: "check" | "create" | "confirm", candidate?: Candidate) {
    if (!point) { setError("Toca el mapa para elegir la ubicación."); return; }
    setError("");
    setBusy(true);
    try {
      let result = await send(action, candidate?.id, action === "create" && candidates !== null);
      if (action === "check" && result.outcome === "candidates" && !result.candidates?.length) {
        result = await send("create");
      }
      if (result.outcome === "created" || result.outcome === "confirmed") {
        onDone(result.event_id!, candidate ? { latitude: candidate.latitude, longitude: candidate.longitude } : point);
      } else {
        setCandidates(result.candidates ?? []);
        if (result.outcome === "candidate_changed") setError("La fiesta cercana cambió. Revisa los candidatos de nuevo.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo publicar.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void publish("check");
  }

  return (
    <form className="publish-form" onSubmit={submit}>
      <div className="publish-form-heading"><h3>Publicar una fiesta</h3><button type="button" onClick={onClose} aria-label="Cerrar formulario">×</button></div>
      <p>Selecciona el lugar tocando el mapa. Usaremos la hora de Quito.</p>
      <div className="publish-location">{point ? `Ubicación: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : "Toca un punto en el mapa"}</div>
      <label>Estado<select value={status} onChange={(event) => { setStatus(event.target.value as "active" | "planned"); setCandidates(null); }}><option value="active">Está ocurriendo</option><option value="planned">Será más tarde</option></select></label>
      <label>Fecha {status === "planned" ? "(obligatoria)" : "(opcional)"}<input type="date" value={eventDate} required={status === "planned"} onChange={(event) => { setEventDate(event.target.value); setCandidates(null); }} /></label>
      <div className="publish-times">
        <label>Inicio<input type="time" value={startTime} required onChange={(event) => { setStartTime(event.target.value); setCandidates(null); }} /></label>
        <label>Fin<input type="time" value={endTime} onChange={(event) => { setEndTime(event.target.value); setCandidates(null); }} /></label>
      </div>
      <label className="publish-checkbox"><input type="checkbox" checked={nextDay} disabled={!endTime} onChange={(event) => { setNextDay(event.target.checked); setCandidates(null); }} />Termina al día siguiente</label>
      <p className="publish-form-note">Si dejas “Fin” vacío, quedará como fin indefinido. Las publicaciones en curso sin nuevos reportes dejan de mostrarse tras dos horas.</p>
      {error && <p className="publish-error" role="alert">{error}</p>}
      {candidates === null ? (
        <button className="publish-primary" type="submit" disabled={busy || !point}>{busy ? "Comprobando…" : "Revisar y publicar"}</button>
      ) : (
        <div className="publish-candidates">
          <h4>Fiestas cercanas</h4>
          <p>Confirma si es la misma fiesta. Si es otra, puedes crear una ficha separada.</p>
          {candidates.map((item) => <div className="publish-candidate" key={item.id}>
            <span>{item.event_date ?? "Hoy"} · {item.start_time.slice(0, 5)} – {item.end_time?.slice(0, 5) ?? "fin indefinido"}{item.end_day_offset ? " (+1 día)" : ""}</span>
            <span>{item.status === "planned" ? "Futura" : "En curso"}</span>
            {item.same_schedule && <button type="button" disabled={busy} onClick={() => void publish("confirm", item)}>Sí, es la misma</button>}
          </div>)}
          <button className="publish-primary" type="button" disabled={busy} onClick={() => void publish("create")}>{busy ? "Publicando…" : "Es otra fiesta: crear ficha"}</button>
          <button className="publish-secondary" type="button" onClick={() => setCandidates(null)}>Editar datos</button>
        </div>
      )}
    </form>
  );
}
