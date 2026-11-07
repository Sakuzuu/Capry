import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
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
  const parsedDate = typeof eventDate === "string" && datePattern.test(eventDate)
    ? new Date(`${eventDate}T00:00:00.000Z`) : null;
  const validDate = eventDate === null || eventDate === "" ||
    (parsedDate !== null && Number.isFinite(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === eventDate);
  if (typeof latitude !== "number" || typeof longitude !== "number" ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -0.5 || latitude > 0.1 || longitude < -78.8 || longitude > -78.2 ||
      typeof startTime !== "string" || !timePattern.test(startTime) ||
      !(endTime === null || endTime === "" || (typeof endTime === "string" && timePattern.test(endTime))) ||
      !validDate || (status !== "planned" && status !== "active") ||
      (action !== "check" && action !== "create" && action !== "confirm") ||
      (endDayOffset !== 0 && endDayOffset !== 1) ||
      (!endTime && endDayOffset !== 0) ||
      (endTime && endDayOffset === 0 && endTime <= startTime) ||
      (status === "planned" && !eventDate) ||
      (candidateId !== null && candidateId !== undefined && (typeof candidateId !== "string" || !uuidPattern.test(candidateId)))) {
    return NextResponse.json({ error: "Revisa la ubicación, la fecha y el horario." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: "Inicia sesión para publicar." }, { status: 401 });
  }
  const { data, error } = await supabase.rpc("publish_party", {
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
