'use client';

import React, { useCallback, useEffect, useState } from "react";
import { getAllTransfers } from "../utils/transfert";
import { getSocket } from "../utils/socket";
import { getStoredToken, getUserProfile } from "../utils/user";
import { AcceptTransferButton } from "./acceptTransfer";
import { RefuseTransferButton } from "./refuseTransfer";
import { Transfer } from "./transactionCard";

const ALLOWED_ROLES = ["LC", "QC"];

const BG = "#0e1626";
const PANEL_BG = "#0b1220";
const BORDER = "#1c2740";
const TEXT = "#e7ebf3";
const MUTED = "#7c88a3";
const ACCENT = "#60a5fa";

export function SideTransaction() {
  const [role, setRole] = useState<string | null>(null);
  const [myDistrict, setMyDistrict] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Détection du quartier de l'utilisateur
  const extractDistrict = (data: any): string => {
    // 1. Essai depuis les propriétés directes
    if (data.districtName) return String(data.districtName);
    if (data.district?.name) return String(data.district.name);
    if (typeof data.district === "string") return data.district;

    // 2. Fallback depuis l'email (ex: qc.warden@tokyork.gov -> warden)
    if (data.email) {
      const prefix = data.email.split("@")[0];
      const parts = prefix.split(".");
      return parts.length > 1 ? parts[1] : parts[0];
    }

    return "";
  };

  const isOnlyRecipient = useCallback((t: Transfer, userDist: string | null) => {
    if (!userDist) return false;

    const currentDist = userDist.toLowerCase().trim();

    const destName = (
      t.destinationDistrict?.name ||
      t.destinationDistrictName ||
      ""
    ).toLowerCase().trim();

    const sourceName = (
      t.sourceDistrict?.name ||
      t.sourceDistrictName ||
      ""
    ).toLowerCase().trim();

    // Je ne dois PAS être l'expéditeur
    if (sourceName && sourceName.includes(currentDist)) return false;

    // Je dois être le destinataire
    return destName.includes(currentDist);
  }, []);

  useEffect(() => {
    const initData = async () => {
      const token = getStoredToken();
      if (!token) {
        setRoleChecked(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const profile = await getUserProfile(token);
        const data = profile.response ?? profile;

        const currentRole = data.role ?? null;
        const detectedDistrict = extractDistrict(data);

        console.log("🟢 [SideTransaction] Utilisateur connecté :", data.email);
        console.log("🟢 [SideTransaction] Quartier identifié :", detectedDistrict);

        setRole(currentRole);
        setMyDistrict(detectedDistrict);
        setRoleChecked(true);

        if (currentRole && ALLOWED_ROLES.includes(currentRole)) {
          const res = await getAllTransfers("pending");
          const list: Transfer[] = res.response ?? res;

          if (Array.isArray(list)) {
            const filtered = list.filter((t) => isOnlyRecipient(t, detectedDistrict));
            console.log("🎯 [SideTransaction] Demandes reçues filtrées :", filtered);
            setTransfers(filtered);
          }
        }
      } catch (err) {
        console.error("Erreur SideTransaction:", err);
        setError("Impossible de charger les demandes.");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [isOnlyRecipient]);

  // WebSockets en temps réel
  useEffect(() => {
    if (!role || !ALLOWED_ROLES.includes(role) || !myDistrict) return;

    const socket = getSocket();
    if (!socket) return;

    if (!socket.connected) socket.connect();

    const onCreated = (rawTransfer: any) => {
      const t: Transfer = rawTransfer?.response ?? rawTransfer?.data ?? rawTransfer;
      console.log("⚡ [WebSocket] Nouveau transfert reçu :", t);

      if (t && t.status === "pending" && isOnlyRecipient(t, myDistrict)) {
        setTransfers((prev) => (prev.some((item) => item.id === t.id) ? prev : [t, ...prev]));
      }
    };

    const onUpdated = (rawTransfer: any) => {
      const t: Transfer = rawTransfer?.response ?? rawTransfer?.data ?? rawTransfer;

      if (!t) return;

      setTransfers((prev) => {
        if (t.status !== "pending" || !isOnlyRecipient(t, myDistrict)) {
          return prev.filter((item) => item.id !== t.id);
        }
        return prev.map((item) => (item.id === t.id ? t : item));
      });
    };

    socket.on("transfer_created", onCreated);
    socket.on("transfer_updated", onUpdated);

    return () => {
      socket.off("transfer_created", onCreated);
      socket.off("transfer_updated", onUpdated);
    };
  }, [role, myDistrict, isOnlyRecipient]);

  const handleResolved = (id: number) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  };

  const isAllowed = role !== null && ALLOWED_ROLES.includes(role);
  if (!roleChecked || !isAllowed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-6 top-20 z-40 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium shadow-lg"
        style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
      >
        Demandes
        {transfers.length > 0 && (
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold animate-pulse"
            style={{ background: "#fbbf24", color: "#0b1220" }}
          >
            {transfers.length}
          </span>
        )}
      </button>

      <div
        className={[
          "fixed inset-0 z-50 transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        />

        <div
          className={[
            "absolute right-0 top-0 flex h-full w-full max-w-sm flex-col transition-transform duration-300 sm:max-w-md",
            open ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
          style={{ background: BG, borderLeft: `1px solid ${BORDER}`, color: TEXT }}
        >
          <div className="flex items-center justify-between border-b p-4" style={{ borderColor: BORDER }}>
            <div>
              <h2 className="text-base font-semibold">Demandes reçues</h2>
              <p className="text-xs" style={{ color: MUTED }}>En attente de votre validation</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-lg"
              style={{ color: MUTED }}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading && <div className="text-sm text-center py-4 text-[#7c88a3]">Chargement...</div>}

            {error && !loading && (
              <div className="rounded-md border p-3 text-sm border-[#f87171]/30 bg-[#f87171]/10 text-[#f87171]">
                {error}
              </div>
            )}

            {!loading && !error && transfers.length === 0 && (
              <div
                className="rounded-md border p-6 text-center text-sm"
                style={{ borderColor: BORDER, background: PANEL_BG, color: MUTED }}
              >
                Aucune demande en attente pour votre quartier ({myDistrict || "inconnu"}).
              </div>
            )}

            <div className="flex flex-col gap-3">
              {!loading &&
                transfers.map((t) => {
                  const resourceName = t.resourceType?.name || t.resourceTypeName || "Ressource";
                  const sourceName = t.sourceDistrict?.name || t.sourceDistrictName || "Source";
                  const destName = t.destinationDistrict?.name || t.destinationDistrictName || "Destination";

                  return (
                    <div
                      key={t.id}
                      className="rounded-lg p-3"
                      style={{ background: PANEL_BG, border: `1px solid ${BORDER}` }}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{resourceName}</span>
                      </div>
                      <div className="text-xs" style={{ color: MUTED }}>
                        {sourceName} → {destName}
                      </div>
                      <div className="mt-1 text-xs">
                        Quantité : <span className="font-semibold" style={{ color: ACCENT }}>{t.quantity} unités</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AcceptTransferButton
                          transferId={t.id}
                          onAccepted={() => handleResolved(t.id)}
                        />
                        <RefuseTransferButton
                          transferId={t.id}
                          onRefused={() => handleResolved(t.id)}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SideTransaction;