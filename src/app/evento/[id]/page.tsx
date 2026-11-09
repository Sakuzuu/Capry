import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/features/map/event-card";
import { toPublicEvent } from "@/lib/events/public-event";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const supabase = await createClient();
  const [details, auth] = await Promise.all([
    supabase.rpc("event_details", { p_event_id: id }),
    supabase.auth.getUser(),
  ]);
  if (details.error) throw new Error("No se pudo cargar el evento.");
  if (!details.data?.[0]) notFound();
  const event = toPublicEvent(details.data[0]);
  const user = !auth.error && auth.data.user && !auth.data.user.is_anonymous ? auth.data.user : null;

  return <div className="site-shell">
    <SiteHeader email={user?.email} />
    <main className="event-page-main">
      <Link className="event-back" href="/#mapa">← Volver al mapa</Link>
      <div className="event-page-layout">
        <div className="event-page-intro">
          <p className="eyebrow">Fiestas en Quito</p>
          <h1>La ficha de la fiesta.</h1>
          <p>Consulta el horario, la asistencia prevista y el aforo. Este enlace sigue disponible cuando la fiesta deja de aparecer en el mapa activo.</p>
        </div>
        <EventCard initialEvent={event} canInteract={Boolean(user)} />
      </div>
    </main>
    <SiteFooter />
  </div>;
}
