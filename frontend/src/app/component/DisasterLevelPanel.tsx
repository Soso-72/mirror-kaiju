'use client';

import React, { useEffect, useState } from "react";
import { getSocket } from "../utils/socket";

interface LevelEvent {
  id: string;
  level: number;
  isRetentionOverrideActive: boolean;
  receivedAt: string;
}

const LEVEL_THEME: Record<number, { bg: string; border: string; text: string; icon: string }> = {
  1: { bg: "bg-emerald-950/80", border: "border-emerald-500", text: "text-emerald-200", icon: "🟢" },
  2: { bg: "bg-lime-950/80", border: "border-lime-500", text: "text-lime-200", icon: "🟡" },
  3: { bg: "bg-amber-950/80", border: "border-amber-500", text: "text-amber-200", icon: "🟠" },
  4: { bg: "bg-orange-950/80", border: "border-orange-500", text: "text-orange-200", icon: "🚨" },
  5: { bg: "bg-red-950/80", border: "border-red-600", text: "text-red-200", icon: "☣️" },
};

export function DisasterLevelAlerts() {
  const [alerts, setAlerts] = useState<LevelEvent[]>([]);

  useEffect(() => {
    const socket = getSocket();

    const handleLevelChanged = (payload: { level: number; isRetentionOverrideActive: boolean }) => {
      const alertId = `${Date.now()}-${Math.random()}`;
      const newAlert: LevelEvent = {
        id: alertId,
        ...payload,
        receivedAt: new Date().toLocaleTimeString("fr-FR"),
      };

      // Ajoute la nouvelle alerte en haut
      setAlerts((prev) => [newAlert, ...prev]);

      // Suppression automatique après 5 secondes
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }, 5000);
    };

    socket.on("disasterLevel:changed", handleLevelChanged);

    return () => {
      socket.off("disasterLevel:changed", handleLevelChanged);
    };
  }, []);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <aside className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => {
        const theme = LEVEL_THEME[alert.level] || LEVEL_THEME[1];

        return (
          <div
            key={alert.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 ${theme.border} ${theme.bg} p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in`}
          >
            <span className="text-xl">{theme.icon}</span>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-semibold ${theme.text}`}>
                  Alerte Catastrophe : Niveau {alert.level}
                </h4>
                <span className="text-[10px] opacity-60 text-slate-300">{alert.receivedAt}</span>
              </div>

              <p className="mt-1 text-xs text-slate-300">
                {alert.isRetentionOverrideActive
                  ? "Seuil de rétention abaissement actif (15%)."
                  : "Le niveau de menace globale a été mis à jour."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeAlert(alert.id)}
              className="text-slate-400 hover:text-white transition text-sm font-bold leading-none px-1"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        );
      })}
    </aside>
  );
}