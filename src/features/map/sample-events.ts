import type { Coordinates } from "./coordinates";

export type CrowdLevel = "low" | "medium" | "full";

export type ExampleEvent = Readonly<{
  id: string;
  name: string;
  neighborhood: string;
  coordinates: Coordinates;
  schedule: string;
  plannedCount: number;
  plannedLevel: CrowdLevel;
  plannedLabel: string;
  crowdLevel: CrowdLevel;
  crowdLabel: string;
  lastReportTime: string;
}>;

export const quitoCenter: Coordinates = { latitude: -0.196, longitude: -78.483 };

// Fictional examples. Do not treat these entries or their reports as live data.
export const exampleEvents: readonly ExampleEvent[] = [
  {
    id: "mariscal",
    name: "Ritmo en La Mariscal",
    neighborhood: "La Mariscal",
    coordinates: { latitude: -0.202, longitude: -78.491 },
    schedule: "21:00 – 02:00",
    plannedCount: 46,
    plannedLevel: "medium",
    plannedLabel: "media",
    crowdLevel: "medium",
    crowdLabel: "medio",
    lastReportTime: "22:15",
  },
  {
    id: "floresta",
    name: "Noche en La Floresta",
    neighborhood: "La Floresta",
    coordinates: { latitude: -0.209, longitude: -78.482 },
    schedule: "20:30 – fin indefinido",
    plannedCount: 28,
    plannedLevel: "low",
    plannedLabel: "baja",
    crowdLevel: "low",
    crowdLabel: "bajo",
    lastReportTime: "21:40",
  },
  {
    id: "centro",
    name: "Luces del Centro",
    neighborhood: "Centro Histórico",
    coordinates: { latitude: -0.219, longitude: -78.513 },
    schedule: "22:00 – 03:00",
    plannedCount: 83,
    plannedLevel: "full",
    plannedLabel: "full",
    crowdLevel: "full",
    crowdLabel: "full",
    lastReportTime: "22:35",
  },
  {
    id: "inaquito",
    name: "Pulso Norte",
    neighborhood: "Iñaquito",
    coordinates: { latitude: -0.177, longitude: -78.484 },
    schedule: "19:00 – 01:00",
    plannedCount: 19,
    plannedLevel: "low",
    plannedLabel: "baja",
    crowdLevel: "low",
    crowdLabel: "bajo",
    lastReportTime: "20:10",
  },
  {
    id: "guapulo",
    name: "Encuentro en Guápulo",
    neighborhood: "Guápulo",
    coordinates: { latitude: -0.205, longitude: -78.467 },
    schedule: "21:30 – fin indefinido",
    plannedCount: 37,
    plannedLevel: "medium",
    plannedLabel: "media",
    crowdLevel: "medium",
    crowdLabel: "medio",
    lastReportTime: "22:05",
  },
];
