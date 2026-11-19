import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicationSchedule, quitoTimestamp, validateLocation, validateSchedule } from "@/lib/events/publication-validation";
import { earlierOngoingCandidates } from "@/lib/events/publication-candidates";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try { if (new URL(request.headers.get("origin") ?? "").host !== request.headers.get("host")) throw new Error(); }
  catch { return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 }); }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
  }
  let input: Record<string, unknown>;
  try {
    input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const { latitude, longitude, eventDate, startTime, endTime, endDayOffset, status, action, candidateId, allowSeparate } = input;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const preset = input.coverPreset ?? "night";
  const coverPath = input.coverPath ?? null;
  if (title.length > 80 || !["night", "aurora", "pulse"].includes(String(preset)) ||
    (coverPath !== null && (typeof coverPath !== "string" || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(coverPath)))) {
    return NextResponse.json({ error: "Revisa el nombre y la portada." }, { status: 400 });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number" ||
      typeof startTime !== "string" ||
      !(endTime === null || endTime === "" || typeof endTime === "string") ||
      !(eventDate === null || typeof eventDate === "string") ||
      (status !== "planned" && status !== "active") ||
      (action !== "check" && action !== "create" && action !== "confirm") ||
      (endDayOffset !== 0 && endDayOffset !== 1) ||
      (candidateId !== null && candidateId !== undefined && (typeof candidateId !== "string" || !uuidPattern.test(candidateId)))) {
    return NextResponse.json({ error: "Revisa la ubicación, la fecha y el horario." }, { status: 400 });
  }
  let schedule = publicationSchedule({
    status, eventDate: eventDate || null, startTime, endTime: endTime || null, endDayOffset,
  });
  const confirmsActive = status === "active" && action === "confirm";
  const issue = validateLocation({ latitude, longitude }) ?? (confirmsActive ? null : validateSchedule(schedule));
  if (issue) return NextResponse.json({ error: issue.message, field: issue.field }, { status: 400 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: "Inicia sesión para publicar." }, { status: 401 });
  }
  if (confirmsActive) {
    if (!candidateId) return NextResponse.json({ error: "Selecciona la fiesta que quieres confirmar." }, { status: 400 });
    // Confirm the stored schedule, never a browser-supplied replacement. The
    // publication RPC still checks the candidate's distance, date and identity.
    const details = await supabase.rpc("event_details", { p_event_id: candidateId });
    if (details.error) return NextResponse.json({ error: "No se pudo revisar la fiesta cercana." }, { status: 503 });
    const candidate = details.data?.[0];
    if (!candidate || candidate.status !== "active") return NextResponse.json({ error: "La fiesta cercana cambió. Vuelve a revisar las opciones." }, { status: 409 });
    schedule = {
      status: "active", eventDate: candidate.event_date || quitoTimestamp(new Date(candidate.created_at)).slice(0, 10),
      startTime: candidate.start_time.slice(0, 5), endTime: candidate.end_time?.slice(0, 5) || null,
      endDayOffset: candidate.end_day_offset,
    };
    const candidateIssue = validateSchedule(schedule);
    if (candidateIssue) return NextResponse.json({ error: "La fiesta cercana ya no está en curso. Vuelve a revisar las opciones." }, { status: 409 });
  }
  let earlierCandidates: ReturnType<typeof earlierOngoingCandidates> = [];
  if (status === "active" && !confirmsActive && !(action === "create" && allowSeparate === true)) {
    const nearby = await supabase.rpc("visible_events_in_bounds", {
      p_west: longitude - .0035, p_east: longitude + .0035,
      p_south: latitude - .0035, p_north: latitude + .0035,
    });
    if (nearby.error) return NextResponse.json({ error: "No se pudieron revisar las fiestas cercanas. Inténtalo de nuevo." }, { status: 503 });
    earlierCandidates = earlierOngoingCandidates(nearby.data || [], { latitude, longitude }, schedule.eventDate!);
  }
  const needsEarlierConfirmation = action === "create" && earlierCandidates.length > 0 && allowSeparate !== true;
  const { data, error } = await supabase.rpc("publish_designed_party", {
    p_title: title || null, p_cover_preset: preset, p_cover_path: coverPath,
    p_latitude: latitude, p_longitude: longitude,
    p_event_date: schedule.eventDate, p_start_time: schedule.startTime,
    p_end_time: schedule.endTime, p_end_day_offset: schedule.endDayOffset,
    p_status: schedule.status, p_action: needsEarlierConfirmation ? "check" : action,
    p_candidate_id: candidateId || null, p_allow_separate: allowSeparate === true,
  });
  if (error) {
    const validation = ["22023", "22007", "22008", "23514"].includes(error.code);
    return NextResponse.json({ error: validation ? "La fecha, el horario o la ubicación no son válidos." : "No se pudo publicar la fiesta." },
      { status: validation ? 400 : 503 });
  }
  if (earlierCandidates.length) {
    return NextResponse.json({ ...data, outcome: needsEarlierConfirmation ? "needs_confirmation" : data.outcome,
      candidates: [...(data.candidates || []), ...earlierCandidates],
    }, { headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
