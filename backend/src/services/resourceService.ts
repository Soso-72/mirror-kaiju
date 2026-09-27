import { prisma } from "../config/prisma.js";
import { checkPermissions, RuleValidationError } from "../rules/checkPermissions.js";
import { checkSeverity } from "../rules/checkSeverity.js";
import { AppError } from "../errors/AppError.js";
import { getDisasterLevel } from "./disasterService.js";
import { createTransferRequest, approveTransferRequest } from "./transferService.js";
import type { OfficerRole } from "@prisma/client";

const DISTRICT_CODE_MAP: Record<string, string> = {
  Apex: "A",
  Echo: "E",
  Warden: "W",
  Xeno: "X",
  Zion: "Z",
};

const RESOURCE_LABEL_MAP: Record<string, string> = {
  "Medical personnel": "Personnel médical",
  "Rescue teams": "Équipes de secours",
  "Transport vehicles": "Véhicules de transport",
  "Emergency shelters": "Abris d'urgence",
  "Food & water supplies": "Vivres et eau",
  "Communication equipment": "Équipement de communication",
  "Power generators": "Générateurs",
  "Engineering crews": "Équipes d'ingénierie",
  "Security units": "Unités de sécurité",
  "Hazmat equipment": "Équipement hazmat",
};

interface ReservationParams {
  districtId: number;
  resourceTypeId: number;
  quantity: number;
  user: { id: number; role: OfficerRole; districtId: number | null };
}

export async function requisitionResource({
  sourceDistrictId,
  destinationDistrictId,
  resourceTypeId,
  quantity,
  user,
}: any) {
  const disasterLevel = await getDisasterLevel();
  const userId = user.id ?? user.userId;

  // 1. Vérification des permissions (CD uniquement & Niveau 4+)
  checkPermissions({
    userRole: user.role,
    userDistrictId: user.districtId,
    targetDistrictId: Number(sourceDistrictId),
    disasterLevel,
    action: "REQUISITION",
  });

  const sourceId = Number(sourceDistrictId);
  const destId = Number(destinationDistrictId ?? user.districtId);
  const resTypeId = Number(resourceTypeId);
  const qty = Number(quantity);

  // 2. Mouvement de stock direct + création de la ligne de transfert
  return await prisma.$transaction(async (tx) => {
    // Décrémenter la source
    await tx.resourceStock.update({
      where: {
        districtId_resourceTypeId: {
          districtId: sourceId,
          resourceTypeId: resTypeId,
        },
      },
      data: { quantity: { decrement: qty } },
    });

    // Incrémenter la destination
    await tx.resourceStock.upsert({
      where: {
        districtId_resourceTypeId: {
          districtId: destId,
          resourceTypeId: resTypeId,
        },
      },
      update: { quantity: { increment: qty } },
      create: {
        districtId: destId,
        resourceTypeId: resTypeId,
        quantity: qty,
        initialQuantity: qty,
        retentionThreshold: 0,
      },
    });

    // Enregistrer le transfert comme directement approuvé
    return await tx.transfer.create({
      data: {
        quantity: qty,
        status: "approved",
        sourceDistrictId: sourceId,
        destinationDistrictId: destId,
        resourceTypeId: resTypeId,
        requestedById: userId,
      },
    });
  });
}

export async function reserveResource({
  districtId,
  resourceTypeId,
  quantity,
  user,
}: ReservationParams) {
  if (quantity <= 0) {
    throw new AppError("VALIDATION_ERROR", 400, "La quantité doit être positive.");
  }

  const { disasterLevel } = await checkSeverity({ requestedQuantity: quantity });

  try {
    checkPermissions({
      userRole: user.role,
      userDistrictId: user.districtId,
      targetDistrictId: districtId,
      disasterLevel,
      action: "RESERVE_LOCAL",
    });
  } catch (error) {
    if (error instanceof RuleValidationError) {
      throw new AppError(error.code, error.statusCode, error.message);
    }
    throw error;
  }

  const stock = await prisma.resourceStock.findUnique({
    where: { districtId_resourceTypeId: { districtId, resourceTypeId } },
    include: { district: true, resourceType: true },
  });

  if (!stock) {
    throw new AppError("NOT_FOUND", 404, "Aucun stock trouvé pour cette ressource dans ce quartier.");
  }

  const remaining = stock.quantity - quantity;
  if (remaining < stock.retentionThreshold) {
    throw new AppError(
      "RETENTION_VIOLATION",
      422,
      `Cette réservation ferait passer le stock de « ${stock.resourceType.name} » à ${stock.district.name} sous le seuil minimal de rétention (${stock.retentionThreshold}).`
    );
  }

  return prisma.resourceStock.update({
    where: { id: stock.id },
    data: { quantity: { decrement: quantity } },
  });
}


export async function unreserveResource({
  districtId,
  resourceTypeId,
  quantity,
  user,
}: ReservationParams) {
  if (quantity <= 0) {
    throw new AppError("VALIDATION_ERROR", 400, "La quantité doit être positive.");
  }

  const { disasterLevel } = await checkSeverity({ requestedQuantity: quantity });

  try {
    checkPermissions({
      userRole: user.role,
      userDistrictId: user.districtId,
      targetDistrictId: districtId,
      disasterLevel,
      action: "RESERVE_LOCAL",
    });
  } catch (error) {
    if (error instanceof RuleValidationError) {
      throw new AppError(error.code, error.statusCode, error.message);
    }
    throw error;
  }

  const stock = await prisma.resourceStock.findUnique({
    where: { districtId_resourceTypeId: { districtId, resourceTypeId } },
  });

  if (!stock) {
    throw new AppError("NOT_FOUND", 404, "Aucun stock trouvé pour cette ressource dans ce quartier.");
  }

  const restored = stock.quantity + quantity;
  if (restored > stock.initialQuantity) {
    throw new AppError(
      "VALIDATION_ERROR",
      422,
      `Impossible de restituer plus que le stock initial (${stock.initialQuantity}).`
    );
  }

  return prisma.resourceStock.update({
    where: { id: stock.id },
    data: { quantity: { increment: quantity } },
  });
}

export async function getDistrictResourcesForMap() {
  const rows = await prisma.resourceStock.findMany({
    include: {
      district: true,
      resourceType: true,
    },
    orderBy: [{ districtId: "asc" }, { resourceTypeId: "asc" }],
  });

  const byDistrict = new Map<string, { id: number; code: string; name: string; resources: { id: number; name: string; backendName: string; quantity: number; retentionMin: number }[] }>();

  for (const row of rows) {
    const districtCode = DISTRICT_CODE_MAP[row.district.name];
    if (!districtCode) continue;

    const key = row.district.name;
    const districtEntry = byDistrict.get(key) ?? {
      id: row.district.id,
      code: districtCode,
      name: row.district.name,
      resources: [],
    };

    districtEntry.resources.push({
      id: row.resourceType.id,
      name: RESOURCE_LABEL_MAP[row.resourceType.name] ?? row.resourceType.name,
      backendName: row.resourceType.name,
      quantity: row.quantity,
      retentionMin: row.retentionThreshold,
    });

    byDistrict.set(key, districtEntry);
  }

  return Array.from(byDistrict.values()).sort((a, b) => {
    const order = ["A", "W", "X", "E", "Z"];
    return order.indexOf(a.code) - order.indexOf(b.code);
  });
}