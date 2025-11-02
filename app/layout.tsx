import "./globals.css";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/app/_components/NavBar"), { ssr: false });

export const metadata = { title: "oquedal logística", description: "Servicios de mudanza y envío" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#0b0b10] text-zinc-100">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
