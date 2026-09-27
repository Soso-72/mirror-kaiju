'use client';

import React, { useEffect, useState, useCallback } from "react";
import { ConnectedTransferCard, Transfer, TransferStatus } from "./transactionCard";
import { getAllTransfers } from "../utils/transfert";
import { getSocket } from "../utils/socket";

export function TransferFeed() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TransferStatus | "all">("all");
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // 1. Chargement initial des données via Axios
  const fetchTransfers = useCallback(async (statusFilter?: TransferStatus | "all") => {
    try {
      setLoading(true);
      setError(null);

      const statusParam = statusFilter && statusFilter !== "all" ? statusFilter : undefined;
      const res = await getAllTransfers(statusParam);
      
      const dataList: Transfer[] = res.response ?? res;
      setTransfers(Array.isArray(dataList) ? dataList : []);
    } catch (err: any) {
      console.error("Erreur chargement des transferts:", err);
      setError(
        err?.response?.data?.message ||
        "Impossible de charger le flux des demandes de transfert."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers(selectedStatus);
  }, [selectedStatus, fetchTransfers]);

  // 2. Écoute des événements WebSocket en temps réel
  useEffect(() => {
    // Récupérer le socket (initialisé seulement s'il y a un token)
    const socket = getSocket();

    if (!socket) {
      console.warn("TransferFeed : Connexion WebSocket non établie (token manquant).");
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    // Événement : Nouveau transfert créé
    const onTransferCreated = (newTransfer: Transfer) => {
      setTransfers((prev) => {
        // Ajouter le transfert au début du flux si son statut correspond au filtre actuel
        if (selectedStatus === "all" || newTransfer.status === selectedStatus) {
          return [newTransfer, ...prev];
        }
        return prev;
      });
    };

    // Événement : Statut d'un transfert mis à jour (approuvé / rejeté)
    const onTransferUpdated = (updatedTransfer: Transfer) => {
      setTransfers((prev) =>
        prev
          .map((t) => (t.id === updatedTransfer.id ? updatedTransfer : t))
          .filter((t) => selectedStatus === "all" || t.status === selectedStatus)
      );
    };

    // Attacher les écouteurs d'événements
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("transfer_created", onTransferCreated);
    socket.on("transfer_updated", onTransferUpdated);

    // Nettoyage des écouteurs au démontage
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("transfer_created", onTransferCreated);
      socket.off("transfer_updated", onTransferUpdated);
    };
  }, [selectedStatus]);

  return (
    <div className="mt-8 w-full rounded-md shadow-xl/30 bg-[#0b1220] p-6 text-[#e7ebf3]">
      <h1 className="flex text-2xl font-bold text-white">Transaction Page</h1>
      {/* En-tête du flux & Filtres avec indicateur temps réel */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#1c2740] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Demandes de transfert entre districts</h2>
            
            {/* Badge de statut de la connexion temps réel */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              {isConnected ? "Temps réel actif" : "Connexion en cours..."}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[#7c88a3]">
            Historique et suivi en temps réel de tous les mouvements de ressources
          </p>
        </div>

        {/* Boutons de filtrage par statut */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "Tous" },
          ].map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id as TransferStatus | "all")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-[#1c2740] text-[#60a5fa] ring-1 ring-[#60a5fa]"
                    : "bg-[#0e1626] text-[#7c88a3] hover:bg-[#152035] hover:text-[#e7ebf3]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Affichage des états : Chargement / Erreur / Liste vide / Cartes */}
      {loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 w-full animate-pulse rounded-lg border border-[#1c2740] bg-[#0e1626]"
            />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-[#f87171]/30 bg-[#f87171]/10 p-4 text-center text-sm text-[#f87171]">
          {error}
        </div>
      )}

      {!loading && !error && transfers.length === 0 && (
        <div className="rounded-lg border border-[#1c2740] bg-[#0e1626] py-12 text-center text-sm text-[#7c88a3]">
          Aucune demande de transfert ne correspond aux critères sélectionnés.
        </div>
      )}

      {!loading && !error && transfers.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {transfers.map((transfer) => (
            <ConnectedTransferCard
              key={transfer.id}
              transferId={transfer.id}
              initialData={transfer}
            />
          ))}
        </div>
      )}
    </div>
  );
}