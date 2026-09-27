import type { Request, Response } from "express";
import { updateRetentionLevel } from "../services/retentionService.js";

export async function updateRetentionController(req: Request, res: Response) {
  try {
    const { districtId, alertLevel, retentionThreshold } = req.body;
    const userRole = (req as any).user?.role;

    if (!districtId || retentionThreshold === undefined) {
      return res.status(400).json({
        message: "L'identifiant du quartier (districtId) et le seuil (retentionThreshold) sont requis.",
      });
    }

    const result = await updateRetentionLevel(
      Number(districtId),
      userRole,
      Number(alertLevel),
      Number(retentionThreshold)
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(403).json({
      message: error.message || "Erreur lors du changement du seuil de rétention.",
    });
  }
}