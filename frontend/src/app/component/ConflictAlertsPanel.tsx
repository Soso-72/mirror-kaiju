'use client';
import React, { useEffect, useState } from "react";
import { getSocket } from "../utils/socket";

interface ConflictEvent {
  districtId: number;
  resourceTypeId: number;
  message: string;
  conflictingTransferIds: number[];
  receivedAt: string;
}

export function ConflictAlertsPanel() {
  const [events, setEvents] = useState<ConflictEvent[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.connect();

    const handleConflict = (payload: Omit<ConflictEvent, "receivedAt">) => {
      setEvents((prev) =>
        [{ ...payload, receivedAt: new Date().toLocaleTimeString("fr-FR") }, ...prev].slice(0, 10)
      );
    };

    socket.on("conflict:detected", handleConflict);

    return () => {
      socket.off("conflict:detected", handleConflict);
    };
  }, []);

  return (
    <div className="rounded-lg border border-[#1c2740] bg-[#0e1626] p-5 text-[#e7ebf3]">
      <h3 className="mb-3 text-sm font-medium">Conflits détectés</h3>

      {events.length === 0 && (
        <p className="text-xs text-[#7c88a3]">Aucun conflit signalé pour l'instant.</p>
      )}

      <ul className="space-y-2">
        {events.map((e, i) => (
          <li
            key={i}
            className="rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-xs text-[#fbbf24]"
          >
            <div className="mb-1 flex justify-between text-[10px] text-[#fbbf24]/70">
              <span>{e.receivedAt}</span>
              <span>Quartier #{e.districtId} · Ressource #{e.resourceTypeId}</span>
            </div>
            <div>{e.message}</div>
            <div className="mt-1 text-[10px] opacity-70">
              Transferts concernés : {e.conflictingTransferIds.join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}