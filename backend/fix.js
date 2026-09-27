import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function fixAllAdjacencies() {
    console.log("🔄 Correction des adjacencies en cours...");
    // 1. Corriger Echo (10) <-> Xeno (12) en terrestre
    await prisma.districtAdjacency.updateMany({
        where: {
            OR: [
                { districtId: 10, adjacentDistrictId: 12 },
                { districtId: 12, adjacentDistrictId: 10 },
            ],
        },
        data: { routeType: "adjacent" },
    });
    // 2. Corriger Xeno (12) <-> Zion (13) en terrestre
    await prisma.districtAdjacency.updateMany({
        where: {
            OR: [
                { districtId: 12, adjacentDistrictId: 13 },
                { districtId: 13, adjacentDistrictId: 12 },
            ],
        },
        data: { routeType: "adjacent" },
    });
    console.log("✅ Corrections appliquées avec succès !");
}
fixAllAdjacencies()
    .catch((e) => {
    console.error("❌ Erreur :", e);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=fix.js.map