export type PublicationField = "location" | "eventDate" | "startTime" | "endTime" | "endDayOffset" | "status" | "cover";
export type PublicationIssue = { field: PublicationField; message: string };
export type Schedule = {
  status: "active" | "planned";
  eventDate: string | null;
  startTime: string;
  endTime: string | null;
  endDayOffset: number;
};
const quitoClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
export function quitoTimestamp(now: Date) {
  const parts = Object.fromEntries(quitoClock.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}
export function validateLocation(point: { latitude: number; longitude: number } | null): PublicationIssue | null {
  if (!point) return { field: "location", message: "Elige el lugar en el mapa o completa ambas coordenadas." };
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
      point.latitude < -0.5 || point.latitude > 0.1 || point.longitude < -78.8 || point.longitude > -78.2) {
    return { field: "location", message: "La ubicación debe estar dentro del área de Quito." };
  }
  return null;
}
export function validateSchedule(schedule: Schedule, now = new Date()): PublicationIssue | null {
  const { status, eventDate, startTime, endTime, endDayOffset } = schedule;
  if (status !== "active" && status !== "planned") return { field: "status", message: "Indica si la fiesta está ocurriendo o será más tarde." };
  if (!timePattern.test(startTime)) return { field: "startTime", message: "Indica una hora de inicio válida." };
  if (endTime && !timePattern.test(endTime)) return { field: "endTime", message: "Revisa la hora de fin." };
  if (eventDate) {
    const day = new Date(`${eventDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Number.isFinite(day.getTime()) ||
        day.toISOString().slice(0, 10) !== eventDate || eventDate.startsWith("0000")) {
      return { field: "eventDate", message: "Indica una fecha válida." };
    }
  } else if (status === "planned") return { field: "eventDate", message: "Las fiestas futuras necesitan una fecha." };
  if (![0, 1].includes(endDayOffset) || (!endTime && endDayOffset !== 0)) return { field: "endDayOffset", message: "Revisa si la fiesta termina al día siguiente." };
  if (endTime && endDayOffset === 0 && endTime <= startTime) {
    return { field: "endDayOffset", message: "La hora de fin debe ser posterior al inicio. Si termina después de medianoche, activa “Termina al día siguiente”." };
  }
  const current = quitoTimestamp(now);
  const eventDay = eventDate || current.slice(0, 10);
  const start = `${eventDay}T${startTime}:00`;
  if (status === "planned" && start <= current) return { field: "startTime", message: "El inicio de una fiesta futura debe ser posterior a la hora actual de Quito." };
  if (status === "active") {
    if (start > current) return { field: "startTime", message: "Esta fiesta aún no empieza. Corrige el inicio o elige “Será más tarde”." };
    if (endTime) {
      const endDate = new Date(`${eventDay}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + endDayOffset);
      const end = `${endDate.toISOString().slice(0, 10)}T${endTime}:00`;
      if (end <= current) return { field: "endTime", message: "La fiesta ya terminó según este horario. Revisa la fecha y la hora de fin." };
    }
  }
  return null;
}
