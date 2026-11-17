import type { createClient } from "@/lib/supabase/server";
import type { LiveEvent } from "@/features/map/live-event";
import { presetSource } from "@/features/events/covers";

type Client = Awaited<ReturnType<typeof createClient>>;
export async function withEventDesigns(client: Client, events: LiveEvent[]): Promise<LiveEvent[]> {
  if (!events.length) return events;
  const { data, error } = await client.from("event_designs").select("event_id,title,cover_preset,cover_path").in("event_id", events.map((event) => event.id));
  if (error) throw error;
  const designs = new Map((data ?? []).map((design) => [design.event_id, design]));
  return events.map((event) => {
    const design = designs.get(event.id);
    return { ...event, title: design?.title ?? null, cover_url: design?.cover_path
      ? client.storage.from("event-covers").getPublicUrl(design.cover_path).data.publicUrl
      : presetSource(design?.cover_preset) };
  });
}
