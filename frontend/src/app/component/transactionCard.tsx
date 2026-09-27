'use client';

import React, { useEffect, useState, useCallback } from "react";
import { getAllTransfers } from "../utils/transfert";
import { getStoredToken, getUserProfile } from "../utils/user";
import { AcceptTransferButton } from "./acceptTransfer";
import { RefuseTransferButton } from "./refuseTransfer";

// --- Typages ---
export type TransferStatus = "pending" | "approved" | "rejected" | "completed";

export interface District {
  id: number;
  name: string;
}

export interface ResourceType {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
}

export interface Transfer {
  id: number;
  quantity: number;
  status: TransferStatus;
  rejectionReason?: string | null;
  requestedAt: string;
  updatedAt?: string;

  resourceType?: ResourceType;
  resourceTypeName?: string;

  sourceDistrict?: District;
  sourceDistrictName?: string;
  sourceDistrictId?: number;

  destinationDistrict?: District;
  destinationDistrictName?: string;
  destinationDistrictId?: number;

  requestedBy?: User;
  requestedByEmail?: string;
}

interface TransferCardProps {
  transferId?: number;
  initialData?: Transfer;
  onStatusChange?: (updatedTransfer: Transfer) => void;
}

const STATUS_CONFIG: Record<
  TransferStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pending: {
    label: "En attente",
    color: "#fbbf24",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  approved: {
    label: "Approuvé",
    color: "#4ade80",
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.3)",
  },
  completed: {
    label: "Terminé",
    color: "#60a5fa",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.3)",
  },
  rejected: {
    label: "Rejeté",
    color: "#f87171",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.3)",
  },
};

