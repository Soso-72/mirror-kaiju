import { prisma } from "../../config/prisma.js";
import { RuleValidationError } from "../../rules/checkPermissions.js";

const XENO_DISTRICT_NAME = "Xeno";

export interface CheckXenoPriorityParams {
  transitDistrictId: number;
  resourceTypeId: number;
  transitQuantity: number;
}

/**
 * Règle §6.5 : les demandes transitant par Xeno sont traitées après les
 * besoins propres de Xeno. Si le transit ferait passer le stock de Xeno
 * sous son propre seuil de rétention, la demande est refusée.
 * No-op si le quartier de transit n'est pas Xeno.
 */
export async function checkXenoPriority({
  transitDistrictId,
  resourceTypeId,
  transitQuantity,
}: CheckXenoPriorityParams): Promise<void> {
  const transitDistrict = await prisma.district.findUnique({
    where: { id: transitDistrictId },
  });

  if (!transitDistrict || transitDistrict.name !== XENO_DISTRICT_NAME) {
    return; // le transit ne passe pas par Xeno, règle non applicable
  }

  const stock = await prisma.resourceStock.findUnique({
    where: {
      districtId_resourceTypeId: { districtId: transitDistrictId, resourceTypeId },
    },
  });

  if (!stock) {
    throw new RuleValidationError(
      "Aucun stock trouvé pour cette ressource à Xeno.",
      404,
      "NOT_FOUND"
    );
  }

  const remaining = stock.quantity - transitQuantity;
  if (remaining < stock.retentionThreshold) {
    throw new RuleValidationError(
      "Cette demande transitant par Xeno est refusée : elle ferait passer le stock de Xeno sous son propre seuil de rétention, et les besoins propres de Xeno sont traités en priorité.",
      422,
      "XENO_PRIORITY_VIOLATION"
    );
  }
}