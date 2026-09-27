import { prisma } from "../../config/prisma.js";
import { RuleValidationError } from "../../rules/checkPermissions.js";

export interface CheckPriorityParams {
  destinationDistrictId: number;
  resourceTypeId: number;
  requestedQuantity: number;
  excludeDistrictId: number; // la source déjà sollicitée, à ne pas re-proposer
}

/**
 * Règle §6.2 : un quartier non adjacent ne peut fournir une ressource
 * que si AUCUN quartier adjacent à la destination n'a déjà le surplus
 * requis. Si un adjacent convient, le transit est refusé et le nom du
 * quartier concerné est indiqué dans le message.
 */
export async function checkPriority({
  destinationDistrictId,
  resourceTypeId,
  requestedQuantity,
  excludeDistrictId,
}: CheckPriorityParams): Promise<void> {
  const adjacencies = await prisma.districtAdjacency.findMany({
    where: {
      OR: [
        { districtId: destinationDistrictId, routeType: "adjacent" },
        { adjacentDistrictId: destinationDistrictId, routeType: "adjacent" },
      ],
    },
  });

  const neighborIds = new Set<number>();
  for (const a of adjacencies) {
    const neighborId =
      a.districtId === destinationDistrictId ? a.adjacentDistrictId : a.districtId;
    if (neighborId !== excludeDistrictId) {
      neighborIds.add(neighborId);
    }
  }

  for (const neighborId of neighborIds) {
    const stock = await prisma.resourceStock.findUnique({
      where: {
        districtId_resourceTypeId: { districtId: neighborId, resourceTypeId },
      },
      include: { district: true },
    });

    if (!stock) continue;

    const surplus = stock.quantity - stock.retentionThreshold;
    if (surplus >= requestedQuantity) {
      throw new RuleValidationError(
        `Le quartier adjacent « ${stock.district.name} » dispose déjà du surplus requis ; la sollicitation d'un quartier non adjacent est refusée.`,
        422,
        "PRIORITY_ORDER_VIOLATION"
      );
    }
  }
}