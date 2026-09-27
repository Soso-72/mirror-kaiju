'use client';

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getResourceMap } from "../utils/user";
import { getDisasterLevel, updateDisasterLevel } from "../utils/disaster";
import { getSocket } from "../utils/socket";

const BASE_QUARTERS = [
  { id: "A", name: "Apex", path: "M46,205 L41,218 L41,240 L44,251 L81,280 L102,302 L110,316 L115,341 L120,347 L156,354 L238,356 L298,373 L306,372 L307,367 L283,333 L282,306 L287,291 L303,270 L346,239 L369,226 L404,215 L408,211 L401,201 L355,175 L339,170 L312,166 L290,157 L259,126 L232,124 L205,125 L180,143 L165,149 L128,148 L107,155 L76,173 Z", labelPos: { x: 200, y: 240 }, seaAccess: "landlocked" },
  { id: "W", name: "Warden", path: "M92,361 L102,428 L103,472 L100,505 L86,533 L84,548 L97,586 L105,591 L149,601 L176,614 L212,639 L226,654 L239,676 L254,676 L257,672 L261,672 L268,678 L280,668 L279,652 L283,646 L274,638 L276,620 L279,617 L307,607 L312,592 L320,586 L329,585 L340,594 L358,583 L372,583 L382,577 L383,571 L378,567 L377,552 L378,546 L385,539 L370,530 L368,522 L380,508 L377,493 L393,493 L402,475 L386,465 L375,453 L358,415 L351,388 L343,375 L336,382 L336,393 L327,394 L305,389 L287,389 L284,382 L262,376 L247,366 L243,369 L221,366 L192,368 L177,364 L173,368 L149,368 L124,365 L120,361 Z", labelPos: { x: 220, y: 495 }, seaAccess: "landlocked" },
  { id: "X", name: "Xeno", path: "M446,225 L432,243 L431,250 L426,254 L420,254 L415,247 L402,247 L379,257 L368,258 L355,274 L343,276 L327,292 L319,293 L314,289 L310,321 L320,338 L331,343 L336,349 L336,358 L346,364 L350,364 L361,375 L367,375 L374,382 L374,391 L369,399 L396,427 L390,454 L409,459 L413,466 L418,467 L419,471 L436,486 L476,492 L491,480 L484,476 L485,466 L490,457 L497,458 L496,453 L492,450 L492,446 L505,430 L509,416 L515,412 L529,416 L542,405 L555,405 L558,403 L558,398 L564,388 L558,378 L561,358 L574,348 L571,344 L572,335 L595,328 L596,323 L608,309 L583,285 L575,281 L537,273 L522,263 L504,245 L470,242 L457,235 L449,225 Z", labelPos: { x: 470, y: 360 }, seaAccess: "hub" },
  { id: "E", name: "Echo", path: "M835,199 L808,146 L807,123 L812,99 L793,88 L792,82 L786,78 L786,84 L745,82 L720,56 L653,56 L620,23 L593,25 L567,37 L553,38 L562,57 L562,98 L559,106 L547,113 L522,116 L462,114 L447,109 L430,96 L418,95 L330,107 L291,108 L288,119 L296,124 L297,131 L319,138 L354,139 L365,147 L376,148 L386,161 L397,168 L415,171 L427,178 L431,186 L439,190 L440,202 L447,208 L450,217 L465,218 L475,226 L502,226 L514,236 L533,240 L545,258 L582,262 L592,273 L607,274 L620,299 L629,301 L643,313 L646,306 L656,303 L689,335 L698,334 L705,342 L701,318 L732,299 L745,297 L748,278 L752,274 L781,271 L787,255 L776,238 L797,217 L827,213 Z", labelPos: { x: 660, y: 170 }, seaAccess: "bay" },
  { id: "Z", name: "Zion", path: "M414,478 L398,500 L387,500 L389,510 L377,522 L393,534 L392,544 L386,549 L390,582 L375,591 L362,591 L342,603 L328,597 L317,600 L310,621 L293,621 L284,626 L282,635 L293,644 L287,657 L288,674 L280,677 L272,688 L262,683 L242,685 L243,694 L285,729 L302,754 L329,783 L336,801 L335,841 L349,855 L345,845 L357,838 L366,838 L368,849 L382,846 L410,826 L450,819 L483,821 L503,833 L508,831 L554,850 L595,843 L638,797 L573,700 L540,700 L537,695 L531,700 L520,701 L519,691 L502,699 L496,697 L492,684 L506,663 L527,659 L556,646 L554,644 L529,656 L523,654 L523,640 L535,626 L502,565 L497,537 L468,539 L464,534 L466,527 L482,524 L482,510 L479,510 L475,523 L469,525 L462,510 L464,499 L447,500 L431,495 Z", labelPos: { x: 420, y: 680 }, seaAccess: "bay" },
] as const;

