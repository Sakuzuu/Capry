import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateLocation, validateSchedule } from "@/lib/events/publication-validation";

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
  const issue = validateLocation({ latitude, longitude }) ?? validateSchedule({
    status, eventDate: eventDate || null, startTime, endTime: endTime || null, endDayOffset,
  });
  if (issue) return NextResponse.json({ error: issue.message, field: issue.field }, { status: 400 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: "Inicia sesión para publicar." }, { status: 401 });
  }
  const { data, error } = await supabase.rpc("publish_designed_party", {
    p_title: title || null, p_cover_preset: preset, p_cover_path: coverPath,
    p_latitude: latitude, p_longitude: longitude,
    p_event_date: eventDate || null, p_start_time: startTime,
    p_end_time: endTime || null, p_end_day_offset: endDayOffset,
    p_status: status, p_action: action,
    p_candidate_id: candidateId || null, p_allow_separate: allowSeparate === true,
  });
  if (error) {
    const validation = ["22023", "22007", "22008", "23514"].includes(error.code);
    return NextResponse.json({ error: validation ? "La fecha, el horario o la ubicación no son válidos." : "No se pudo publicar la fiesta." },
      { status: validation ? 400 : 503 });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
