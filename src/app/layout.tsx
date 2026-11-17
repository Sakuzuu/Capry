import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "./globals.css";
import "./polish.css";
import "./refinement.css";

export const metadata: Metadata = {
  title: "Capry | Fiestas en Quito",
  description: "Descubre fiestas en Quito y comparte lo que está pasando.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
