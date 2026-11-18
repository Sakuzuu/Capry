"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { validateLocation, validateSchedule, type PublicationIssue } from "@/lib/events/publication-validation";
import { Modal } from "@/components/modal";
import { coverPresets, presetSource, type CoverPreset } from "@/features/events/covers";
import { LocationPicker } from "./location-picker";
import type { Coordinates } from "./coordinates";

type Candidate = { id: string; latitude: number; longitude: number; event_date: string | null; start_time: string; end_time: string | null; end_day_offset: number; status: string; same_schedule: boolean };
type Result = { outcome: "candidates" | "needs_confirmation" | "candidate_changed" | "created" | "confirmed"; candidates?: Candidate[]; event_id?: string; error?: string };
const steps = ["Ubicación", "Horario", "Portada"];

export function PublishForm({ onDone, onClose }: { onDone: (id: string, coordinates: Coordinates) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [point, setPoint] = useState<Coordinates | null>(null);
  const [latitudeText, setLatitudeText] = useState("");
  const [longitudeText, setLongitudeText] = useState("");
  const [status, setStatus] = useState<"active" | "planned">("active");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [nextDay, setNextDay] = useState(false);
  const [title, setTitle] = useState("");
  const [preset, setPreset] = useState<CoverPreset>("night");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const previewUrl = useRef("");
  const draftPath = useRef<string | null>(null);
  const saved = useRef(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coverError, setCoverError] = useState("");
  const [issue, setIssue] = useState<PublicationIssue | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const issueRef = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (issue) {
      const field = formRef.current?.querySelector<HTMLElement>(`[data-field="${issue.field}"]`);
      if (field && field.getClientRects().length && !field.matches(":disabled")) field.focus();
      else issueRef.current?.focus();
    } else if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [issue, step]);
  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    if (draftPath.current && !saved.current) void fetch(`/api/events/cover?path=${encodeURIComponent(draftPath.current)}`, { method: "DELETE", keepalive: true });
  }, []);

  function clearIssue() { setIssue(null); setError(""); }
  function updatePoint(value: Coordinates) {
    setPoint(value);
    setLatitudeText(String(value.latitude));
    setLongitudeText(String(value.longitude));
    setCandidates(null);
    clearIssue();
  }
  function updateCoordinate(field: "latitude" | "longitude", value: string) {
    const lat = field === "latitude" ? value : latitudeText;
    const lng = field === "longitude" ? value : longitudeText;
    if (field === "latitude") setLatitudeText(value); else setLongitudeText(value);
    const nextPoint = lat.trim() && lng.trim() ? { latitude: Number(lat), longitude: Number(lng) } : null;
    setPoint(validateLocation(nextPoint) ? null : nextPoint);
    setCandidates(null);
    clearIssue();
  }
  function scheduleIssue() {
    return validateSchedule({ status, eventDate: eventDate || null, startTime, endTime: endTime || null, endDayOffset: endTime && nextDay ? 1 : 0 });
  }
  function validateThrough(currentStep: number) {
    const nextIssue = validateLocation(point) ?? (currentStep >= 1 ? scheduleIssue() : null) ??
      (currentStep >= 2 && coverError ? { field: "cover" as const, message: coverError } : null);
    if (!nextIssue) return true;
    if (nextIssue.field === "location") setStep(0);
    else if (nextIssue.field !== "cover") setStep(1);
    setCandidates(null);
    setIssue(nextIssue);
    return false;
  }
  function chooseFile(value: File | null) {
    if (!value) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(value.type) || value.size > 3 * 1024 * 1024 || !value.size) {
      const message = "Elige una imagen JPG, PNG o WebP de hasta 3 MB, o selecciona una portada de Capry.";
      setCoverError(message); setIssue({ field: "cover", message }); return;
    }
    if (draftPath.current) void fetch(`/api/events/cover?path=${draftPath.current}`, { method: "DELETE" });
    draftPath.current = null;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = URL.createObjectURL(value);
    setPreview(previewUrl.current); setFile(value); setCoverError(""); clearIssue();
  }
  async function send(action: "check" | "create" | "confirm", candidateId?: string): Promise<Result> {
    if (action === "create" && file && !draftPath.current) {
      const body = new FormData(); body.set("cover", file);
      const upload = await fetch("/api/events/cover", { method: "POST", body });
      const result = await upload.json() as { path?: string; error?: string };
      if (!upload.ok || !result.path) throw new Error(result.error || "No se pudo subir la portada.");
      draftPath.current = result.path;
    }
    const response = await fetch("/api/events/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: point?.latitude, longitude: point?.longitude,
        eventDate: eventDate || null, startTime, endTime: endTime || null,
        endDayOffset: endTime && nextDay ? 1 : 0, status, action,
        candidateId: candidateId ?? null, allowSeparate: action === "create" && candidates !== null,
        title, coverPreset: preset, coverPath: action === "create" ? draftPath.current : null }),
    });
    const result = await response.json() as Result;
    if (!response.ok) throw new Error(result.error || "No se pudo publicar.");
    return result;
  }
  async function publish(action: "check" | "create" | "confirm", candidate?: Candidate) {
    if (busy || !validateThrough(2) || !point) return;
    setError(""); setBusy(true);
    try {
      let result = await send(action, candidate?.id);
      if (action === "check" && result.outcome === "candidates" && !result.candidates?.length) result = await send("create");
      if ((result.outcome === "created" || result.outcome === "confirmed") && result.event_id) {
        saved.current = result.outcome === "created";
        onDone(result.event_id, candidate ? { latitude: candidate.latitude, longitude: candidate.longitude } : point);
      } else {
        setCandidates(result.candidates ?? []);
        if (result.outcome === "candidate_changed") setError("La fiesta cercana cambió. Revisa las opciones de nuevo.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo publicar."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validateThrough(step)) return;
    const invalid = event.currentTarget.querySelector<HTMLInputElement>("input:invalid");
    if (invalid) {
      setIssue({ field: (invalid.dataset.field as PublicationIssue["field"]) || "cover", message: "Revisa este campo antes de continuar." });
      return;
    }
    clearIssue();
    if (step < 2) setStep(step + 1); else void publish("check");
  }
  return <Modal titleId="publish-title" className="publish-modal" onClose={onClose} busy={busy}>
    <button className="modal-close" type="button" onClick={onClose} disabled={busy} aria-label="Cerrar publicación"><Icon name="close" /></button>
    <div className="publish-modal-intro"><p className="eyebrow">COMPARTE EL PLAN</p><h2 id="publish-title" ref={heading} tabIndex={-1}>La noche empieza aquí.</h2><p>Un lugar, un horario y una fiesta por descubrir.</p></div>
    <ol className="publish-steps" aria-label="Pasos para publicar">{steps.map((label, index) => <li key={label} className={index === step ? "is-current" : index < step ? "is-complete" : ""} aria-current={index === step ? "step" : undefined}><span>{index < step ? <Icon name="check" /> : `0${index + 1}`}</span>{label}</li>)}</ol>
    <form ref={formRef} className="publish-form publish-wizard" onSubmit={submit} aria-busy={busy} noValidate>
      <fieldset disabled={busy} className="publish-fields">
        {step === 0 && <div className="publish-step-content">
          <div className="wizard-section-title"><h3>Ubica la fiesta</h3><span>QUITO, ECUADOR</span></div>
          <LocationPicker point={point} onPick={updatePoint} />
          <div className={`publish-location${point ? " has-point" : ""}`}><span aria-hidden="true">⌖</span><div><strong>{point ? "Ubicación seleccionada" : "Elige un punto en el mapa"}</strong><span>{point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : "El marcador señalará la entrada de la fiesta."}</span></div></div>
          <details className="manual-coordinates"><summary>Introducir coordenadas</summary><div className="publish-times"><label>Latitud<input type="number" min="-0.5" max="0.1" step="any" data-field="location" aria-invalid={issue?.field === "location"} aria-describedby={issue?.field === "location" ? "publish-validation" : undefined} value={latitudeText} onInput={(e) => updateCoordinate("latitude", e.currentTarget.value)} /></label><label>Longitud<input type="number" min="-78.8" max="-78.2" step="any" aria-invalid={issue?.field === "location"} value={longitudeText} onInput={(e) => updateCoordinate("longitude", e.currentTarget.value)} /></label></div></details>
        </div>}
        {step === 1 && <div className="publish-step-content">
          <div className="wizard-section-title"><h3>Elige el momento</h3><span>HORA DE QUITO</span></div>
          <div className="status-options" role="group" aria-label="Estado de la fiesta">{([['active','Está ocurriendo','La fiesta ya empezó'],['planned','Será más tarde','Un plan para después']] as const).map(([value,label,description]) => <button key={value} type="button" aria-pressed={status === value} className={status === value ? "is-active" : ""} data-field={value === "active" ? "status" : undefined} onClick={() => { setStatus(value); setCandidates(null); clearIssue(); }}><span>{label}</span><small>{description}</small></button>)}</div>
          <label>Fecha <span className="field-optional">{status === "planned" ? "Obligatoria para fiestas futuras" : "Opcional · sin fecha se interpreta como hoy"}</span><input type="date" data-field="eventDate" aria-invalid={issue?.field === "eventDate"} aria-describedby={issue?.field === "eventDate" ? "publish-validation" : undefined} value={eventDate} required={status === "planned"} onInput={(e) => { setEventDate(e.currentTarget.value); setCandidates(null); clearIssue(); }} /></label>
          <div className="publish-times"><label>Hora de inicio<input type="time" data-field="startTime" aria-invalid={issue?.field === "startTime"} aria-describedby={issue?.field === "startTime" ? "publish-validation" : undefined} value={startTime} required onInput={(e) => { setStartTime(e.currentTarget.value); setCandidates(null); clearIssue(); }} /></label><label>Hora de fin <span className="field-optional">Opcional</span><input type="time" data-field="endTime" aria-invalid={issue?.field === "endTime"} aria-describedby={issue?.field === "endTime" ? "publish-validation" : undefined} value={endTime} onInput={(e) => { setEndTime(e.currentTarget.value); setCandidates(null); clearIssue(); }} /></label></div>
          <label className="publish-checkbox"><input type="checkbox" data-field="endDayOffset" aria-invalid={issue?.field === "endDayOffset"} aria-describedby={issue?.field === "endDayOffset" ? "publish-validation" : undefined} checked={nextDay} disabled={!endTime} onChange={(e) => { setNextDay(e.target.checked); setCandidates(null); clearIssue(); }} />Termina al día siguiente</label>
          <p className="wizard-info">Sin hora de fin, mostraremos “fin indefinido”. Si empezó ayer y continúa después de medianoche, indica la fecha de ayer.</p>
        </div>}
        {step === 2 && <div className="publish-design-grid"><div className="publish-step-content">
          <div className="wizard-section-title"><h3>Dale su identidad</h3></div>
          <label>Nombre de la fiesta <span className="field-optional">Opcional</span><input type="text" value={title} maxLength={80} placeholder="Ej. Una noche en Quito" onChange={(e) => setTitle(e.target.value)} /></label>
          <label>Elige una portada</label><div className="cover-options">{coverPresets.map((cover) => <button type="button" key={cover.id} aria-label={cover.label} aria-pressed={!file && preset === cover.id} className={!file && preset === cover.id ? "is-active" : ""} style={{ backgroundImage: `url(${cover.src})` }} onClick={() => { setPreset(cover.id); setFile(null); setCoverError(""); clearIssue(); if (draftPath.current) void fetch(`/api/events/cover?path=${draftPath.current}`, { method: "DELETE" }); draftPath.current = null; }}><span>{cover.label}</span></button>)}</div>
          <label className="cover-upload"><span><Icon name={file ? "check" : "upload"} />{file ? file.name : "Subir mi propia imagen"}</span><small>JPG, PNG o WebP · hasta 3 MB</small><input type="file" data-field="cover" aria-invalid={issue?.field === "cover"} aria-describedby={issue?.field === "cover" ? "publish-validation" : undefined} accept="image/jpeg,image/png,image/webp" onChange={(e) => { chooseFile(e.target.files?.[0] ?? null); e.target.value = ""; }} /></label>
          <p className="wizard-info">Tu ficha tendrá un enlace y un QR para compartirla. Si confirmas una fiesta ya publicada, se conserva su portada.</p>
        </div><div className="design-preview" aria-label="Vista previa de la ficha" style={{ backgroundImage: `linear-gradient(180deg, #160f230a, #120d20f2), url("${file ? preview : presetSource(preset)}")` }}><span>CAPRY / QUITO</span><div><small>VISTA PREVIA</small><h3>{title.trim() || "Tu próxima noche."}</h3><p>{startTime} — {endTime || "fin indefinido"}{endTime && nextDay ? " (+1 día)" : ""}</p><span className="preview-rule" /><p>Ubicación · Horario · Aforo</p></div></div></div>}
      </fieldset>
      {issue && <p ref={issueRef} id="publish-validation" className="publish-error" role="alert" tabIndex={-1}>{issue.message}</p>}
      {error && <p className="publish-error" role="alert">{error}</p>}
      {candidates !== null && <section className="publish-candidates"><h3>Hay fiestas cerca de este lugar</h3><p>Revisa si es la misma antes de crear otra ficha.</p>{candidates.map((item) => <div className="publish-candidate" key={item.id}><strong>{item.event_date ?? "Hoy"} · {item.start_time.slice(0,5)} — {item.end_time?.slice(0,5) ?? "fin indefinido"}{item.end_day_offset ? " (+1 día)" : ""}</strong><span>{item.status === "planned" ? "Futura" : "En curso"}</span>{item.same_schedule && <button type="button" disabled={busy} onClick={() => void publish("confirm",item)}>Es la misma fiesta <Icon name="arrow-up-right" /></button>}</div>)}<button type="button" className="publish-primary" disabled={busy} onClick={() => void publish("create")}>Es otra fiesta · crear ficha</button><button type="button" className="publish-secondary" disabled={busy} onClick={() => setCandidates(null)}>Volver a revisar</button></section>}
      <footer className="wizard-footer"><button type="button" className="publish-secondary" disabled={busy} onClick={() => { if (step) { setStep(step - 1); setCandidates(null); clearIssue(); } else onClose(); }}>{step > 0 && <Icon name="arrow-left" />}{step ? "Anterior" : "Cancelar"}</button>{candidates === null && <button type="submit" className="publish-primary" disabled={busy}>{busy ? "Preparando tu fiesta…" : step === 2 ? <>Revisar y publicar <Icon name="arrow-up-right" /></> : <>Continuar <Icon name="arrow-right" /></>}</button>}</footer>
    </form>
  </Modal>;
}
