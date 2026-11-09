import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toPublicEvent } from "@/lib/events/public-event";
import type { CrowdLevel, LiveEvent } from "@/features/map/live-event";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };
type Client = Awaited<ReturnType<typeof createClient>>;

async function readEvent(supabase: Client, id: string): Promise<LiveEvent | null> {
  const { data, error } = await supabase.rpc("event_details", { p_event_id: id });
  if (error) throw error;
  return data?.[0] ? toPublicEvent(data[0]) : null;
}

async function readOwnResponse(supabase: Client, id: string, userId: string) {
  const [attendance, crowd] = await Promise.all([
    supabase.from("planned_attendance").select("event_id").eq("event_id", id).eq("user_id", userId).maybeSingle(),
    supabase.from("crowd_reports").select("level").eq("event_id", id).eq("user_id", userId).maybeSingle(),
  ]);
  if (attendance.error || crowd.error) throw attendance.error ?? crowd.error;
  return {
    planned: Boolean(attendance.data),
    crowdLevel: (crowd.data?.level ?? null) as CrowdLevel | null,
  };
}

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const supabase = await createClient();
  try {
    const event = await readEvent(supabase, id);
    if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
    const { data: { user } } = await supabase.auth.getUser();
    const mine = user && !user.is_anonymous ? await readOwnResponse(supabase, id, user.id) : null;
    return NextResponse.json({ event, mine }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el evento." }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  let originHost = "";
  try { originHost = new URL(request.headers.get("origin") ?? "").host; } catch { /* Missing or invalid origin. */ }
  if (!originHost || originHost !== request.headers.get("host")) {
    return NextResponse.json({ error: "Solicitud no permitida." }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { input = null; }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const payload = input as Record<string, unknown>;
  const isAttendance = payload.action === "attendance" && typeof payload.planned === "boolean";
  const isCrowd = payload.action === "crowd" && ["low", "medium", "full"].includes(String(payload.level));
  const isRemoveCrowd = payload.action === "remove_crowd";
  if (!isAttendance && !isCrowd && !isRemoveCrowd) return NextResponse.json({ error: "Respuesta inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.is_anonymous) {
    return NextResponse.json({ error: "Inicia sesión para responder." }, { status: 401 });
  }
  try {
    const event = await readEvent(supabase, id);
    if (!event) return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
    if ((isAttendance && payload.planned === true && !event.accepts_attendance) || (isCrowd && !event.accepts_crowd)) {
      return NextResponse.json({ error: "Esta fiesta ya no admite esa respuesta." }, { status: 409 });
    }
    const write = isAttendance
      ? payload.planned
        ? await supabase.from("planned_attendance").upsert({ event_id: id, user_id: user.id }, { onConflict: "event_id,user_id", ignoreDuplicates: true })
        : await supabase.from("planned_attendance").delete().eq("event_id", id).eq("user_id", user.id)
      : isRemoveCrowd
        ? await supabase.from("crowd_reports").delete().eq("event_id", id).eq("user_id", user.id)
        : await supabase.from("crowd_reports").upsert({ event_id: id, user_id: user.id, level: payload.level as CrowdLevel }, { onConflict: "event_id,user_id" });
    if (write.error) {
      const invalidState = ["42501", "23514"].includes(write.error.code);
      return NextResponse.json({ error: invalidState ? "La fiesta ya no admite esa respuesta." : "No se pudo guardar la respuesta." },
        { status: invalidState ? 409 : 503 });
    }
    const [updated, mine] = await Promise.all([readEvent(supabase, id), readOwnResponse(supabase, id, user.id)]);
    return NextResponse.json({ event: updated, mine }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la respuesta." }, { status: 503 });
  }
}
