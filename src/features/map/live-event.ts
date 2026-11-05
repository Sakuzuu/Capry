import type { Coordinates } from "./coordinates";

export type CrowdLevel = "low" | "medium" | "full";
export type LiveEvent = {
  id: string;
  latitude: number;
  longitude: number;
  event_date: string | null;
  start_time: string;
  end_time: string | null;
  end_day_offset: number;
  status: "planned" | "active";
  planned_count: number;
  low_count: number;
  medium_count: number;
  full_count: number;
  last_report_at: string | null;
  publication_count: number;
};
export const quitoCenter: Coordinates = { latitude: -0.196, longitude: -78.483 };
export const eventName = (event: LiveEvent) => event.publication_count > 1
  ? `Fiesta compartida · ${event.publication_count} publicaciones` : "Fiesta en Quito";
export const eventSchedule = (event: LiveEvent) => {
  const start = event.start_time.slice(0, 5);
  const end = event.end_time ? event.end_time.slice(0, 5) : "fin indefinido";
  return `${event.event_date ? `${event.event_date} · ` : ""}${start} – ${end}${event.end_day_offset ? " (+1 día)" : ""}`;
};
export const plannedLevel = (count: number): CrowdLevel => count >= 30 ? "full" : count >= 10 ? "medium" : "low";
export const crowdLevel = (event: LiveEvent): CrowdLevel | null => {
  const votes = [["low", event.low_count], ["medium", event.medium_count], ["full", event.full_count]] as const;
  const max = Math.max(...votes.map(([, count]) => count));
  return max ? votes.find(([, count]) => count === max)![0] : null;
};
export const crowdLabel = (level: CrowdLevel | null) => level === "low" ? "bajo" : level === "medium" ? "medio" : level === "full" ? "full" : "sin reportes";