type QuarterId = (typeof BASE_QUARTERS)[number]["id"];

interface Resource {
  name: string;
  quantity: number;
  initialQuantity?: number;
  retentionThreshold?: number; // Pourcentage de rétention (30 ou 15)
  retentionMin: number;
}

interface Quarter {
  id: QuarterId;
  name: string;
  path: string;
  labelPos: { x: number; y: number };
  seaAccess: "landlocked" | "bay" | "hub";
  resources: Resource[];
}

const SEA_ACCESS_LABEL: Record<Quarter["seaAccess"], string> = {
  landlocked: "Enclavé",
  bay: "Accès baie",
  hub: "Hub central · baie",
};

const LEVEL_COLOR: Record<number, string> = {
  1: "#2e7d32",
  2: "#9e9d24",
  3: "#f9a825",
  4: "#e64a19",
  5: "#8b0000",
};

const LEVEL_LABEL: Record<number, string> = {
  1: "Normal",
  2: "Vigilance",
  3: "Alerte",
  4: "Alerte forte",
  5: "Catastrophe",
};

const FALLBACK_DATA: Quarter[] = BASE_QUARTERS.map((quarter) => ({
  ...quarter,
  resources: [
    { name: "Personnel médical", quantity: 7, initialQuantity: 23, retentionThreshold: 30, retentionMin: 7 },
    { name: "Équipes de secours", quantity: 3, initialQuantity: 10, retentionThreshold: 30, retentionMin: 3 },
    { name: "Véhicules de transport", quantity: 6, initialQuantity: 20, retentionThreshold: 30, retentionMin: 6 },
    { name: "Abris d'urgence", quantity: 8, initialQuantity: 26, retentionThreshold: 30, retentionMin: 8 },
    { name: "Vivres et eau", quantity: 3, initialQuantity: 10, retentionThreshold: 30, retentionMin: 3 },
    { name: "Équipement de communication", quantity: 3, initialQuantity: 10, retentionThreshold: 30, retentionMin: 3 },
    { name: "Générateurs", quantity: 6, initialQuantity: 20, retentionThreshold: 30, retentionMin: 6 },
    { name: "Équipes d'ingénierie", quantity: 2, initialQuantity: 7, retentionThreshold: 30, retentionMin: 2 },
    { name: "Unités de sécurité", quantity: 9, initialQuantity: 30, retentionThreshold: 30, retentionMin: 9 },
    { name: "Équipement hazmat", quantity: 4, initialQuantity: 13, retentionThreshold: 30, retentionMin: 4 },
  ],
}));

