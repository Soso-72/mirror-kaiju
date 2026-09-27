import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function updateRetentionLevel(
  districtId: number,
  userRole: string,
  alertLevel: number,
  retentionThreshold: number
) {
  if (userRole !== "CD") {
    throw new Error("Seul un CD (Commandant) est autorisé à modifier le seuil de rétention.");
  }

  if (retentionThreshold === 15 && alertLevel < 5) {
    throw new Error("L'abaissement du seuil à 15% nécessite un niveau d'alerte de Niveau 5.");
  }

  if (![15, 30].includes(retentionThreshold)) {
    throw new Error("Le seuil de rétention doit être fixé à 15% ou 30%.");
  }

  // Mise à jour du pourcentage de rétention pour le quartier
  const updatedStocks = await prisma.resourceStock.updateMany({
    where: { districtId: Number(districtId) },
    data: {
      retentionThreshold: retentionThreshold,
    },
  });

  return {
    success: true,
    message: `Le niveau de rétention a été mis à jour à ${retentionThreshold}% avec succès.`,
    currentThreshold: retentionThreshold,
    affectedResources: updatedStocks.count,
  };
}