import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthGuard } from "@/components/Layout/AuthGuard";
import { AppShell } from "@/components/Layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Delirium Infinite — Autonomous AI Agent",
  description:
    "Full-stack autonomous AI agent with voice, tools, and multi-provider LLM support. Accessible from any device.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}
