'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const BG = "#0f172a";
const BORDER = "#1e293b";
const TEXT = "#e5e7eb";
const MUTED = "#94a3b8";
const ACCENT = "#2563eb";
const ACTIVE_BG = "#1e293b";

const LINKS = [
  {
    label: "Home",
    href: "./dashboard",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Calendrier",
    href: "./calendrier",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" strokeLinecap="round" />
        <path d="M8 3v4M16 3v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Transactions",
    href: "./transaction",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 23l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Réservations",
    href: "./reservation",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="3" width="14" height="18" rx="2" strokeLinejoin="round" />
        <path d="M9 3v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={[
        "sticky top-0 flex h-screen flex-col gap-2 border-r rounded-md p-4 transition-all duration-300",
        collapsed ? "w-16 px-2" : "w-48 sm:w-56 md:w-64",
      ].join(" ")}
      style={{ background: BG, borderColor: BORDER, color: TEXT }}
    >
      <div className="mb-4 flex items-center justify-between">
        {!collapsed && <span className="text-lg font-semibold">Menu</span>}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
          className="rounded-md p-1.5 hover:opacity-80"
          style={{ color: MUTED, border: `1px solid ${BORDER}` }}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}
          >
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            title={collapsed ? link.label : undefined}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium"
            style={{
              background: isActive ? ACTIVE_BG : "transparent",
              color: isActive ? ACCENT : MUTED,
              borderLeft: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            {link.icon}
            {!collapsed && link.label}
          </Link>
        );
      })}
    </nav>
  );
}