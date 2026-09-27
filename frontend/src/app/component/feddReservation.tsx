'use client';

import { useCallback, useEffect, useState } from "react";
import {
  getReservations,
  RESERVATIONS_CHANGED,
  type Reservation,
} from "../utils/reservation";

export function FeedReserve() {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const refresh = useCallback(async () => {
    try {
      setReservations(await getReservations());
    } catch {
      // On garde l'affichage actuel si le backend ne répond pas
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(RESERVATIONS_CHANGED, refresh);
    return () => window.removeEventListener(RESERVATIONS_CHANGED, refresh);
  }, [refresh]);

  // L'encadré n'apparaît qu'à partir de la première réservation
  if (reservations.length === 0) return null;

  const sorted = [...reservations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <section className="w-full rounded-lg border border-[#2e7d32] bg-[#2e7d32]/10 p-6 text-[#e7ebf3]">
      <h2 className="mb-3 text-base font-medium text-[#4ade80]">Ressources réservées</h2>
      <ul className="divide-y divide-[#1c2740]">
        {sorted.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {r.quantity} × {r.resourceName}
              <span className="ml-2 text-xs text-[#7c88a3]">
                {r.districtName ?? r.districtCode}
              </span>
            </span>
            <span className="text-xs text-[#7c88a3]">
              {new Date(r.createdAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}