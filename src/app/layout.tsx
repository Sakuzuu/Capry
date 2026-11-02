import type { Metadata } from "next";
import "./globals.css";

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
