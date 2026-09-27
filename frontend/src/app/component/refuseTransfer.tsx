'use client';

import { useState } from "react";
import { rejectTransferRequest } from "../utils/transfert";

interface RefuseTransferButtonProps {
  transferId: number;
  /** Reçoit le transfert mis à jour renvoyé par le backend (si disponible). */
  onRefused?: (updated?: any) => void;
  disabled?: boolean;
}

export function RefuseTransferButton({
  transferId,
  onRefused,
  disabled,
}: RefuseTransferButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefuse = async () => {
    // rejectTransferRequest attend un motif obligatoire côté API.
    if (reason.trim() === "") {
      setError("Merci d'indiquer un motif de refus.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await rejectTransferRequest(transferId, reason.trim());
      const updated = data?.response ?? data;
      setOpen(false);
      setReason("");
      onRefused?.(updated);
    } catch (err: any) {
      console.error("Failed to reject transfer:", err);
      setError(err?.response?.data?.message || "Impossible de refuser la demande.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-md bg-[#f87171]/10 px-3 py-1.5 text-xs font-semibold text-[#f87171] ring-1 ring-[#f87171]/30 transition hover:bg-[#f87171]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Refuser
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[#1c2740] bg-[#0b1220] p-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif du refus (obligatoire)"
        rows={2}
        className="w-full resize-none rounded-md border border-[#1c2740] bg-[#0e1626] px-2 py-1.5 text-xs text-[#e7ebf3] placeholder-[#7c88a3] outline-none focus:border-[#f87171]"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleRefuse}
          disabled={loading}
          className="rounded-md bg-[#f87171]/20 px-3 py-1.5 text-xs font-semibold text-[#f87171] hover:bg-[#f87171]/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refus..." : "Confirmer le refus"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-[#7c88a3] hover:text-[#e7ebf3]"
        >
          Annuler
        </button>
      </div>
      {error && <span className="text-[11px] text-[#f87171]">{error}</span>}
    </div>
  );
}