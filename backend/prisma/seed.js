// prisma/seed.ts
import "dotenv/config";
import { OfficerRole, RouteType } from "@prisma/client";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/hashPassword.js";
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL est introuvable. Vérifiez que backend/.env existe et est chargé.");
}
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Kaiju@2026!";
// ---------------------------------------------------------------------
// 1. Quartiers
// ---------------------------------------------------------------------
const districtSeeds = [
    { name: "Apex" },
    { name: "Echo" },
    { name: "Warden" },
    { name: "Xeno" },
    { name: "Zion" },
];
// ---------------------------------------------------------------------
// 2. Topologie — matrice d'adjacence (§2)
// ---------------------------------------------------------------------
const routeSeeds = [
    { from: "Apex", to: "Echo", routeType: RouteType.adjacent },
    { from: "Apex", to: "Warden", routeType: RouteType.adjacent },
    { from: "Apex", to: "Xeno", routeType: RouteType.adjacent },
    { from: "Echo", to: "Xeno", routeType: RouteType.adjacent },
    { from: "Warden", to: "Xeno", routeType: RouteType.adjacent },
    { from: "Warden", to: "Zion", routeType: RouteType.adjacent },
    { from: "Xeno", to: "Zion", routeType: RouteType.adjacent },
    // Voie maritime : Echo, Xeno, Zion côtiers (§2)
    { from: "Echo", to: "Xeno", routeType: RouteType.maritime },
    { from: "Xeno", to: "Zion", routeType: RouteType.maritime },
    { from: "Echo", to: "Zion", routeType: RouteType.maritime },
];
// ---------------------------------------------------------------------
// 3. Les 10 types de ressources (§3)
// ---------------------------------------------------------------------
const resourceTypeSeeds = [
    "Medical personnel",
    "Rescue teams",
    "Transport vehicles",
    "Emergency shelters",
    "Food & water supplies",
    "Communication equipment",
    "Power generators",
    "Engineering crews",
    "Security units",
    "Hazmat equipment",
];
// ---------------------------------------------------------------------
// 4. Distribution initiale exacte + seuils de rétention (§3 et §4)
// ---------------------------------------------------------------------
const resourceDistribution = {
    "Medical personnel": { quantities: [12, 5, 8, 3, 7], retentions: [4, 2, 3, 1, 3] },
    "Rescue teams": { quantities: [4, 9, 3, 6, 5], retentions: [2, 3, 1, 2, 2] },
    "Transport vehicles": { quantities: [6, 3, 10, 4, 7], retentions: [2, 1, 3, 2, 3] },
    "Emergency shelters": { quantities: [8, 6, 4, 10, 2], retentions: [3, 2, 2, 3, 1] },
    "Food & water supplies": { quantities: [5, 8, 6, 7, 9], retentions: [2, 3, 2, 3, 3] },
    "Communication equipment": { quantities: [3, 7, 5, 8, 4], retentions: [1, 3, 2, 3, 2] },
    "Power generators": { quantities: [7, 2, 9, 5, 6], retentions: [3, 1, 3, 2, 2] },
    "Engineering crews": { quantities: [2, 6, 7, 4, 8], retentions: [1, 2, 3, 2, 3] },
    "Security units": { quantities: [9, 4, 2, 6, 3], retentions: [3, 2, 1, 2, 1] },
    "Hazmat equipment": { quantities: [3, 5, 4, 2, 10], retentions: [1, 2, 2, 1, 3] },
};
const districtOrder = ["Apex", "Echo", "Warden", "Xeno", "Zion"];
// ---------------------------------------------------------------------
// 5. Les 7 comptes officiers (§5)
// ---------------------------------------------------------------------
const officerSeeds = [
    { email: "qc.apex@tokyork.gov", role: OfficerRole.QC, district: "Apex" },
    { email: "qc.echo@tokyork.gov", role: OfficerRole.QC, district: "Echo" },
    { email: "qc.warden@tokyork.gov", role: OfficerRole.QC, district: "Warden" },
    { email: "qc.xeno@tokyork.gov", role: OfficerRole.QC, district: "Xeno" },
    { email: "qc.zion@tokyork.gov", role: OfficerRole.QC, district: "Zion" },
    { email: "lc@tokyork.gov", role: OfficerRole.LC, district: null },
    { email: "cd@tokyork.gov", role: OfficerRole.CD, district: null },
];
async function main() {
    console.log("🌱 Démarrage du seed complet...");
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    await prisma.$transaction(async (tx) => {
        // --- 0. Initialisation de l'état de catastrophe global (§7) ---
        await tx.disasterState.upsert({
            where: { id: 1 },
            update: {},
            create: {
                id: 1,
                level: 1, // Niveau 1: Watch (§7)
                isRetentionOverrideActive: false,
            },
        });
        console.log("✅ Niveau de catastrophe initialisé (Niveau 1: Watch).");
        // --- 1. Quartiers ---
        const districts = new Map();
        for (const seed of districtSeeds) {
            const district = await tx.district.upsert({
                where: { name: seed.name },
                update: {},
                create: { name: seed.name },
            });
            districts.set(district.name, district);
        }
        console.log(`✅ ${districts.size} quartiers créés ou mis à jour.`);
        // --- 2. Types de ressources ---
        const resourceTypes = new Map();
        for (const name of resourceTypeSeeds) {
            const resourceType = await tx.resourceType.upsert({
                where: { name },
                update: {},
                create: { name },
            });
            resourceTypes.set(resourceType.name, resourceType);
        }
        console.log(`✅ ${resourceTypes.size} types de ressources créés ou mis à jour.`);
        // --- 3. Routes (adjacence + maritime) ---
        for (const seed of routeSeeds) {
            const district = districts.get(seed.from);
            const adjacentDistrict = districts.get(seed.to);
            if (!district || !adjacentDistrict) {
                throw new Error(`Quartier manquant pour la route ${seed.from} -> ${seed.to}.`);
            }
            for (const [a, b] of [
                [district.id, adjacentDistrict.id],
                [adjacentDistrict.id, district.id],
            ]) {
                await tx.districtAdjacency.upsert({
                    where: {
                        districtId_adjacentDistrictId: {
                            districtId: a,
                            adjacentDistrictId: b,
                        },
                    },
                    update: { routeType: seed.routeType },
                    create: {
                        districtId: a,
                        adjacentDistrictId: b,
                        routeType: seed.routeType,
                    },
                });
            }
        }
        console.log(`✅ ${routeSeeds.length} routes créées ou mises à jour (x2 sens).`);
        // --- 4. Stocks de ressources (Ajout de initialQuantity) ---
        let stockCount = 0;
        for (const [resourceName, data] of Object.entries(resourceDistribution)) {
            const resourceType = resourceTypes.get(resourceName);
            if (!resourceType) {
                throw new Error(`Type de ressource introuvable : ${resourceName}`);
            }
            for (let i = 0; i < districtOrder.length; i++) {
                const districtName = districtOrder[i];
                const district = districts.get(districtName);
                if (!district) {
                    throw new Error(`Quartier introuvable : ${districtName}`);
                }
                const initialQty = data.quantities[i];
                const retThreshold = data.retentions[i];
                await tx.resourceStock.upsert({
                    where: {
                        districtId_resourceTypeId: {
                            districtId: district.id,
                            resourceTypeId: resourceType.id,
                        },
                    },
                    update: {
                        quantity: initialQty,
                        initialQuantity: initialQty, // Maintient la quantité initiale
                        retentionThreshold: retThreshold,
                    },
                    create: {
                        districtId: district.id,
                        resourceTypeId: resourceType.id,
                        quantity: initialQty,
                        initialQuantity: initialQty,
                        retentionThreshold: retThreshold,
                    },
                });
                stockCount++;
            }
        }
        console.log(`✅ ${stockCount} lignes de stock créées ou mises à jour.`);
        // --- 5. Comptes officiers ---
        for (const seed of officerSeeds) {
            const district = seed.district ? districts.get(seed.district) : null;
            if (seed.district && !district) {
                throw new Error(`Quartier introuvable pour le compte ${seed.email}.`);
            }
            await tx.user.upsert({
                where: { email: seed.email },
                update: {
                    passwordHash,
                    role: seed.role,
                    districtId: district?.id ?? null,
                },
                create: {
                    email: seed.email,
                    passwordHash,
                    role: seed.role,
                    districtId: district?.id ?? null,
                },
            });
        }
        console.log(`✅ ${officerSeeds.length} comptes officiers créés ou mis à jour.`);
    });
    console.log("🎯 Seed complet terminé.");
}
main()
    .catch((err) => {
    console.error("❌ Erreur pendant le seed :", err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map