import "./globals.css";
import type { ReactNode } from "react";
import HideOnRoles from "@/components/shared/HideOnRoles";
import Navbar from "@/components/shared/Navbar";

export const metadata = {
  title: "Oquedal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <HideOnRoles>
          <Navbar />
        </HideOnRoles>

        <div style={{ paddingTop: "56px" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
