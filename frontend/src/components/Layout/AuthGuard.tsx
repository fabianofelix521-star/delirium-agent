"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);

  // Read token only on mount (client-side)
  useEffect(() => {
    setToken(localStorage.getItem("delirium_token"));
    const handler = () => setToken(localStorage.getItem("delirium_token"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (token === undefined) return; // Still loading
    if (isPublic && token) {
      router.replace("/chat");
    } else if (!isPublic && !token) {
      router.replace("/login");
    }
  }, [isPublic, token, router, pathname]);

  // Still loading token from localStorage
  if (token === undefined) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "var(--bg-void)" }}
      >
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{
            borderColor: "var(--accent-primary)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  if (isPublic && !token) return <>{children}</>;
  if (!isPublic && token) return <>{children}</>;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "var(--bg-void)" }}
    >
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{
          borderColor: "var(--accent-primary)",
          borderTopColor: "transparent",
        }}
      />
    </div>
  );
}
