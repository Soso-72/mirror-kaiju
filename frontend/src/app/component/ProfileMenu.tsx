'use client';
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, getUserLogin, getUserProfile, setAuthToken } from "../utils/user";

/**
 * Menu profil, fixé en haut à droite, dans le même style visuel que
 * DistrictAlertMap (fond bleu-nuit, bordures fines, palette identique).
 *
 * Récupère le profil de l'utilisateur connecté via le backend
 * (GET /user/me), avec un état de repli si la requête échoue.
 * Se ferme au clic en dehors ou avec la touche Échap.
 */

type OfficerRole = "QC" | "LC" | "CD";

interface UserProfile {
  name: string;
  email: string;
  role: OfficerRole;
}

const ROLE_LABEL: Record<OfficerRole, string> = {
  QC: "Quarter Coordinator",
  LC: "Logistics Coordinator",
  CD: "City Director",
};

const ROLE_COLOR: Record<OfficerRole, string> = {
  QC: "#38bdf8",
  LC: "#a78bfa",
  CD: "#f59e0b",
};

const FALLBACK_USER: UserProfile = {
  name: "Utilisateur inconnu",
  email: "—",
  role: "QC",
};

const DEMO_LOGIN = {
  email: "qc.apex@tokyork.gov",
  password: "Kaiju@2026!",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        setLoading(true);

        let token = getStoredToken();

        if (!token && sessionStorage.getItem("skipDemoLogin") === "1") {
          setUser(null);
          setError(null);
          return;
        }

        if (!token) {
          const loginPayload = await getUserLogin(DEMO_LOGIN.email, DEMO_LOGIN.password);
          token = loginPayload?.response?.token ?? null;

          if (token) {
            localStorage.setItem("token", token);
            setAuthToken(token);
          }
        }

        const payload = await getUserProfile(token);
        const data = payload.response ?? payload;

        setUser({
          name: data.name ?? data.email?.split("@")[0] ?? "Utilisateur",
          email: data.email ?? "—",
          role: data.role ?? "QC",
        });
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setUser(FALLBACK_USER);
        setError("Profil indisponible");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    return () => controller.abort();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.setItem("skipDemoLogin", "1");
    setAuthToken(null);
    setUser(null);
    setOpen(false);
    router.push("/authentification");
  };

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const display = user ?? FALLBACK_USER;
  const roleColor = ROLE_COLOR[display.role] ?? "#7c88a3";

  return (
    <div ref={containerRef} className="fixed right-6 top-6 z-50">
      {/* Bouton */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[#1c2740] bg-[#0e1626] py-1.5 pl-1.5 pr-3 text-sm text-[#e7ebf3] transition hover:border-[#2a3a5c]"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: roleColor }}
        >
          {loading ? "…" : getInitials(display.name) || "?"}
        </span>
        <span className="hidden sm:inline">{loading ? "Chargement…" : display.name}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`text-[#7c88a3] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-[#1c2740] bg-[#0e1626] p-4 shadow-xl">
          {error && (
            <div className="mb-3 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2 py-1 text-xs text-[#fbbf24]">
              {error}
            </div>
          )}

          <div className="mb-3 flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: roleColor }}
            >
              {getInitials(display.name) || "?"}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-[#e7ebf3]">{display.name}</div>
              <div className="truncate text-xs text-[#7c88a3]">{display.email}</div>
            </div>
          </div>

          <div className="divide-y divide-[#1c2740] border-t border-[#1c2740] pt-3">
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-[#7c88a3]">Rôle</span>
              <span
                className="rounded px-2 py-0.5 text-xs font-medium text-white"
                style={{ background: roleColor }}
              >
                {display.role}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-[#7c88a3]">Fonction</span>
              <span className="text-[#e7ebf3]">{ROLE_LABEL[display.role]}</span>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-md border border-[#1c2740] bg-[#111a2b] px-3 py-2 text-sm font-medium text-[#f87171] transition hover:border-[#f87171]/40 hover:bg-[#1b2333]"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}