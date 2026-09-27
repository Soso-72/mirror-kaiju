'use client';

import React, { useEffect, useState } from "react";
import { getSocket } from "../utils/socket";

interface StockEvent {
  id: string;
  districtId: number;
  resourceTypeId: number;
  quantity: number;
  receivedAt: string;
}

export function StockUpdatesAlerts() {
  const [alerts, setAlerts] = useState<StockEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.connect();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleStockUpdated = (payload: { districtId: number; resourceTypeId: number; quantity: number }) => {
      const alertId = `${Date.now()}-${Math.random()}`;
      const newAlert: StockEvent = {
        id: alertId,
        ...payload,
        receivedAt: new Date().toLocaleTimeString("fr-FR"),
      };

      setAlerts((prev) => [newAlert, ...prev]);

      // Masquer l'alerte automatiquement après 4 secondes
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }, 4000);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("stock:updated", handleStockUpdated);

    setConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("stock:updated", handleStockUpdated);
    };
  }, []);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <aside className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {/* Badge statut WebSocket discret si déconnecté */}
      {!connected && (
        <div className="pointer-events-auto self-end flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/80 px-3 py-1 text-[11px] font-medium text-red-300 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          WebSocket Déconnecté
        </div>
      )}

      {/* Liste des Toast Alerts */}
      {alerts.map((alert) => {
        const isPositive = alert.quantity >= 0;
        const theme = isPositive
          ? {
              bg: "bg-cyan-950/85",
              border: "border-cyan-500",
              text: "text-cyan-200",
              badgeBg: "bg-cyan-500/20 text-cyan-300",
              icon: "📦",
            }
          : {
              bg: "bg-amber-950/85",
              border: "border-amber-500",
              text: "text-amber-200",
              badgeBg: "bg-amber-500/20 text-amber-300",
              icon: "📉",
            };

        return (
          <div
            key={alert.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border-l-4 ${theme.border} ${theme.bg} p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in`}
          >
            <span className="text-xl">{theme.icon}</span>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`text-sm font-semibold ${theme.text}`}>
                  Mise à jour de stock
                </h4>
                <span className="text-[10px] text-slate-400">{alert.receivedAt}</span>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-200">
                <span>
                  Quartier <strong>#{alert.districtId}</strong> · Ressource <strong>#{alert.resourceTypeId}</strong>
                </span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${theme.badgeBg}`}>
                  {isPositive ? `+${alert.quantity}` : alert.quantity}
                </span>
              </div>
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