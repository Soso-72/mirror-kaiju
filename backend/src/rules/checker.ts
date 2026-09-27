import { OfficerRole } from "@prisma/client";
import { checkXenoPriority } from "./rulesTransaction/checkXenoPriority.js";
import { isAdjacent } from "../services/transferService.js";
import { checkSeverity } from "./checkSeverity.js";
import { checkPermissions, RuleValidationError } from "./checkPermissions.js";
import { checkAdjacency } from "./checkAdjacency.js";
import { checkPriority } from "./rulesTransaction/checkPriority.js";
import { checkSurplus } from "./rulesTransaction/checkSurplus.js";
import { checkRetention } from "./checkRetention.js";
import type { KaijuAction } from "./checkPermissions.js";

// Type de route interne pour garder la compatibilité
export type ResolvedRoute =
  | { type: "direct"; transitDistrictId: null; isMaritime: false }
  | { type: "transit"; transitDistrictId: number; transitDistrictName: string; isMaritime: false }
  | { type: "maritime"; transitDistrictId: null; isMaritime: true };

export interface ValidateTransferParams {
  user: {
    id: number;
    userId?: number;
    role: OfficerRole;
    districtId: number | null;
  };
  sourceDistrictId: number;
  destinationDistrictId: number;
  resourceTypeId: number;
  requestedQuantity: number;
  transitDistrictId?: number | null;
  isMaritime?: boolean;
  action?: KaijuAction;
}

export interface ValidateTransferResult {
  route: ResolvedRoute;
}

/**
 * Orchestrateur global de validation d'un transfert de ressources Kaiju.
 */
export async function validateTransfer(
  params: ValidateTransferParams
): Promise<ValidateTransferResult> {
  const {
    user,
    sourceDistrictId,
    destinationDistrictId,
    resourceTypeId,
    requestedQuantity,
    transitDistrictId,
    isMaritime = false,
    action = "REQUEST_ADJACENT_TRANSFER",
  } = params;

  // 1. Niveau de catastrophe global (§7)
  const { disasterLevel, isRetentionOverrideActive } = await checkSeverity({
    requestedQuantity,
  });

  // 2. Adjacence entre le quartier de l'utilisateur et la destination
  const isTargetAdjacentToUser =
    user.districtId != null
      ? await isAdjacent(user.districtId, destinationDistrictId)
      : false;

  // 3. Permissions générales : rôle, portée, niveau requis pour l'action (§5, §7, §10)
  checkPermissions({
    userRole: user.role,
    userDistrictId: user.districtId,
    targetDistrictId: destinationDistrictId,
    isTargetAdjacentToUser,
    disasterLevel,
    action,
  });

  // 4. Détermination de la route sans bloquer si non trouvée
  let route: ResolvedRoute;
  
  if (transitDistrictId) {
    route = {
      type: "transit",
      transitDistrictId: Number(transitDistrictId),
      transitDistrictName: "",
      isMaritime: false,
    };
  } else if (isMaritime) {
    route = { type: "maritime", transitDistrictId: null, isMaritime: true };
  } else {
    // Route directe par défaut
    route = { type: "direct", transitDistrictId: null, isMaritime: false };
  }

  // 5. Contrôle d'adjacence géométrique
  // En cas de REQUISITION d'urgence (Niveau 4+), on contourne le check d'adjacence
  if (action !== "REQUISITION") {
    await checkAdjacency({
      sourceDistrictId,
      destinationDistrictId,
      transitDistrictId: route.type === "transit" ? route.transitDistrictId : null,
      isMaritime: route.type === "maritime",
    });
  }

  // 6. Si la route bascule en transit : VÉRIFIER LES PERMISSIONS ET PRIORITÉS DE TRANSIT
  if (route.type === "transit") {
    checkPermissions({
      userRole: user.role,
      userDistrictId: user.districtId,
      disasterLevel,
      action: "ORGANIZE_TRANSIT",
    });

    await checkPriority({
      destinationDistrictId,
      resourceTypeId,
      requestedQuantity,
      excludeDistrictId: sourceDistrictId,
    });

    await checkXenoPriority({
      transitDistrictId: route.transitDistrictId,
      resourceTypeId,
      transitQuantity: requestedQuantity,
    });
  }

  // 7. Vérification du surplus disponible sur la source (§6.2)
  await checkSurplus({
    districtId: sourceDistrictId,
    resourceTypeId,
    requestedQuantity,
  });

  // 8. Seuil de rétention minimal du quartier source (§4, §10)
  await checkRetention({
    districtId: sourceDistrictId,
    resourceTypeId,
    requestedQuantity,
    isRetentionOverrideActive,
  });

  return { route };
}

// Re-export de la classe d'erreur pour les contrôleurs
export { RuleValidationError } from "./checkPermissions.js";