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
  status: "planned" | "active" | "ended" | "cancelled" | "archived";
  planned_count: number;
  low_count: number;
  medium_count: number;
  full_count: number;
  last_report_at: string | null;
  publication_count: number;
  report_count: number;
  crowd_level: CrowdLevel | null;
  accepts_attendance: boolean;
  accepts_crowd: boolean;
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
export const markerLevel = (event: LiveEvent): CrowdLevel | "none" =>
  event.status === "planned" ? plannedLevel(event.planned_count) : event.crowd_level ?? "none";
export const crowdLabel = (level: CrowdLevel | null) => level === "low" ? "bajo" : level === "medium" ? "medio" : level === "full" ? "full" : "sin reportes";