export function ConnectedTransferCard({
  transferId,
  initialData,
  onStatusChange,
}: TransferCardProps) {
  const [transfer, setTransfer] = useState<Transfer | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData && !!transferId);
  const [error, setError] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState<number | string | null>(null);

  // 1. Récupération flexible du quartier de l'utilisateur connecté
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;

    getUserProfile(token)
      .then((profile) => {
        const data = profile.response ?? profile;
        const myDistrict =
          data.districtId ??
          data.district?.id ??
          data.district?.name ??
          data.district ??
          null;
        setUserDistrict(myDistrict);
      })
      .catch((err) => console.error("Erreur profil utilisateur:", err));
  }, []);

  useEffect(() => {
    if (initialData) {
      setTransfer(initialData);
    }
  }, [initialData]);

  const fetchTransferData = useCallback(async () => {
    if (!transferId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await getAllTransfers();
      const transfersList: Transfer[] = res.response ?? res;

      const found = transfersList.find((t) => t.id === transferId);
      if (!found) {
        throw new Error(`Transfert #${transferId} introuvable.`);
      }

      setTransfer(found);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    if (!initialData && transferId) {
      fetchTransferData();
    }
  }, [transferId, initialData, fetchTransferData]);

  if (loading) {
    return (
      <div className="w-full rounded-lg border border-[#1c2740] bg-[#0e1626] p-6 text-[#7c88a3] animate-pulse">
        Chargement des informations du transfert #{transferId}…
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="w-full rounded-lg border border-[#f87171]/30 bg-[#f87171]/10 p-4 text-sm text-[#f87171]">
        {error || "Transfert introuvable."}
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[transfer.status] ?? STATUS_CONFIG.pending;

  const resourceName =
    transfer.resourceType?.name ||
    transfer.resourceTypeName ||
    "Ressource inconnue";

  const sourceName =
    transfer.sourceDistrict?.name ||
    transfer.sourceDistrictName ||
    (transfer.sourceDistrictId ? `District #${transfer.sourceDistrictId}` : "District inconnu");

  const destinationName =
    transfer.destinationDistrict?.name ||
    transfer.destinationDistrictName ||
    (transfer.destinationDistrictId ? `District #${transfer.destinationDistrictId}` : "District inconnu");

  const requesterEmail =
    transfer.requestedBy?.email ||
    transfer.requestedByEmail ||
    "Utilisateur inconnu";

  const requesterRole = transfer.requestedBy?.role ? `(${transfer.requestedBy.role})` : "";

  // 2. Détermination dynamique Destinataire vs Expéditeur
  const myDistStr = userDistrict ? String(userDistrict).trim().toLowerCase() : null;

  const destId = transfer.destinationDistrictId ?? transfer.destinationDistrict?.id;
  const destName = transfer.destinationDistrict?.name ?? transfer.destinationDistrictName;

  const sourceId = transfer.sourceDistrictId ?? transfer.sourceDistrict?.id;
  const sourceNameVal = transfer.sourceDistrict?.name ?? transfer.sourceDistrictName;

  // Est-ce que JE suis le destinataire ?
  const isRecipient =
    !!myDistStr &&
    ((destId !== undefined && destId !== null && String(destId).trim().toLowerCase() === myDistStr) ||
      (destName && String(destName).trim().toLowerCase() === myDistStr));

  // Est-ce que JE suis l'expéditeur ?
  const isSource =
    !!myDistStr &&
    ((sourceId !== undefined && sourceId !== null && String(sourceId).trim().toLowerCase() === myDistStr) ||
      (sourceNameVal && String(sourceNameVal).trim().toLowerCase() === myDistStr));

  const handleResolved = (newStatus: TransferStatus) => {
    const updated = { ...transfer, status: newStatus };
    setTransfer(updated);
    if (onStatusChange) onStatusChange(updated);
  };

  return (
    <div className="w-full rounded-lg border border-[#1c2740] bg-[#0e1626] p-6 text-[#e7ebf3] shadow-lg">
      {/* En-tête : Titre & Badge de statut */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1c2740] pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#7c88a3]">
            Transfert #{transfer.id}
          </span>
          <h3 className="text-lg font-medium text-[#e7ebf3]">
            {resourceName}
          </h3>
        </div>

        <div
          className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: statusInfo.bg,
            color: statusInfo.color,
            border: `1px solid ${statusInfo.border}`,
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: statusInfo.color }}
          />
          {statusInfo.label}
        </div>
      </div>

      {/* Origine / Destination & Quantité */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-[#1c2740] bg-[#0b1220] p-3">
          <div className="text-xs text-[#7c88a3]">Source</div>
          <div className="text-sm font-medium text-[#e7ebf3]">
            {sourceName}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-md border border-[#1c2740] bg-[#0b1220] p-3">
          <div className="text-xs text-[#7c88a3]">Quantité transférée</div>
          <div className="text-base font-bold text-[#60a5fa]">
            {transfer.quantity} <span className="text-xs font-normal">unités</span>
          </div>
        </div>

        <div className="rounded-md border border-[#1c2740] bg-[#0b1220] p-3">
          <div className="text-xs text-[#7c88a3]">Destination</div>
          <div className="text-sm font-medium text-[#e7ebf3]">
            {destinationName}
          </div>
        </div>
      </div>

      {/* Informations de suivi */}
      <div className="space-y-2 border-t border-[#1c2740] pt-4 text-xs text-[#7c88a3]">
        <div className="flex justify-between">
          <span>Demandé par :</span>
          <span className="font-medium text-[#e7ebf3]">
            {requesterEmail} {requesterRole}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Date de la demande :</span>
          <span className="text-[#e7ebf3]">
            {transfer.requestedAt
              ? new Date(transfer.requestedAt).toLocaleString("fr-FR")
              : "Date inconnue"}
          </span>
        </div>

        {transfer.rejectionReason && (
          <div className="mt-3 rounded border border-[#f87171]/30 bg-[#f87171]/10 p-2.5 text-[#f87171]">
            <span className="font-semibold">Raison du rejet : </span>
            {transfer.rejectionReason}
          </div>
        )}
      </div>

      {/* 3. Les boutons d'acceptation/refus n'apparaissent QUE si la demande est 'pending' ET que l'utilisateur est le DESTINATAIRE (et pas l'expéditeur) */}
      {transfer.status === "pending" && isRecipient && !isSource && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#1c2740] pt-4">
          <AcceptTransferButton
            transferId={transfer.id}
            onAccepted={() => handleResolved("approved")}
          />
          <RefuseTransferButton
            transferId={transfer.id}
            onRefused={() => handleResolved("rejected")}
          />
        </div>
      )}
    </div>
  );
}