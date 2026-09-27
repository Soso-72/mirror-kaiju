'use client';

import { useEffect, useState } from "react";
import { getDisasterLevel, updateDisasterLevel } from "../utils/disaster";

interface SeuilRetentionProps {
  /** True si l'utilisateur connecté a le rôle CD. À fournir par le parent (session/auth). */
  isCD: boolean;
}

export function SeuilRetention({ isCD }: SeuilRetentionProps) {
  const [level, setLevel] = useState(1);
  const [isRetentionOverrideActive, setIsRetentionOverrideActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const currentLevel = await getDisasterLevel();
        if (active) {
          setLevel(currentLevel);
        }
      } catch {
        // garde les valeurs par défaut si la récupération échoue
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Le composant n'existe (visuellement) qu'au niveau 5, et l'action est réservée au CD
  if (level !== 5 || !isCD) return null;

  const handleToggle = async () => {
    if (updating || loading) return;
    const next = !isRetentionOverrideActive;

    setUpdating(true);
    setError(null);

    // Utilisation de updateDisasterLevel tout en conservant le niveau 5
    const result = await updateDisasterLevel(5);
    if (result.success) {
      setIsRetentionOverrideActive(next);
    } else {
      setError(result.message || "Impossible de mettre à jour le seuil de rétention");
    }

    setUpdating(false);
  };

  const percent = isRetentionOverrideActive ? 15 : 30;

  return (
    <div className="rounded-lg border border-[#1c2740] bg-[#0e1626] p-6 text-[#e7ebf3]">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-[#8b0000]" />
        <h3 className="text-base font-medium">Seuil de rétention — Catastrophe niveau 5</h3>
      </div>
      <p className="mb-4 text-sm text-[#7c88a3]">
        Le CD peut abaisser le seuil minimal de rétention (30% → 15% du stock initial)
        pour libérer davantage de ressources. Ce réglage s'applique à tous les quartiers.
      </p>

      {error && (
        <div className="mb-3 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2 py-1 text-xs text-[#fbbf24]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${percent === 30 ? "text-white" : "text-[#7c88a3]"}`}>
          30%
        </span>

        <button
          type="button"
          onClick={handleToggle}
          disabled={loading || updating}
          aria-pressed={isRetentionOverrideActive}
          aria-label="Basculer le seuil de rétention entre 30% et 15%"
          className={`relative h-7 w-14 shrink-0 rounded-full transition-colors duration-300 ${
            isRetentionOverrideActive ? "bg-[#8b0000]" : "bg-[#2563eb]"
          } ${loading || updating ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform duration-300 ${
              isRetentionOverrideActive ? "translate-x-7" : "translate-x-0"
            }`}
          />
        </button>

        <span className={`text-sm font-medium ${percent === 15 ? "text-white" : "text-[#7c88a3]"}`}>
          15%
        </span>

        {updating && <span className="text-xs text-[#7c88a3]">Mise à jour…</span>}
      </div>
    </div>
  );
}