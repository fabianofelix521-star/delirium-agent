"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Mic,
  Wrench,
  LayoutDashboard,
  Settings,
  Bot,
  Code2,
} from "lucide-react";

const mobileNavItems = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/code", label: "Code", icon: Code2 },
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden flex items-center justify-around shrink-0"
      style={{
        height: 60,
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
            className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all"
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
            <Icon
              size={19}
              strokeWidth={isActive ? 2.2 : 1.5}
              style={{
                color: isActive ? "var(--accent-indigo)" : "var(--text-ghost)",
                filter: isActive
                  ? "drop-shadow(0 0 6px rgba(99,102,241,0.35))"
                  : "none",
                transition: "all 0.2s",
              }}
            />
            <span
              className="text-[9px] font-semibold"
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
