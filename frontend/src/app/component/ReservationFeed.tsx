'use client';

import React from "react";
import { ActiveReservation } from "./ressourceReservation";

interface ReservationFeedProps {
  items: ActiveReservation[];
}

export function ReservationFeed({ items }: ReservationFeedProps) {
  return (
    <div className="w-full rounded-md border border-[#1c2740] bg-[#0b1220] p-6 text-[#e7ebf3] shadow-xl">
      <div className="mb-4 flex items-center justify-between border-b border-[#1c2740] pb-3">
        <h3 className="text-base font-medium">Mes Réservations Actives</h3>
        <span className="rounded-full bg-[#2563eb]/20 px-2.5 py-0.5 text-xs text-[#60a5fa]">
          {items.length} {items.length > 1 ? "réservations" : "réservation"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#7c88a3]">
          Vous n'avez aucune réservation active. Cliquez sur "Réserver" pour en ajouter une.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border border-[#1c2740] bg-[#0e1626] p-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="inline-block h-2 w-2 rounded-full bg-[#3b82f6]" />
                <div>
                  <span className="font-semibold text-[#e7ebf3]">{item.resourceName}</span>
                  <span className="ml-2 text-[#7c88a3]">({item.districtName})</span>
                </div>
              </div>
              <div className="font-medium text-[#60a5fa]">
                {item.quantity} unité{item.quantity > 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}