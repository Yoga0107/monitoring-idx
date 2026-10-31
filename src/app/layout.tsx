/* eslint-disable @next/next/no-page-custom-font -- root layout, fonts match the Stitch export */
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Insight - Indonesian Stock Market (IDX)",
  description: "IHSG, LQ45, IDX30 and IDX80 index dashboard for the Indonesia Stock Exchange.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f131c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Same font sources as the Stitch export. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="bg-background text-on-surface antialiased min-h-screen flex flex-col font-body-md">
        {children}
      </body>
    </html>
  );
}
