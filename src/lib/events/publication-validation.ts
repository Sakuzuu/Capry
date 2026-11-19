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
const dateFormat = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export function quitoTimestamp(now: Date) {
  const parts = Object.fromEntries(quitoClock.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}
// A party already in progress is published from the server's Quito clock.
// Keep the next-day preference in the UI, but an indefinite end has no offset.
export function publicationSchedule(draft: Schedule, now = new Date()): Schedule {
  const current = quitoTimestamp(now);
  return {
    ...draft,
    eventDate: draft.status === "active" ? current.slice(0, 10) : draft.eventDate,
    startTime: draft.status === "active" ? current.slice(11, 16) : draft.startTime,
    endTime: draft.endTime || null,
    endDayOffset: draft.endTime ? draft.endDayOffset : 0,
  };
}
export function shiftDate(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function displayDate(day: string) {
  return dateFormat.format(new Date(`${day}T12:00:00Z`));
}
export function displayTime(time: string) {
  if (!timePattern.test(time)) return "";
  const hour = Number(time.slice(0, 2));
  return `${hour % 12 || 12}:${time.slice(3)} ${hour < 12 ? "a. m." : "p. m."}`;
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
  if (eventDate) {
    const day = new Date(`${eventDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Number.isFinite(day.getTime()) ||
        day.toISOString().slice(0, 10) !== eventDate || eventDate.startsWith("0000")) {
      return { field: "eventDate", message: "Indica una fecha válida." };
    }
  } else if (status === "planned") return { field: "eventDate", message: "Las fiestas futuras necesitan una fecha." };
  if (!timePattern.test(startTime)) return { field: "startTime", message: "Completa la hora de inicio: horas de 00 a 23 y minutos de 00 a 59." };
  if (endTime && !timePattern.test(endTime)) return { field: "endTime", message: "Completa la hora de fin: horas de 00 a 23 y minutos de 00 a 59, o bórrala para dejar fin indefinido." };
  if (![0, 1].includes(endDayOffset) || (!endTime && endDayOffset !== 0)) return { field: "endDayOffset", message: "Revisa si la fiesta termina al día siguiente." };
  if (endTime && endDayOffset === 0 && endTime <= startTime) {
    return { field: "endDayOffset", message: "El fin debe ser posterior al inicio. Elige el día siguiente si la fiesta continúa después de medianoche." };
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
