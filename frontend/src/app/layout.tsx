import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Navbar } from "@/components/Layout/Navbar";
import { MobileNav } from "@/components/Layout/MobileNav";

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
                <div className="flex h-screen overflow-hidden">
                    {/* Sidebar - desktop only */}
                    <Sidebar />

                    {/* Main area */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <Navbar />
                        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                            {children}
                        </main>
                    </div>
                </div>

                {/* Mobile bottom nav */}
                <MobileNav />
            </body>
        </html>
    );
}
