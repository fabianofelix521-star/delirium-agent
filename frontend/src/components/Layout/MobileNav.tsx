"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  LayoutDashboard,
  Code2,
  Link2,
  Settings,
  Sparkles,
} from "lucide-react";

const mobileNavItems = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/code", label: "Code", icon: Code2 },
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/integrations", label: "MCPs", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden flex items-center justify-around shrink-0"
      style={{
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "var(--glass-bg-solid)",
        borderTop: "1px solid var(--glass-border)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
      }}
    >
      {mobileNavItems.map((item) => {
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1.5 rounded-xl transition-all active:scale-95"
          >
            {isActive && (
              <div
                className="absolute -top-px w-5 h-[2px] rounded-full"
                style={{
                  background: "var(--accent-gradient)",
                  boxShadow: "0 0 10px rgba(99,102,241,0.4)",
                }}
              />
            )}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
              }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.2 : 1.5}
                style={{
                  color: isActive
                    ? "var(--accent-indigo)"
                    : "var(--text-ghost)",
                  filter: isActive
                    ? "drop-shadow(0 0 6px rgba(99,102,241,0.35))"
                    : "none",
                  transition: "all 0.2s",
                }}
              />
            </div>
            <span
              className="text-[9px] font-semibold leading-none"
              style={{
                color: isActive ? "var(--accent-indigo)" : "var(--text-ghost)",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
