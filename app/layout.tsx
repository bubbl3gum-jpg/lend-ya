import type { Metadata } from "next";
import "./globals.css";
import "./heritage.css";

export const metadata: Metadata = {
  title: "Hustlen’",
  description: "Peer-to-peer marketplace for physical item rentals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
