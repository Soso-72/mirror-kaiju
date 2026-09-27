import { OfficerRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { validateTransfer, RuleValidationError } from "../rules/checker.js";

type RouteType = "adjacent" | "maritime";

export async function getAvailableRoutes(
  sourceDistrictId: number,
  destinationDistrictId: number
): Promise<RouteType[]> {
  const routes = await prisma.districtAdjacency.findMany({
    where: {
      OR: [
        { districtId: sourceDistrictId, adjacentDistrictId: destinationDistrictId },
        { districtId: destinationDistrictId, adjacentDistrictId: sourceDistrictId },
      ],
    },
  });

  return [...new Set(routes.map((route) => route.routeType as RouteType))];
}

export async function isAdjacent(
  sourceDistrictId: number,
  destinationDistrictId: number,
  routeType?: RouteType
): Promise<boolean> {
  if (sourceDistrictId === destinationDistrictId) return false;

  const routes = await getAvailableRoutes(sourceDistrictId, destinationDistrictId);

  if (routeType) {
    return routes.includes(routeType);
  }

  return routes.length > 0;
}

export async function createTransferRequest(
  input: {
    sourceDistrictId?: number;
    destinationDistrictId?: number;
    resourceTypeId?: number;
    sourceDistrictName?: string;
    destinationDistrictName?: string;
    resourceTypeName?: string;
    quantity: number;
    requestedById?: number;
  },
  user: { id: number; role: OfficerRole; districtId: number | null }
) {
  // 1. Résolution des IDs si des noms sont transmis
  const sourceDistrictId =
    input.sourceDistrictId ??
    (input.sourceDistrictName
      ? (await prisma.district.findUnique({ where: { name: input.sourceDistrictName } }))?.id
      : undefined);

  const destinationDistrictId =
    input.destinationDistrictId ??
    (input.destinationDistrictName
      ? (await prisma.district.findUnique({ where: { name: input.destinationDistrictName } }))?.id
      : undefined);

  const resourceTypeId =
    input.resourceTypeId ??
    (input.resourceTypeName
      ? (await prisma.resourceType.findUnique({ where: { name: input.resourceTypeName } }))?.id
      : undefined);

  if (!sourceDistrictId || !destinationDistrictId) {
    throw new AppError("NOT_FOUND", 404, "Un district sélectionné est introuvable.");
  }

  if (!resourceTypeId) {
    throw new AppError("NOT_FOUND", 404, "Le type de ressource sélectionné est introuvable.");
  }

  if (sourceDistrictId === destinationDistrictId) {
    throw new AppError(
      "VALIDATION_ERROR",
      400,
      "La source et la destination doivent être différentes."
    );
  }

  // 2. Résolution de l'ID utilisateur
  const userId = input.requestedById ?? user.id;

  if (!userId) {
    throw new AppError("UNAUTHORIZED", 401, "Identifiant d'utilisateur manquant pour la demande.");
  }

  // 3. Validation métier — le serveur décide seul de la route
  //    (adjacent direct > transit > maritime), le client ne la choisit plus.
  let route;
  try {
    const result = await validateTransfer({
      user,
      sourceDistrictId,
      destinationDistrictId,
      resourceTypeId,
      requestedQuantity: input.quantity,
      action: "REQUEST_ADJACENT_TRANSFER",
    });
    route = result.route;
  } catch (error) {
    if (error instanceof RuleValidationError) {
      throw new AppError(error.code, error.statusCode, error.message);
    }
    throw error;
  }

  // 4. Création de la demande de transfert (forme "unchecked", IDs scalaires
  //    directs — évite de mélanger connect{} et champs scalaires dans le
  //    même objet, ce que Prisma refuse).
  return prisma.transfer.create({
    data: {
      quantity: input.quantity,
      status: "pending",
      sourceDistrictId,
      destinationDistrictId,
      resourceTypeId,
      requestedById: userId,
      transitDistrictId: route.type === "transit" ? route.transitDistrictId : null,
      isMaritime: route.type === "maritime",
    },
  });
}

export async function getTransferById(id: number) {
  const transfer = await prisma.transfer.findUnique({ where: { id } });

  if (!transfer) {
    throw new AppError("NOT_FOUND", 404, "Demande de transfert non trouvée.");
  }

  return transfer;
}

export async function approveTransferRequest(id: number, approverId?: number) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({ where: { id } });

    if (!transfer) {
      throw new AppError("NOT_FOUND", 404, "Demande de transfert non trouvée.");
    }
    if (transfer.status !== "pending") {
      throw new AppError("ALREADY_PROCESSED", 409, "Cette demande a déjà été traitée.");
    }

    // --- PROBLÈME 2 : GESTION DU TRANSIT ---
    // Si c'est un transfert avec transit, on s'assure qu'on valide le passage.
    // Le stock du transitDistrictId n'est JAMAIS impacté.
    // Seuls le stock Source (décrémenté) et Destination (incrémenté) évoluent.

    // 1. Vérification et mise à jour du stock de la Source
    const stock = await tx.resourceStock.findUnique({
      where: {
        districtId_resourceTypeId: {
          districtId: transfer.sourceDistrictId,
          resourceTypeId: transfer.resourceTypeId,
        },
      },
    });

    if (!stock) {
      throw new AppError("NOT_FOUND", 404, "Stock source introuvable.");
    }

    const remaining = stock.quantity - transfer.quantity;
    if (remaining < stock.retentionThreshold) {
      throw new AppError(
        "RETENTION_VIOLATION",
        422,
        `Ce transfert ferait passer le stock source sous le seuil minimal de rétention (${stock.retentionThreshold}).`
      );
    }

    // 2. Décrémenter la Source
    await tx.resourceStock.update({
      where: { id: stock.id },
      data: { quantity: { decrement: transfer.quantity } },
    });

    // 3. Incrémenter la Destination (Le district de transit est complètement ignoré ici)
    await tx.resourceStock.upsert({
      where: {
        districtId_resourceTypeId: {
          districtId: transfer.destinationDistrictId,
          resourceTypeId: transfer.resourceTypeId,
        },
      },
      update: {
        quantity: { increment: transfer.quantity },
      },
      create: {
        districtId: transfer.destinationDistrictId,
        resourceTypeId: transfer.resourceTypeId,
        quantity: transfer.quantity,
        initialQuantity: transfer.quantity,
        retentionThreshold: 0,
      },
    });

    // 4. Passer la demande au statut "approved"
    return tx.transfer.update({
      where: { id },
      data: { status: "approved" },
    });
  });
}

export async function rejectTransferRequest(id: number, rejectorId?: number, reason?: string) {
  const transfer = await prisma.transfer.findUnique({ where: { id } });

  if (!transfer) {
    throw new AppError("NOT_FOUND", 404, "Demande de transfert non trouvée.");
  }
  if (transfer.status !== "pending") {
    throw new AppError("ALREADY_PROCESSED", 409, "Cette demande a déjà été traitée.");
  }

  return prisma.transfer.update({
    where: { id },
    data: { status: "rejected", rejectionReason: reason ?? null },
  });
}

export async function getAllTransfers(filters?: {
  status?: "pending" | "approved" | "rejected" | "completed";
}) {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  return prisma.transfer.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    include: {
      resourceType: { select: { id: true, name: true } },
      sourceDistrict: { select: { id: true, name: true } },
      destinationDistrict: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, email: true, role: true } },
    },
  });
}