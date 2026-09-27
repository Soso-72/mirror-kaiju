'use client';

import React, { useCallback, useEffect, useState } from "react";
import { getResourceMap, getUserProfile } from "../utils/user";
import { reserveResource, unreserveResource } from "../utils/reserve";
import { getSocket } from "../utils/socket";

const DISTRICTS = [
  { code: "A", id: 9, name: "Apex" },
  { code: "E", id: 10, name: "Echo" },
  { code: "W", id: 11, name: "Warden" },
  { code: "X", id: 12, name: "Xeno" },
  { code: "Z", id: 13, name: "Zion" },
] as const;

export interface ActiveReservation {
  id: string;
  resourceId: number;
  resourceName: string;
  districtId: number;
  districtName: string;
  quantity: number;
}

interface RessourceReservationProps {
  onReservationsUpdate?: (updater: (prev: ActiveReservation[]) => ActiveReservation[]) => void;
}

interface ResourceItem {
  id: number;
  name: string;
  quantity: number;
  retentionMin: number;
}

export function RessourceReservation({ onReservationsUpdate }: RessourceReservationProps) {
  const [userDistrict, setUserDistrict] = useState<{ id: number; name: string; code: string } | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Récupération du profil utilisateur et du mapping des ressources
      const [profileData, resourceMapData] = await Promise.all([
        getUserProfile(),
        getResourceMap(),
      ]);

      const userRaw = profileData?.response ?? profileData;
      
      // Récupération de l'ID ou Code du quartier de l'utilisateur
      const userDistrictId = userRaw?.districtId ?? userRaw?.district?.id;
      const userDistrictCode = userRaw?.districtCode ?? userRaw?.district?.code ?? userRaw?.district;

      // Correspondance avec notre liste de quartiers
      const matchedDistrict = DISTRICTS.find(
        (d) => d.id === userDistrictId || d.code === userDistrictCode
      ) || { id: userDistrictId ?? 9, name: userRaw?.districtName ?? "Votre Quartier", code: userDistrictCode ?? "A" };

      setUserDistrict(matchedDistrict);

      // 2. Extraction des ressources de ce quartier uniquement
      const mappedDistricts = resourceMapData?.response ?? resourceMapData ?? [];
      const districtData = mappedDistricts.find(
        (item: any) => item.id === matchedDistrict.id || item.code === matchedDistrict.code
      );

      const districtResources: ResourceItem[] = (districtData?.resources ?? []).map((r: any) => ({
        id: Number(r.id ?? r.resourceTypeId),
        name: r.name ?? r.resourceType?.name ?? "Ressource",
        quantity: Number(r.quantity) || 0,
        retentionMin: Number(r.retentionMin ?? r.retentionThreshold) || 0,
      }));

      setResources(districtResources);
      setError(null);
    } catch (err: any) {
      setError("Impossible de récupérer les données du quartier ou des ressources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (!socket) return;
    if (!socket.connected) socket.connect();

    const handleUpdate = () => loadData();
    socket.on("resources:updated", handleUpdate);
    socket.on("reservation:created", handleUpdate);
    socket.on("reservation:removed", handleUpdate);

    return () => {
      socket.off("resources:updated", handleUpdate);
      socket.off("reservation:created", handleUpdate);
      socket.off("reservation:removed", handleUpdate);
    };
  }, [loadData]);

  const handleReserve = async (resource: ResourceItem) => {
    if (!userDistrict) return;
    setError(null);
    setSuccess(null);

    const quantity = selectedQuantities[resource.id] ?? 1;
    const actionKey = `reserve-${resource.id}`;

    setPendingAction(actionKey);
    try {
      await reserveResource({
        districtId: userDistrict.id,
        resourceTypeId: resource.id,
        quantity,
      });

      setSuccess(`Réservation effectuée : ${quantity}x ${resource.name}`);

      if (onReservationsUpdate) {
        const itemKey = `${userDistrict.id}-${resource.id}`;
        onReservationsUpdate((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === itemKey);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex].quantity += quantity;
            return updated;
          }
          return [
            ...prev,
            {
              id: itemKey,
              resourceId: resource.id,
              resourceName: resource.name,
              districtId: userDistrict.id,
              districtName: userDistrict.name,
              quantity,
            },
          ];
        });
      }

      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "La réservation a échoué.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleUnreserve = async (resource: ResourceItem) => {
    if (!userDistrict) return;
    setError(null);
    setSuccess(null);

    const quantity = selectedQuantities[resource.id] ?? 1;
    const actionKey = `unreserve-${resource.id}`;

    setPendingAction(actionKey);
    try {
      await unreserveResource({
        districtId: userDistrict.id,
        resourceTypeId: resource.id,
        quantity,
      });

      setSuccess(`Déréservation effectuée : ${quantity}x ${resource.name}`);

      if (onReservationsUpdate) {
        const itemKey = `${userDistrict.id}-${resource.id}`;
        onReservationsUpdate((prev) => {
          return prev
            .map((item) => {
              if (item.id === itemKey) {
                const newQty = item.quantity - quantity;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
              }
              return item;
            })
            .filter(Boolean) as ActiveReservation[];
        });
      }

      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "La déréservation a échoué.");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="w-full rounded-md bg-[#0b1220] p-6 text-[#e7ebf3] shadow-xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#1c2740] pb-4">
        <div>
          <h2 className="text-lg font-medium">Réservation de ressources</h2>
          <p className="mt-0.5 text-sm text-[#7c88a3]">
            Gérez la réservation des ressources pour votre quartier affecté.
          </p>
        </div>

        {/* Quartier fixé automatiquement selon le profil utilisateur */}
        {userDistrict && (
          <div className="flex items-center gap-2 rounded-md border border-[#1c2740] bg-[#0e1626] px-3 py-1.5 text-xs">
            <span className="text-[#7c88a3]">Votre Quartier :</span>
            <span className="font-semibold text-[#60a5fa]">
              {userDistrict.name} ({userDistrict.code})
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-xs text-[#fbbf24]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-2 text-xs text-[#4ade80]">
          {success}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-[#7c88a3]">Chargement des ressources du quartier…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-[#7c88a3]">
              <tr className="border-b border-[#1c2740]">
                <th className="py-2.5 pr-4 font-medium">Ressource</th>
                <th className="py-2.5 pr-4 font-medium">Stock disponible</th>
                <th className="py-2.5 pr-4 font-medium">Seuil min.</th>
                <th className="py-2.5 pr-4 font-medium">Quantité</th>
                <th className="py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2740]">
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[#7c88a3]">
                    Aucune ressource disponible pour le quartier {userDistrict?.name}.
                  </td>
                </tr>
              ) : (
                resources.map((resource) => {
                  const qty = selectedQuantities[resource.id] ?? 1;
                  const isReserving = pendingAction === `reserve-${resource.id}`;
                  const isUnreserving = pendingAction === `unreserve-${resource.id}`;
                  const isBusy = pendingAction !== null;

                  return (
                    <tr key={resource.id} className="hover:bg-[#0e1626]/50">
                      <td className="py-3 pr-4 font-medium text-[#e7ebf3]">{resource.name}</td>
                      <td className="py-3 pr-4 font-semibold text-[#4ade80]">{resource.quantity}</td>
                      <td className="py-3 pr-4 text-[#7c88a3]">{resource.retentionMin}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={qty}
                          disabled={isBusy}
                          onChange={(e) =>
                            setSelectedQuantities((prev) => ({
                              ...prev,
                              [resource.id]: Number(e.target.value),
                            }))
                          }
                          className="rounded-md border border-[#1c2740] bg-[#0e1626] px-2.5 py-1 text-xs text-[#e7ebf3] focus:border-[#2563eb] focus:outline-none disabled:opacity-40"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} {n > 1 ? "unités" : "unité"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReserve(resource)}
                            disabled={isBusy}
                            className="rounded-md bg-[#2563eb] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isReserving ? "Réservation…" : "Réserver"}
                          </button>
                          <button
                            onClick={() => handleUnreserve(resource)}
                            disabled={isBusy}
                            className="rounded-md bg-[#dc2626] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isUnreserving ? "Déréservation…" : "Déréserver"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}