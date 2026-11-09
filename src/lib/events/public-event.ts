import type { CrowdLevel, LiveEvent } from "@/features/map/live-event";

type PublicEventRow = Omit<LiveEvent, "report_count" | "crowd_level" | "accepts_attendance" | "accepts_crowd"> & {
  created_at: string;
};

const quitoParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function quitoStamp(instant: Date) {
  const parts = Object.fromEntries(quitoParts.formatToParts(instant).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function nextDay(date: string, offset: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
}

export function toPublicEvent(row: PublicEventRow): LiveEvent {
  const low = Number(row.low_count);
  const medium = Number(row.medium_count);
  const full = Number(row.full_count);
  const reportCount = low + medium + full;
  // If reports tie, show the higher crowd level so the marker stays cautious.
  const crowdLevel: CrowdLevel | null = reportCount === 0 ? null
    : full >= medium && full >= low ? "full"
    : medium >= low ? "medium" : "low";
  const now = quitoStamp(new Date());
  const eventDate = row.event_date ?? quitoStamp(new Date(row.created_at)).slice(0, 10);
  const start = `${eventDate}T${row.start_time}`;
  const end = row.end_time ? `${nextDay(eventDate, row.end_day_offset)}T${row.end_time}` : null;
  const plannedOpen = row.status === "planned" && start > now;
  const activeOpen = row.status === "active" && start <= now && (!end || end > now);
  return {
    ...row,
    planned_count: Number(row.planned_count),
    low_count: low, medium_count: medium, full_count: full,
    publication_count: Number(row.publication_count),
    report_count: reportCount,
    crowd_level: crowdLevel,
    accepts_attendance: plannedOpen || activeOpen,
    accepts_crowd: activeOpen,
  };
}
