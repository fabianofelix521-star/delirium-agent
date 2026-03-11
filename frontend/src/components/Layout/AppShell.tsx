"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Navbar } from "@/components/Layout/Navbar";
import { MobileNav } from "@/components/Layout/MobileNav";

const BARE_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    if (BARE_PATHS.includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <>
            <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <Navbar />
                    <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                        {children}
                    </main>
                </div>
            </div>
            <MobileNav />
        </>
    );
}
