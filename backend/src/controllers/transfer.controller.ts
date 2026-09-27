import type { Request, Response } from "express";
import { cw } from "../utils/controllerWrapper.js";
import { emitStockUpdated } from "../socket/io.js";
import {
  getTransferById,
  approveTransferRequest,
  rejectTransferRequest,
  createTransferRequest,
  getAllTransfers,
} from "../services/transferService.js";
import { validateTransfer } from "../rules/checker.js";
import { OfficerRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: number;
  userId?: number;
  role: OfficerRole;
  districtId: number | null;
}

// Simplifié : on étend juste Request avec un champ `user` obligatoire,
// sans jouer avec les 4 paramètres génériques (source des erreurs).
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface CreateTransferBody {
  sourceDistrictId?: number;
  destinationDistrictId?: number;
  resourceTypeId?: number;
  sourceDistrictName?: string;
  destinationDistrictName?: string;
  resourceTypeName?: string;
  quantity: number;
  requestedQuantity?: number;
  transitDistrictId?: number | null;
  routeType?: "adjacent" | "maritime";
}

export interface RejectTransferBody {
  reason?: string;
}

function getUserId(user: AuthenticatedUser | undefined): number {
  const resolvedId = user?.id ?? user?.userId ?? (user as any)?.sub;
  return Number(resolvedId);
}

export const createTransfer = cw(async (req: AuthenticatedRequest, res: Response) => {
  const {
    sourceDistrictId,
    destinationDistrictId,
    resourceTypeId,
    quantity,
    requestedQuantity,
  } = req.body as CreateTransferBody;

  const actualQuantity = Number(requestedQuantity ?? quantity);
  const userId = getUserId(req.user);

  const userPayload = { ...req.user, id: userId };

  const { route } = await validateTransfer({
    user: userPayload,
    sourceDistrictId: Number(sourceDistrictId),
    destinationDistrictId: Number(destinationDistrictId),
    resourceTypeId: Number(resourceTypeId),
    requestedQuantity: actualQuantity,
  });

  const transferData = {
    ...req.body,
    sourceDistrictId: Number(sourceDistrictId),
    destinationDistrictId: Number(destinationDistrictId),
    resourceTypeId: Number(resourceTypeId),
    requestedById: userId,
    quantity: actualQuantity,
    transitDistrictId: route.type === "transit" ? route.transitDistrictId : null,
    ...(route.type === "maritime" && { routeType: "maritime" as const }),
  };

  const rawTransfer = await createTransferRequest(transferData, userPayload);
  const fullTransfer = await getTransferById(rawTransfer.id);

  return res.status(201).json({
    success: true,
    routeType: route.type,
    response: fullTransfer,
  });
});

export const getTransfers = cw(async (req: AuthenticatedRequest, res: Response) => {
  const transfers = await getAllTransfers();
  return res.status(200).json({ success: true, response: transfers });
});

export const getTransfer = cw(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const transfer = await getTransferById(Number(id));
  return res.status(200).json({ success: true, response: transfer });
});

export const approveTransfer = cw(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const approverId = getUserId(req.user);

  const result = await approveTransferRequest(Number(id), approverId);

  emitStockUpdated({
    districtId: result.sourceDistrictId,
    resourceTypeId: result.resourceTypeId,
    quantity: -result.quantity,
  });
  emitStockUpdated({
    districtId: result.destinationDistrictId,
    resourceTypeId: result.resourceTypeId,
    quantity: result.quantity,
  });

  return res.status(200).json({ success: true, response: result });
});

export const rejectTransfer = cw(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const rejectorId = getUserId(req.user);
  const reason = (req.body as RejectTransferBody)?.reason;

  const updatedTransfer = await rejectTransferRequest(Number(id), rejectorId, reason);

  return res.status(200).json({ success: true, response: updatedTransfer });
});

export const getRoutes = cw(async (req: AuthenticatedRequest, res: Response) => {
  const { sourceDistrictId, destinationDistrictId, resourceTypeId, quantity } = req.query;

  const userId = getUserId(req.user);

  const validation = await validateTransfer({
    user: { ...req.user, id: userId },
    sourceDistrictId: Number(sourceDistrictId),
    destinationDistrictId: Number(destinationDistrictId),
    resourceTypeId: Number(resourceTypeId),
    requestedQuantity: Number(quantity),
  });

  return res.status(200).json({ success: true, response: validation.route });
});