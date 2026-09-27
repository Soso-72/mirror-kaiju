'use client';

import React, { useCallback, useEffect, useState } from "react";
import { getUserProfile } from "../utils/user";
import { updateRetentionThreshold } from "../utils/retention";

interface RetentionControlProps {
  districtId?: number;
  currentAlertLevel?: number; // Niveau d'alerte de la crise (ex: 1 à 5)
  onThresholdChanged?: (newThreshold: number) => void;
}

export function RetentionControl({
  districtId,
  currentAlertLevel = 5,
  onThresholdChanged,
}: RetentionControlProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDistrictId, setUserDistrictId] = useState<number | null>(null);
  const [threshold, setThreshold] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Charger le profil de l'utilisateur pour vérifier son rôle et son quartier
  const loadProfile = useCallback(async () => {
    try {
      const profileData = await getUserProfile();
      const profile = profileData?.response ?? profileData;
      setUserRole(profile?.role ?? null);

      // Si le districtId n'est pas passé en prop, utiliser celui du profil CD
      const defaultDistrict = profile?.districtId ?? profile?.district?.id ?? 9;
      setUserDistrictId(defaultDistrict);
    } catch (err) {
      console.error("Erreur lors de la vérification du profil CD :", err);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Si l'utilisateur n'est pas CD, on n'affiche absolument rien sous la carte
  if (userRole !== "CD") {
    return null;
  }

  const targetDistrictId = districtId ?? userDistrictId ?? 9;
  const isLevel5 = currentAlertLevel >= 5;

  const handleThresholdChange = async (newThreshold: number) => {
    setMessage(null);
    setLoading(true);

    try {
      await updateRetentionThreshold({
        districtId: targetDistrictId,
        alertLevel: currentAlertLevel,
        retentionThreshold: newThreshold,
      });

      setThreshold(newThreshold);
      setMessage({
        text: `Niveau de rétention fixé à ${newThreshold}% avec succès.`,
        isError: false,
      });

      if (onThresholdChanged) {
        onThresholdChanged(newThreshold);
      }
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.message || err?.message || "Erreur lors du changement de seuil.",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full rounded-md border border-[#1c2740] bg-[#0b1220] p-4 text-[#e7ebf3] shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-[#2563eb]/20 px-2 py-1 text-xs font-semibold text-[#60a5fa]">
            Espace CD
          </span>
          <div>
            <h4 className="text-sm font-medium text-[#e7ebf3]">
              Ajustement du Seuil de Rétention
            </h4>
            <p className="text-xs text-[#7c88a3]">
              Définissez la marge de réserve requise en stock pour ce quartier.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#7c88a3]">Seuil :</span>
          <div className="inline-flex rounded-md border border-[#1c2740] bg-[#0e1626] p-1">
            {/* Bouton 30% */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleThresholdChange(30)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                threshold === 30
                  ? "bg-[#2563eb] text-white"
                  : "text-[#7c88a3] hover:text-[#e7ebf3]"
              }`}
            >
              30% (Standard)
            </button>

            {/* Bouton 15% (Conditionné au Niveau 5) */}
            <button
              type="button"
              disabled={loading || !isLevel5}
              onClick={() => handleThresholdChange(15)}
              title={!isLevel5 ? "Nécessite le niveau d'alerte 5" : ""}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                threshold === 15
                  ? "bg-[#dc2626] text-white"
                  : isLevel5
                  ? "text-[#7c88a3] hover:text-[#e7ebf3]"
                  : "cursor-not-allowed text-[#7c88a3] opacity-30"
              }`}
            >
              15% (Niveau 5)
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mt-3 rounded p-2 text-xs ${
            message.isError
              ? "border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]"
              : "border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#4ade80]"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}