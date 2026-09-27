import { prisma } from "../config/prisma.js";
import { RuleValidationError } from "./checkPermissions.js";

export interface CheckRetentionParams {
  districtId: number;
  resourceTypeId: number;
  requestedQuantity: number;
  isRetentionOverrideActive: boolean; // vient de DisasterState, lu par checkSeverity
}

export async function checkRetention({
  districtId,
  resourceTypeId,
  requestedQuantity,
  isRetentionOverrideActive,
}: CheckRetentionParams): Promise<void> {
  const stock = await prisma.resourceStock.findUnique({
    where: { districtId_resourceTypeId: { districtId, resourceTypeId } },
    include: { district: true, resourceType: true },
  });

  if (!stock) {
    throw new RuleValidationError(
      "Aucun stock trouvé pour cette ressource dans ce quartier.",
      404,
      "NOT_FOUND"
    );
  }

  // Seuil effectif : 30% par défaut, 15% si le CD a activé l'override au niveau 5 (§4)
  const percentage = isRetentionOverrideActive ? 0.15 : 0.30;
  const effectiveThreshold = Math.ceil(stock.initialQuantity * percentage);

  const remaining = stock.quantity - requestedQuantity;

  if (remaining < effectiveThreshold) {
    throw new RuleValidationError(
      `Ce transfert ferait passer le stock de « ${stock.resourceType.name} » à ${stock.district.name} à ${remaining}, sous le seuil minimal de rétention (${effectiveThreshold}).`,
      422,
      "RETENTION_VIOLATION"
    );
  }
}