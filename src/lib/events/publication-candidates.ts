import { quitoTimestamp } from "./publication-validation";

type NearbyEvent = {
  id: string; latitude: number; longitude: number; event_date: string | null;
  start_time: string; end_time: string | null; end_day_offset: number;
  status: string; created_at: string;
};

// The regular publication RPC checks the start date. An active party may have
// started yesterday, so also consider the database's currently visible events.
// This distance check runs on the server, never in the publishing browser.
export function earlierOngoingCandidates(events: NearbyEvent[], point: { latitude: number; longitude: number }, today: string) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  return events.filter((event) => {
    const day = event.event_date || quitoTimestamp(new Date(event.created_at)).slice(0, 10);
    if (event.status !== "active" || day >= today) return false;
    const latitudeDelta = radians(event.latitude - point.latitude);
    const longitudeDelta = radians(event.longitude - point.longitude);
    const arc = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(point.latitude)) * Math.cos(radians(event.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
    return 2 * 6_371_008.8 * Math.asin(Math.sqrt(Math.min(1, arc))) < 250;
  }).map(({ id, latitude, longitude, event_date, start_time, end_time, end_day_offset, status }) => ({
    id, latitude, longitude, event_date, start_time, end_time, end_day_offset, status, same_schedule: true,
  }));
}
