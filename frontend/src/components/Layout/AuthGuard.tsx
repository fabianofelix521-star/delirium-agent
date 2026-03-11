"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

function subscribe(cb: () => void) {
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
}

function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("delirium_token") : null;
}

function getServerToken() {
    return null;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const token = useSyncExternalStore(subscribe, getToken, getServerToken);

    const isPublic = PUBLIC_PATHS.includes(pathname);

    useEffect(() => {
        if (isPublic && token) {
            router.replace("/chat");
        } else if (!isPublic && !token) {
            router.replace("/login");
        }
    }, [isPublic, token, router]);

    if (isPublic && !token) return <>{children}</>;
    if (!isPublic && token) return <>{children}</>;

    return (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "var(--bg-void)" }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
        </div>
    );
}

