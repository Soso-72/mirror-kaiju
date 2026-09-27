"use client";

import React, { useEffect, useState } from "react";
import { createTransferRequest } from "../utils/transfert";
import { getResourceMap, getStoredToken, getUserProfile, setAuthToken } from "../utils/user";

type DistrictOption = {
    id: number;
    name: string;
};

type ResourceOption = {
    id: number;
    name: string;
};

export default function TransferRequestsForm() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [requestedById, setRequestedById] = useState<number | null>(null);
    const [districts, setDistricts] = useState<DistrictOption[]>([]);
    const [resourceTypes, setResourceTypes] = useState<ResourceOption[]>([]);

    const [sourceDistrictId, setSourceDistrictId] = useState<number>(0);
    const [destinationDistrictId, setDestinationDistrictId] = useState<number>(0);
    const [resourceTypeId, setResourceTypeId] = useState<number>(0);
    const [quantity, setQuantity] = useState<string>("");

    // 1. Chargement de l'utilisateur
    useEffect(() => {
        const token = getStoredToken();
        if (!token) return;
        setAuthToken(token);

        getUserProfile(token)
            .then((res: any) => {
                const profile = res.response || res;
                if (profile?.id) setRequestedById(Number(profile.id));
            })
            .catch((err) => console.error("Erreur chargement profil:", err));
    }, []);

    // 2. Chargement des districts et ressources
    useEffect(() => {
        getResourceMap()
            .then((res: any) => {
                const rawList: any[] = Array.isArray(res) ? res : res.response || res.data || res.districts || [];

                // Extraire les districts
                const parsedDistricts: DistrictOption[] = rawList
                    .map((d) => ({
                        id: Number(d.id ?? d.districtId ?? d.district_id),
                        name: String(d.name ?? d.districtName ?? `District ${d.id}`),
                    }))
                    .filter((d) => !isNaN(d.id) && d.id > 0);

                // Extraire les ressources uniques
                const resourceMap = new Map<number, ResourceOption>();
                rawList.forEach((d) => {
                    const items = d.resources || d.resourceTypes || [];
                    if (Array.isArray(items)) {
                        items.forEach((r) => {
                            const rId = Number(r.id ?? r.resourceTypeId ?? r.typeId);
                            if (!isNaN(rId) && rId > 0 && !resourceMap.has(rId)) {
                                resourceMap.set(rId, {
                                    id: rId,
                                    name: String(r.name || r.resourceName || `Ressource ${rId}`),
                                });
                            }
                        });
                    }
                });

                const parsedResources = Array.from(resourceMap.values());

                setDistricts(parsedDistricts);
                setResourceTypes(parsedResources);

                // Valeurs par défaut
                if (parsedDistricts.length > 0) {
                    setSourceDistrictId(parsedDistricts[0].id);
                    setDestinationDistrictId(parsedDistricts[1]?.id || parsedDistricts[0].id);
                }
                if (parsedResources.length > 0) {
                    setResourceTypeId(parsedResources[0].id);
                }
            })
            .catch(() => setError("Impossible de charger les options de transfert."));
    }, []);

    // 3. Soumission du formulaire
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!requestedById) {
            setError("Utilisateur non identifié.");
            return;
        }

        setLoading(true);

        try {
            const result = await createTransferRequest({
                sourceDistrictId: Number(sourceDistrictId),
                destinationDistrictId: Number(destinationDistrictId),
                resourceTypeId: Number(resourceTypeId),
                quantity: Number(quantity),
                requestedById,
            });

            if (result.success || result.id || result.response) {
                setSuccess("Demande de transfert créée avec succès !");
                setQuantity("");
                setOpen(false);
            } else {
                setError(result.message || "Erreur lors de la création.");
            }
        } catch (fetchError: any) {
            const backendMsg =
                fetchError?.response?.data?.error?.message ||
                fetchError?.response?.data?.message ||
                "Erreur ou refus de transfert.";
            setError(`Refus : ${backendMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="rounded-2xl border border-[#1c2740] bg-[#0e1626] p-5 text-[#e7ebf3] shadow-xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Transfert de ressources</h2>
                    <p className="text-sm text-[#7c88a3]">Créer une nouvelle demande de transfert.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="rounded-md bg-[#4fc3f7] px-4 py-2 text-sm font-semibold text-[#0f1115] hover:opacity-90"
                >
                    {open ? "Fermer" : "Nouveau transfert"}
                </button>
            </div>

            {success && <p className="mt-4 rounded bg-emerald-500/10 p-3 text-sm text-emerald-400">{success}</p>}
            {error && <p className="mt-4 rounded bg-amber-500/10 p-3 text-sm text-amber-400">{error}</p>}

            {open && (
                <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                        <span className="text-[#7c88a3]">District Source</span>
                        <select
                            value={sourceDistrictId}
                            onChange={(e) => setSourceDistrictId(Number(e.target.value))}
                            className="rounded-md border border-[#1c2740] bg-[#0b1220] p-2 text-[#e7ebf3]"
                            required
                        >
                            {districts.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                        <span className="text-[#7c88a3]">District Destination</span>
                        <select
                            value={destinationDistrictId}
                            onChange={(e) => setDestinationDistrictId(Number(e.target.value))}
                            className="rounded-md border border-[#1c2740] bg-[#0b1220] p-2 text-[#e7ebf3]"
                            required
                        >
                            {districts.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                        <span className="text-[#7c88a3]">Ressource</span>
                        <select
                            value={resourceTypeId}
                            onChange={(e) => setResourceTypeId(Number(e.target.value))}
                            className="rounded-md border border-[#1c2740] bg-[#0b1220] p-2 text-[#e7ebf3]"
                            required
                        >
                            {resourceTypes.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-1 text-sm">
                        <span className="text-[#7c88a3]">Quantité</span>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Ex. 10"
                            className="rounded-md border border-[#1c2740] bg-[#0b1220] p-2 text-[#e7ebf3]"
                            required
                        />
                    </label>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={loading || !requestedById}
                            className="rounded-md bg-[#4fc3f7] px-4 py-2 text-sm font-semibold text-[#0f1115] hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? "Création..." : "Créer le transfert"}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}