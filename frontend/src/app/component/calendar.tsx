// calendar.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CardDate, TransitInfo } from './cardDate';
import { getSocket } from '../utils/socket';

export function Calendar() {
  const [transits, setTransits] = useState<TransitInfo[]>([]);

  // Masquer / Supprimer les transferts une fois terminés
  const handleFinish = useCallback((id: string | number) => {
    setTransits((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Chargement initial depuis l'API backend
  useEffect(() => {
    const fetchTransits = async () => {
      try {
        const res = await fetch('/api/transfers/active');
        if (!res.ok) return;
        const data = await res.json();
        const list: TransitInfo[] = Array.isArray(data.response) ? data.response : data;
        
        // Filtre directement les transferts déjà expirés
        const now = new Date().getTime();
        const active = list.filter((t) => new Date(t.endTime).getTime() > now);
        setTransits(active);
      } catch (err) {
        console.error("Erreur lors de la récupération des transferts :", err);
      }
    };

    fetchTransits();
  }, []);

  // Écoute WebSocket + Événements personnalisés localement (CustomEvents)
  useEffect(() => {
    const socket = getSocket();

    const handleNewTransit = (newTransit: TransitInfo) => {
      const now = new Date().getTime();
      if (new Date(newTransit.endTime).getTime() > now) {
        setTransits((prev) => {
          if (prev.some((t) => t.id === newTransit.id)) return prev;
          return [newTransit, ...prev];
        });
      }
    };

    if (socket) {
      if (!socket.connected) socket.connect();
      socket.on('transfer_created', handleNewTransit);
    }

    // Gestion de l'événement système dispatché en interne
    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent<TransitInfo>).detail;
      if (detail) handleNewTransit(detail);
    };

    window.addEventListener('transfer:created', handleCustomEvent as EventListener);

    return () => {
      if (socket) {
        socket.off('transfer_created', handleNewTransit);
      }
      window.removeEventListener('transfer:created', handleCustomEvent as EventListener);
    };
  }, []);

  return (
    <div className="w-full space-y-4 p-4">
      <h3 className="text-lg font-semibold text-slate-100">Suivi des Trajets de Transfert</h3>
      
      {transits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#1c2740] p-6 text-center text-sm text-[#7c88a3]">
          Aucun transfert en cours.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {transits.map((transit) => (
            <CardDate
              key={transit.id}
              transit={transit}
              onFinish={handleFinish}
            />
          ))}
        </div>
      )}
    </div>
  );
}