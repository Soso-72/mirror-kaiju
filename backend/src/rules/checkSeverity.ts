import { prisma } from "../config/prisma.js";

interface CheckSeverityParams {
  requestedQuantity?: number;
}

/**
 * Lit l'état actuel de la catastrophe globale (niveau + override de rétention).
 * Ne contient AUCUNE règle de permission — celles-ci sont gérées exclusivement
 * par checkPermissions (§7), pour éviter toute contradiction entre modules.
 */
export async function checkSeverity(
  _params?: CheckSeverityParams
): Promise<{ disasterLevel: number; isRetentionOverrideActive: boolean }> {
  const disasterState = await prisma.disasterState.findUnique({
    where: { id: 1 },
  });

  if (!disasterState) {
    return { disasterLevel: 1, isRetentionOverrideActive: false };
  }

  return {
    disasterLevel: disasterState.level,
    isRetentionOverrideActive: disasterState.isRetentionOverrideActive,
  };
}