'use client';

import { useState } from "react";
import { approveTransferRequest } from "../utils/transfert";

interface AcceptTransferButtonProps {
  transferId: number;
  /** Reçoit le transfert mis à jour renvoyé par le backend (si disponible). */
  onAccepted?: (updated?: any) => void;
  disabled?: boolean;
}

export function AcceptTransferButton({
  transferId,
  onAccepted,
  disabled,
}: AcceptTransferButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await approveTransferRequest(transferId);
      const updated = data?.response ?? data;
      onAccepted?.(updated);
    } catch (err: any) {
      console.error("Failed to approve transfer:", err);
      setError(err?.response?.data?.message || "Impossible d'accepter la demande.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleAccept}
        disabled={disabled || loading}
        className="rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Acceptation..." : "Accepter"}
      </button>
      {error && <span className="text-[11px] text-[#f87171]">{error}</span>}
    </div>
  );
}