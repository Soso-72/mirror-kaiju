import { OfficerRole } from "@prisma/client";

// Classe d'erreur personnalisée pour correspondre au format exigé
export class RuleValidationError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    Object.setPrototypeOf(this, RuleValidationError.prototype);
  }
}

// Actions possibles dans le système d'après la matrice du §7
export type KaijuAction =
  | "VIEW_RESOURCES"
  | "RESERVE_LOCAL"
  | "REQUEST_ADJACENT_TRANSFER"
  | "ORGANIZE_TRANSIT"
  | "REQUISITION"
  | "OVERRIDE_RETENTION";

interface CheckPermissionsParams {
  userRole: OfficerRole;
  userDistrictId?: number | null;
  targetDistrictId?: number;
  isTargetAdjacentToUser?: boolean;
  disasterLevel: number;
  action: KaijuAction;
}

/**
 * Vérifie le Rôle, le Périmètre (Scope) et le Niveau de Catastrophe
 * conformément à la section 5, 7 et au tableau d'erreurs de la section 10.
 */
export function checkPermissions({
  userRole,
  userDistrictId,
  targetDistrictId,
  isTargetAdjacentToUser,
  disasterLevel,
  action,
}: CheckPermissionsParams): void {

  // 1. Consultation des ressources : Permise à TOUS quel que soit le niveau
  if (action === "VIEW_RESOURCES") {
    return;
  }

  // 2. Vérification du niveau de catastrophe autorisé pour l'action (§7)
  switch (action) {

    case "RESERVE_LOCAL": {
      if (disasterLevel < 2) {
        throw new RuleValidationError(
          `L'action 'RESERVE_LOCAL' n'est pas autorisée au niveau ${disasterLevel} (Watch).`,
          403,
          "LEVEL_INSUFFICIENT"
        );
      }

      if (userRole !== OfficerRole.QC) {
        throw new RuleValidationError(
          `Le rôle ${userRole} n'est pas autorisé à effectuer une réservation locale.`,
          403,
          "PERMISSION_DENIED"
        );
      }

      if (targetDistrictId && userDistrictId !== targetDistrictId) {
        throw new RuleValidationError(
          "Au niveau Alert, la réservation n'est possible qu'à l'intérieur de son propre quartier.",
          403,
          "SCOPE_VIOLATION"
        );
      }
      break;
    }

    case "REQUEST_ADJACENT_TRANSFER": {
      // Niveau 3 à 5
      if (disasterLevel < 3) {
        throw new RuleValidationError(
          `L'action 'request_adjacent_transfer' n'est pas autorisée au niveau ${disasterLevel}.`,
          403,
          "LEVEL_INSUFFICIENT"
        );
      }

      // Rôles autorisés (§7) : Niveau 3 = QC seulement ; Niveau 4 = QC, LC ; Niveau 5 = Tous
      if (disasterLevel === 3 && userRole !== OfficerRole.QC) {
        throw new RuleValidationError(
          `Le rôle ${userRole} n'est pas autorisé à demander un transfert au niveau 3.`,
          403,
          "PERMISSION_DENIED"
        );
      }

      if (disasterLevel === 4 && userRole !== OfficerRole.QC && userRole !== OfficerRole.LC) {
        throw new RuleValidationError(
          `Le rôle ${userRole} n'est pas autorisé à demander un transfert au niveau 4.`,
          403,
          "PERMISSION_DENIED"
        );
      }

      // --- AUTORISATION DU QC POUR TOUTE DEMANDE ---
      // La restriction SCOPE_VIOLATION est retirée afin de permettre au QC
      // d'émettre des demandes de transfert vers n'importe quelle destination.
      break;
    }

    case "ORGANIZE_TRANSIT": {
      if (disasterLevel < 4) {
        throw new RuleValidationError(
          `L'organisation de transits n'est pas autorisée au niveau ${disasterLevel}.`,
          403,
          "LEVEL_INSUFFICIENT"
        );
      }

      if (disasterLevel === 4 && userRole !== OfficerRole.LC) {
        throw new RuleValidationError(
          `Le rôle ${userRole} n'est pas autorisé à organiser une chaîne de transit au niveau 4.`,
          403,
          "PERMISSION_DENIED"
        );
      }

      if (disasterLevel === 5 && userRole !== OfficerRole.LC && userRole !== OfficerRole.CD) {
        throw new RuleValidationError(
          `Le rôle ${userRole} n'est pas autorisé à organiser un transit.`,
          403,
          "PERMISSION_DENIED"
        );
      }
      break;
    }

    case "REQUISITION": {
      if (disasterLevel < 4) {
        throw new RuleValidationError(
          `La réquisition de ressources n'est pas autorisée au niveau ${disasterLevel}.`,
          403,
          "LEVEL_INSUFFICIENT"
        );
      }

      if (userRole !== OfficerRole.CD) {
        throw new RuleValidationError(
          `Le rôle ${userRole} n'est pas autorisé à effectuer l'action requisition.`,
          403,
          "PERMISSION_DENIED"
        );
      }
      break;
    }

    case "OVERRIDE_RETENTION": {
      if (userRole !== OfficerRole.CD || disasterLevel !== 5) {
        throw new RuleValidationError(
          "Seul le City Director peut abaisser le seuil de rétention, et uniquement au niveau 5.",
          403,
          "RETENTION_OVERRIDE_FORBIDDEN"
        );
      }
      break;
    }

    default:
      throw new RuleValidationError(
        "Action non reconnue par le système de permissions.",
        400,
        "VALIDATION_ERROR"
      );
  }
}