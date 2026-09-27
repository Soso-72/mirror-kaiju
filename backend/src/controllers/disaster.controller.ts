import { cw } from "../utils/controllerWrapper.js";
import { AppError } from "../errors/AppError.js";
import { setDisasterLevel, getDisasterLevel } from "../services/disasterService.js";

export const updateDisasterLevelController = cw(async (req: any, res: any) => {
  const level = Number(req.body?.level);

  if (isNaN(level) || level < 1 || level > 5) {
    throw new AppError("INVALID_LEVEL", 400, "Le niveau doit être un nombre valide entre 1 et 5.");
  }

  const updatedState = await setDisasterLevel(level);

  return res.status(200).json({
    success: true,
    response: updatedState,
  });
});

export const getDisasterLevelController = cw(async (req: any, res: any) => {
  const level = await getDisasterLevel();

  return res.status(200).json({
    success: true,
    response: { level },
  });
});