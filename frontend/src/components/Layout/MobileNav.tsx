"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MessageCircle,
  LayoutDashboard,
  Code2,
  Link2,
  Settings,
  Sparkles,
  Wrench,
  Brain,
  Puzzle,
  Bot,
  MoreHorizontal,
  X,
  Radio,
  Hand,
  GitBranch,
  Calendar,
  Mic,
  Activity,
  BarChart3,
  FileText,
  MessageSquare,
  ShieldCheck,
  MessagesSquare,
  Server,
  Github,
} from "lucide-react";

const primaryNavItems = [
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/code", label: "Code", icon: Code2 },
  { href: "/overview", label: "Overview", icon: Activity },
  { href: "/skills", label: "Skills", icon: Sparkles },
];

const moreNavItems = [
  { href: "/voice", label: "Voice", icon: Mic },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/logs", label: "Logs", icon: FileText },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/sessions", label: "Sessions", icon: MessageSquare },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/comms", label: "Comms", icon: MessagesSquare },
  { href: "/hands", label: "Hands", icon: Hand },
  { href: "/channels", label: "Channels", icon: Radio },
  { href: "/workflows", label: "Workflows", icon: GitBranch },
  { href: "/scheduler", label: "Scheduler", icon: Calendar },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/runtime", label: "Runtime", icon: Server },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/integrations", label: "MCPs", icon: Link2 },
  { href: "/copilot", label: "Copilot", icon: Github },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = moreNavItems.some(
    (i) => pathname === i.href || pathname?.startsWith(i.href + "/"),
  );

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 z-50"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 animate-slide-up"
            style={{
              paddingBottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-3 mb-2 rounded-2xl overflow-hidden"
              style={{
                background: "var(--glass-bg-solid)",
                border: "1px solid var(--glass-border)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--glass-border)" }}
              >
                <span
                  className="text-[12px] font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Mais opções
                </span>
                <button
                  onClick={() => setShowMore(false)}
                  className="p-1 rounded-lg"
                  style={{ color: "var(--text-ghost)" }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 p-3">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95"
                      style={{
                        background: isActive
                          ? "rgba(99,102,241,0.1)"
                          : "transparent",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: isActive
                            ? "rgba(99,102,241,0.15)"
                            : "var(--bg-elevated)",
                          border: `1px solid ${isActive ? "rgba(99,102,241,0.3)" : "var(--glass-border)"}`,
                        }}
                      >
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.2 : 1.5}
                          style={{
                            color: isActive
                              ? "var(--accent-indigo)"
                              : "var(--text-ghost)",
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-semibold"
                        style={{
                          color: isActive
                            ? "var(--accent-indigo)"
                            : "var(--text-muted)",
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav
        className="md:hidden mx-3 mb-2 flex shrink-0 items-center justify-around rounded-3xl"
        style={{
          height: "60px",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)), rgba(15,23,32,0.7)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(34px) saturate(160%)",
          WebkitBackdropFilter: "blur(34px) saturate(160%)",
          boxShadow:
            "0 -8px 34px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {primaryNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center gap-0.5 min-w-13 py-1.5 rounded-xl transition-all active:scale-95"
            >
              {isActive && (
                <div
                  className="absolute -top-px w-5 h-0.5 rounded-full"
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
                  color: isActive
                    ? "var(--accent-indigo)"
                    : "var(--text-ghost)",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="relative flex flex-col items-center justify-center gap-0.5 min-w-13 py-1.5 rounded-xl transition-all active:scale-95"
        >
          {isMoreActive && (
            <div
              className="absolute -top-px w-5 h-0.5 rounded-full"
              style={{
                background: "var(--accent-gradient)",
                boxShadow: "0 0 10px rgba(99,102,241,0.4)",
              }}
            />
          )}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background:
                isMoreActive || showMore
                  ? "rgba(99,102,241,0.1)"
                  : "transparent",
            }}
          >
            <MoreHorizontal
              size={20}
              strokeWidth={isMoreActive || showMore ? 2.2 : 1.5}
              style={{
                color:
                  isMoreActive || showMore
                    ? "var(--accent-indigo)"
                    : "var(--text-ghost)",
                filter:
                  isMoreActive || showMore
                    ? "drop-shadow(0 0 6px rgba(99,102,241,0.35))"
                    : "none",
                transition: "all 0.2s",
              }}
            />
          </div>
          <span
            className="text-[9px] font-semibold leading-none"
            style={{
              color:
                isMoreActive || showMore
                  ? "var(--accent-indigo)"
                  : "var(--text-ghost)",
            }}
          >
            Mais
          </span>
        </button>
      </nav>
    </>
  );
}
