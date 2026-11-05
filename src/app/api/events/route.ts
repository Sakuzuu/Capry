import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keys = ["west", "south", "east", "north"];
  const [west, south, east, north] = keys.map((key) => Number(params.get(key)));
  if (keys.some((key) => !params.has(key)) ||
      [west, south, east, north].some((value) => !Number.isFinite(value)) ||
      west < -180 || east > 180 || south < -90 || north > 90 ||
      west >= east || south >= north || east - west > 2 || north - south > 2) {
    return NextResponse.json({ error: "Área del mapa inválida." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("visible_events_in_bounds", {
    p_west: west, p_south: south, p_east: east, p_north: north,
  });
  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar los eventos." }, { status: 503 });
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "private, no-store" },
  });
}
