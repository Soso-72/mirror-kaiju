import { prisma } from "../../config/prisma.js";
import { RuleValidationError } from "../../rules/checkPermissions.js";

export interface CheckSurplusParams {
  districtId: number;
  resourceTypeId: number;
  requestedQuantity: number;
}

/**
 * Vérifie que le quartier sollicité dispose d'assez de surplus
 * (quantité actuelle - seuil de rétention) pour honorer la quantité demandée.
 * Ne modifie rien, se contente de valider et de renvoyer le surplus.
 */
export async function checkSurplus({
  districtId,
  resourceTypeId,
  requestedQuantity,
}: CheckSurplusParams): Promise<number> {
  const stock = await prisma.resourceStock.findUnique({
    where: {
      districtId_resourceTypeId: { districtId, resourceTypeId },
    },
    include: { district: true, resourceType: true },
  });

  if (!stock) {
    throw new RuleValidationError(
      "Aucun stock trouvé pour cette ressource dans ce quartier.",
      404,
      "NOT_FOUND"
    );
  }

  const surplus = stock.quantity - stock.retentionThreshold;

  if (surplus < requestedQuantity) {
    throw new RuleValidationError(
      `Le quartier « ${stock.district.name} » ne dispose pas d'un surplus suffisant de ${stock.resourceType.name} (${surplus} disponible, ${requestedQuantity} demandé).`,
      422,
      "INSUFFICIENT_SURPLUS"
    );
  }

  return surplus;
}