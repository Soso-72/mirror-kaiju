'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { CardCard, Countdown } from "./cardDate";
import type { Transfer } from "./transactionCard";
import { getAllTransfers } from "../utils/transfert";
import { getSocket } from "../utils/socket";

const MOIS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const JOURS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Palette professionnelle et sobre pour les événements (cycle par ordre d'ajout)
const COULEURS = [
  { bg: "#dbeafe", text: "#1d4ed8" }, // bleu
  { bg: "#e0e7ff", text: "#4338ca" }, // indigo
  { bg: "#ccfbf1", text: "#0f766e" }, // teal
  { bg: "#fef3c7", text: "#b45309" }, // ambre
  { bg: "#f1f5f9", text: "#334155" }, // gris ardoise
];

// Couleurs des transferts dans la grille, une par phase (mêmes teintes que la CardCard)
const COULEURS_TRANSFERT: Record<PhaseAffichee, { bg: string; text: string }> = {
  en_cours: { bg: "#fef3c7", text: "#b45309" }, // ambre
  termine: { bg: "#d1fae5", text: "#047857" }, // vert
};

const LIBELLES_TRANSFERT: Record<PhaseAffichee, string> = {
  en_cours: "En cours",
  termine: "Transférée",
};

const ACCENT = "#2563eb";

// Seules ces deux phases sont affichées : les transferts "pending" et "rejected" sont ignorés.
type PhaseAffichee = "en_cours" | "termine";

interface Evenement {
  id: string;
  titre: string;
  heure: string;
  note: string;
  couleur: number;
  // Renseigné pour les événements créés automatiquement à partir d'un transfert
  phase?: PhaseAffichee;
  // Fin prévue (ms) tant que le transfert est en cours : sert au décompte dans la grille
  finAt?: number;
}

// Durée d'un transfert selon le trajet (en minutes)
const DUREE_MARITIME_MIN = 4;
const DUREE_ADJACENT_MIN = 1;
const DUREE_AUTRE_MIN = 4; // ni maritime, ni adjacent (ex. routeType absent)

// Le formulaire de demande envoie routeType = "adjacent" | "maritime" (voir formsTransfer.tsx).
// On suppose que le backend le renvoie dans le transfert : ajoute aussi `routeType?: string` à
// l'interface Transfer de transactionCard.tsx, puis ce type local pourra être supprimé.
// startedAt : instant (ms) où la demande est passée à "approved", posé côté front à la réception du changement de statut.
// approvedAt : idem mais fourni par le backend s'il existe (prioritaire).
type TransferAvecTrajet = Transfer & {
  routeType?: string;
  startedAt?: number;
  approvedAt?: string;
};

function getDureeMs(t: Transfer): number {
  const route = (t as TransferAvecTrajet).routeType?.toLowerCase();
  if (route === "maritime") return DUREE_MARITIME_MIN * 60_000;
  if (route === "adjacent") return DUREE_ADJACENT_MIN * 60_000;
  return DUREE_AUTRE_MIN * 60_000; // route absente ou autre
}

// Le transfert ne démarre qu'une fois la demande acceptée (statut "approved") :
// début = approvedAt (backend) > instant de réception du passage à "approved" > updatedAt > date de la demande.
function getDebut(t: Transfer): Date {
  const { approvedAt, startedAt } = t as TransferAvecTrajet;
  const d = new Date(approvedAt ?? startedAt ?? t.updatedAt ?? t.requestedAt ?? Date.now());
  return isNaN(d.getTime()) ? new Date() : d;
}

function getFin(t: Transfer): Date {
  return new Date(getDebut(t).getTime() + getDureeMs(t));
}

// approved → en cours jusqu'à la fin de la durée, puis transférée
// completed → transférée / pending et rejected → non affichés
function getPhase(t: Transfer, now: number): PhaseAffichee | null {
  if (t.status === "completed") return "termine";
  if (t.status === "approved") return now >= getFin(t).getTime() ? "termine" : "en_cours";
  return null;
}

// Les données peuvent venir de HTTP (objets imbriqués) ou du socket (champs plats)
function getResourceName(t: Transfer): string {
  return t.resourceType?.name || t.resourceTypeName || "Ressource";
}

function getRoute(t: Transfer): { from?: string; to?: string } {
  return {
    from: t.sourceDistrict?.name || t.sourceDistrictName,
    to: t.destinationDistrict?.name || t.destinationDistrictName,
  };
}

// Jour où le transfert s'affiche dans la grille : jour du début tant qu'il est en cours,
// jour de la fin une fois terminé.
function getTransferDate(t: Transfer, now: number): Date {
  if (t.status === "completed") {
    const d = new Date(t.updatedAt ?? getFin(t));
    return isNaN(d.getTime()) ? getFin(t) : d;
  }
  return getPhase(t, now) === "termine" ? getFin(t) : getDebut(t);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Renvoie les cases du mois (avec jours du mois précédent/suivant pour compléter la grille)
function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0 = dimanche

  const gridStart = new Date(year, month, 1 - startOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

const MAX_VISIBLE = 2;

export function CalendarTransit() {
  const today = new Date();
  // Le mois affiché commence toujours au premier jour du mois courant.
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  // Une date n'est sélectionnée qu'après un clic dans la grille.
  const [selected, setSelected] = useState<Date | null>(null);
  // Les événements ajoutés à la main, regroupés par date.
  const [evenements, setEvenements] = useState<Record<string, Evenement[]>>({});

  const [titre, setTitre] = useState("");
  const [heure, setHeure] = useState("");
  const [note, setNote] = useState("");

  // --- Transferts ---
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  // Sert à faire passer un transfert de "en cours" à "transférée" quand sa durée est écoulée.
  const [now, setNow] = useState(() => Date.now());

  // Programme un rafraîchissement à la fin du prochain transfert en cours (pas de tick à la seconde).
  useEffect(() => {
    const fins = transfers
      .filter((t) => t.status === "approved")
      .map((t) => getFin(t).getTime())
      .filter((fin) => fin > now);
    if (fins.length === 0) return;

    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(...fins) - now + 50);
    return () => window.clearTimeout(timer);
  }, [transfers, now]);

  // Ajoute le transfert s'il est nouveau, sinon fusionne les champs reçus (le socket peut envoyer un objet partiel).
  const upsertTransfer = useCallback((t: Transfer) => {
    setTransfers((prev) =>
      prev.some((x) => x.id === t.id)
        ? prev.map((x) => {
            if (x.id !== t.id) return x;
            // Le transfert ne démarre (et le décompte non plus) qu'au moment où la demande passe à "approved".
            const vientDEtreAcceptee = x.status !== "approved" && t.status === "approved";
            return { ...x, ...t, ...(vientDEtreAcceptee ? { startedAt: Date.now() } : {}) };
          })
        : [t, ...prev]
    );
  }, []);

  // Chargement initial
  useEffect(() => {
    let cancelled = false;
    getAllTransfers()
      .then((res: any) => {
        if (cancelled) return;
        const list = res?.response ?? res;
        setTransfers(Array.isArray(list) ? list : []);
      })
      .catch((err: unknown) => console.error("Erreur chargement des transferts:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Temps réel : un transfert est créé / change de statut
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    if (!socket.connected) socket.connect();

    socket.on("transfer_created", upsertTransfer);
    socket.on("transfer_updated", upsertTransfer);

    return () => {
      socket.off("transfer_created", upsertTransfer);
      socket.off("transfer_updated", upsertTransfer);
    };
  }, [upsertTransfer]);

  // Événements manuels + transferts, fusionnés par date pour la grille.
  const tousEvenements = useMemo(() => {
    const merged: Record<string, Evenement[]> = {};
    for (const [key, list] of Object.entries(evenements)) merged[key] = [...list];

    for (const t of transfers) {
      const phase = getPhase(t, now);
      if (!phase) continue;

      const d = getTransferDate(t, now);
      const key = dateKey(d);
      if (!merged[key]) merged[key] = [];
      merged[key].push({
        id: `transfer-${t.id}`,
        titre: `${LIBELLES_TRANSFERT[phase]} : ${t.quantity} × ${getResourceName(t)}`,
        heure: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        note: "",
        couleur: 0,
        phase,
        finAt: phase === "en_cours" ? getFin(t).getTime() : undefined,
      });
    }
    return merged;
  }, [evenements, transfers, now]);

  // Transferts du jour sélectionné, affichés en CardCard sous la grille.
  const transfertsDuJour = selected
    ? transfers.filter(
        (t) => getPhase(t, now) !== null && isSameDay(getTransferDate(t, now), selected)
      )
    : [];

  const year = current.getFullYear();
  const month = current.getMonth();
  const days = getMonthGrid(year, month);

  // Les boutons de navigation recalculent automatiquement la grille du mois.
  const goPrevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const goNextMonth = () => setCurrent(new Date(year, month + 1, 1));

  // Aucun événement ne peut être affiché tant qu'aucune date n'est sélectionnée.
  const selectedEvents = selected ? tousEvenements[dateKey(selected)] ?? [] : [];

  // Ajoute l'événement à la date sélectionnée puis réinitialise le formulaire.
  const handleAddEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected || titre.trim() === "") return;

    const key = dateKey(selected);
    const existants = evenements[key] ?? [];

    const nouvel: Evenement = {
      id: `${Date.now()}`,
      titre: titre.trim(),
      heure: heure.trim(),
      note: note.trim(),
      couleur: existants.length % COULEURS.length,
    };

    setEvenements((prev) => ({ ...prev, [key]: [...existants, nouvel] }));

    setTitre("");
    setHeure("");
    setNote("");
  };

  // Supprime uniquement l'événement correspondant à l'identifiant fourni.
  const handleRemoveEvent = (id: string) => {
    if (!selected) return;
    const key = dateKey(selected);
    setEvenements((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((ev) => ev.id !== id),
    }));
  };

  return (
    <div
      className="w-full max-w-7xl rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6"
      style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* En-tête */}
      <div className="mb-2 flex items-center gap-4">
        <button
          type="button"
          onClick={goPrevMonth}
          aria-label="Mois précédent"
          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
        >
          &#8249;
        </button>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Mois suivant"
          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
        >
          &#8250;
        </button>
        <h2 className="text-xl font-semibold text-slate-700 sm:text-2xl">
          {MOIS[month]} {year}
        </h2>
      </div>

      {/* Grille du mois */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {JOURS.map((j) => (
            <div
              key={j}
              className="border-r border-slate-200 py-2 text-center text-sm font-medium text-slate-600 last:border-r-0"
            >
              {j}
            </div>
          ))}
        </div>

        {/* Semaines */}
        <div className="grid grid-cols-7 grid-rows-6">
          {days.map((d) => {
            const inCurrentMonth = d.getMonth() === month;
            const isToday = isSameDay(d, today);
            const isSelected = selected !== null && isSameDay(d, selected);
            const events = tousEvenements[dateKey(d)] ?? [];
            const visibles = events.slice(0, MAX_VISIBLE);
            const reste = events.length - visibles.length;

            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setSelected(d)}
                className={[
                  "flex min-h-[90px] flex-col items-start gap-1 border-b border-r border-slate-200 p-2 text-left align-top",
                  "sm:min-h-[110px] lg:min-h-[130px]",
                  isToday ? "bg-blue-50" : isSelected ? "bg-slate-100" : "hover:bg-slate-50",
                ].join(" ")}
                style={isToday ? { boxShadow: `inset 0 0 0 1px ${ACCENT}33` } : undefined}
              >
                <span
                  className={[
                    "text-sm sm:text-base",
                    inCurrentMonth ? "text-slate-700" : "text-slate-300",
                  ].join(" ")}
                >
                  {d.getDate()}
                </span>

                <div className="flex w-full flex-col gap-0.5">
                  {visibles.map((ev) => {
                    const c = ev.phase ? COULEURS_TRANSFERT[ev.phase] : COULEURS[ev.couleur];
                    return (
                      <span
                        key={ev.id}
                        className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium sm:text-xs"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        {ev.finAt !== undefined ? (
                          <>
                            <Countdown endAt={ev.finAt} />{" "}
                          </>
                        ) : ev.heure ? (
                          `${ev.heure} `
                        ) : (
                          ""
                        )}
                        {ev.titre}
                      </span>
                    );
                  })}
                  {reste > 0 && (
                    <span className="px-1.5 text-[11px] text-slate-400 sm:text-xs">
                      +{reste} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Détail du jour sélectionné : une CardCard par transfert */}
      {selected && (
        <div className="mt-4 rounded-lg bg-[#0b1220] p-4 text-[#e7ebf3]">
          <h3 className="mb-3 text-sm font-semibold capitalize">
            {selected.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>

          {transfertsDuJour.length === 0 ? (
            <p className="text-sm text-[#7c88a3]">Aucun transfert ce jour-là.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {transfertsDuJour.map((t) => (
                <CardCard
                  key={t.id}
                  status={getPhase(t, now) as PhaseAffichee}
                  endAt={getPhase(t, now) === "en_cours" ? getFin(t).getTime() : undefined}
                  resource={getResourceName(t)}
                  quantity={t.quantity}
                  {...getRoute(t)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}