export function DistrictAlertMap() {
  const [level, setLevel] = useState(1);
  const [selectedId, setSelectedId] = useState<QuarterId | null>(null);
  const [quarters, setQuarters] = useState<Quarter[]>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [updatingLevel, setUpdatingLevel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.connect();

    const handleLevelChanged = (payload: { level: number }) => {
      setLevel(payload.level);
    };

    socket.on("disasterLevel:changed", handleLevelChanged);

    return () => {
      socket.off("disasterLevel:changed", handleLevelChanged);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      try {
        setLoading(true);

        const [payload, currentLevel] = await Promise.all([
          getResourceMap(),
          getDisasterLevel(),
        ]);

        setLevel(currentLevel);

        const mapped = payload.response ?? [];
        const ready = BASE_QUARTERS.map((base) => {
          const district = mapped.find((item: any) => item.code === base.id) ?? null;
          const resources = district?.resources?.length
            ? district.resources.map((r: any) => ({
              name: r.name,
              quantity: Number(r.quantity) || 0,
              initialQuantity: Number(r.initialQuantity) || Number(r.quantity) || 0,
              retentionThreshold: Number(r.retentionThreshold) || 30,
              retentionMin: Number(r.retentionMin) || 0,
            }))
            : FALLBACK_DATA.find((item) => item.id === base.id)?.resources ?? [];

          return {
            ...base,
            resources,
          };
        });

        setQuarters(ready);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setQuarters(FALLBACK_DATA);
        setError("Connexion au backend indisponible, affichage sur données de secours");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => controller.abort();
  }, []);

  const handleLevelChange = async (newLvl: number) => {
    if (updatingLevel || newLvl === level) return;

    setUpdatingLevel(true);
    const result = await updateDisasterLevel(newLvl);

    if (result.success) {
      setLevel(newLvl);
      setError(null);
    } else {
      setError(result.message || "Impossible de mettre à jour le niveau d'urgence");
    }
    setUpdatingLevel(false);
  };

  const levelColor = LEVEL_COLOR[level];
  const selected = useMemo(
    () => quarters.find((q) => q.id === selectedId) ?? quarters[0] ?? null,
    [quarters, selectedId]
  );

  return (
    <div className="min-h-screen w-full rounded-md shadow-xl/30 bg-[#0b1220] p-8 text-[#e7ebf3]">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-lg font-medium">Carte des quartiers — Tokyork</h2>
          <p className="mt-0.5 text-sm text-[#7c88a3]">
            Cliquez sur un quartier pour voir ses ressources. La couleur de toute la carte reflète le niveau de catastrophe global sélectionné.
          </p>
        </div>

        <div
          className="ml-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white transition-colors duration-300"
          style={{ background: levelColor }}
        >
          <span className="h-2 w-2 rounded-full bg-white/40" />
          Niveau {level} — {LEVEL_LABEL[level]}
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Carte */}
        <div className="flex-[2]">
          {loading && (
            <div className="mb-3 text-xs text-[#7c88a3]">Chargement des données depuis la base…</div>
          )}
          {error && (
            <div className="mb-3 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2 py-1 text-xs text-[#fbbf24]">
              {error}
            </div>
          )}
          <svg
            viewBox="0 0 976 972"
            className="w-full rounded-lg border border-[#1c2740] bg-[#e8e8e6]"
          >
            {quarters.map((q) => {
              const isSelected = selected?.id === q.id;
              return (
                <g
                  key={q.id}
                  onClick={() => setSelectedId(q.id)}
                  className="cursor-pointer"
                >
                  <path
                    d={q.path}
                    fill={levelColor}
                    fillOpacity={0.6 + level * 0.06}
                    stroke={isSelected ? "#ffffff" : "#111"}
                    strokeWidth={isSelected ? 4 : 2}
                    strokeLinejoin="round"
                    className="transition-colors duration-300"
                  />
                  <text
                    x={q.labelPos.x}
                    y={q.labelPos.y}
                    textAnchor="middle"
                    fontSize={48}
                    fontWeight={700}
                    fill="#111"
                    pointerEvents="none"
                  >
                    {q.id}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Sélecteur de niveau */}
          <div className="mt-5">
            <div className="mb-2 text-xs text-[#7c88a3]">
              Niveau de catastrophe global (cliquez pour mettre à jour)
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  disabled={updatingLevel}
                  onClick={() => handleLevelChange(lvl)}
                  className={`h-9 flex-1 rounded-md text-sm font-medium text-white transition ${
                    level === lvl ? "ring-2 ring-white scale-105" : "opacity-70 hover:opacity-100"
                  } ${updatingLevel ? "cursor-not-allowed opacity-50" : ""}`}
                  style={{ background: LEVEL_COLOR[lvl] }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-sm text-[#7c88a3]">
            Cliquez sur un quartier pour voir ses ressources. Modifier le niveau d'urgence applique directement le changement en base de données.
          </p>
        </div>

        {/* Panneau latéral */}
        <div className="w-full rounded-lg border border-[#1c2740] bg-[#0e1626] p-6 lg:w-96">
          {!selected && (
            <p className="text-sm text-[#7c88a3]">
              Sélectionnez un quartier sur la carte pour afficher ses ressources.
            </p>
          )}

          {selected && (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="mb-1 flex items-center gap-2.5">
                  <span
                    className="inline-block h-4 w-4 rounded"
                    style={{ background: levelColor }}
                  />
                  <h3 className="text-base font-medium">{selected.name}</h3>
                  <span className="text-xs text-[#7c88a3]">· {selected.id}</span>
                </div>
                <div className="mb-4 text-xs text-[#7c88a3]">
                  {SEA_ACCESS_LABEL[selected.seaAccess]}
                </div>

                <div className="mb-2 text-xs text-[#7c88a3]">
                  Ressources (quantité / seuil min.)
                </div>
                <ul className="divide-y divide-[#1c2740]">
                  {selected.resources.map((r) => {
                    // Pourcentage de rétention (30% par défaut ou 15%)
                    const pct = r.retentionThreshold && r.retentionThreshold > 0 ? r.retentionThreshold : 30;
                    
                    // Stock initial ou par défaut si indisponible
                    const baseQty = r.initialQuantity && r.initialQuantity > 0 ? r.initialQuantity : (r.quantity > 0 ? r.quantity : 10);
                    
                    // Calcul du seuil minimal basé sur le pourcentage
                    const calculatedMin = Math.ceil((baseQty * pct) / 100);

                    const margin = r.quantity - calculatedMin;
                    const tight = margin <= 1;

                    return (
                      <li key={r.name} className="flex items-center justify-between py-2 text-sm">
                        <span className="pr-2 text-[#e7ebf3]">{r.name}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className={`font-medium ${tight ? "text-[#f87171]" : "text-[#4ade80]"}`}>
                            {r.quantity}
                          </span>
                          <span className="text-xs text-[#7c88a3]">/ {calculatedMin}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Bouton de redirection vers la page Transaction */}
              <div className="mt-6 pt-4 border-t border-[#1c2740]">
                <Link
                  href={`/transaction?district=${selected.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-md bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1d4ed8]"
                >
                  transaction
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}