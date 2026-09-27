'use client';

import React, { useEffect, useState } from "react";

// Structure attendue par calendar.tsx
export interface TransitInfo {
  id: string | number;
  resource?: string;
  quantity?: number;
  endTime: string | number | Date;
  from?: string;
  to?: string;
  [key: string]: any;
}

/** Décompte mm:ss jusqu'à `endAt` (timestamp en ms) */
export function Countdown({ endAt }: { endAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endAt - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, endAt - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endAt]);

  const total = Math.ceil(remaining / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");

  return <span className="tabular-nums">{minutes}:{seconds}</span>;
}

export type CardCardStatus = "en_cours" | "termine";

interface CardCardProps {
  resource: string;
  quantity?: number;
  status: CardCardStatus;
  endAt?: number;
  from?: string;
  to?: string;
  children?: React.ReactNode;
}

const STYLES: Record<CardCardStatus, { wrapper: string; label: string }> = {
  en_cours: {
    wrapper: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    label: "Ressource en cours de transfert",
  },
  termine: {
    wrapper: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    label: "Ressource transférée",
  },
};

function StatusIcon({ status }: { status: CardCardStatus }) {
  if (status === "en_cours") {
    return (
      <span
        aria-hidden
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400 motion-reduce:animate-none"
      />
    );
  }
  if (status === "termine") {
    return (
      <span
        aria-hidden
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] leading-none text-[#0b1220]"
      >
        &#10003;
      </span>
    );
  }
  return null;
}

export function CardCard({ resource, quantity, status, endAt, from, to, children }: CardCardProps) {
  const s = STYLES[status];

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${s.wrapper}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <StatusIcon status={status} />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{s.label}</p>
          <p className="truncate text-xs opacity-80">
            {quantity !== undefined ? `${quantity} × ` : ""}
            {resource}
            {from && to ? ` : ${from} → ${to}` : ""}
          </p>
        </div>
      </div>

      {status === "en_cours" && endAt !== undefined && (
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold">
          Arrivée dans <Countdown endAt={endAt} />
        </span>
      )}

      {children && <div className="flex flex-wrap items-start gap-2">{children}</div>}
    </div>
  );
}

// Wrapper CardDate pour assurer la compatibilité avec calendar.tsx
export function CardDate({ transit, onFinish }: { transit: TransitInfo; onFinish: (id: string | number) => void }) {
  const endTimestamp = new Date(transit.endTime).getTime();
  const isFinished = Date.now() >= endTimestamp;

  useEffect(() => {
    if (isFinished) {
      onFinish(transit.id);
    }
  }, [isFinished, transit.id, onFinish]);

  return (
    <CardCard
      resource={transit.resource || "Ressource"}
      quantity={transit.quantity}
      status={isFinished ? "termine" : "en_cours"}
      endAt={endTimestamp}
      from={transit.from}
      to={transit.to}
    />
  );
}