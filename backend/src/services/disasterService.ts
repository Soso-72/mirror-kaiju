import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { emitDisasterLevelChanged } from "../socket/io.js";

export async function setDisasterLevel(level: number) {
  if (level < 1 || level > 5) {
    throw new AppError("INVALID_DISASTER_LEVEL", 422, "Le niveau de catastrophe doit être compris entre 1 et 5.");
  }

  const updatedState = await prisma.disasterState.upsert({
    where: { id: 1 },
    update: { level },
    create: { id: 1, level },
  });

  emitDisasterLevelChanged({
    level: updatedState.level,
    isRetentionOverrideActive: updatedState.isRetentionOverrideActive,
  });

  return updatedState;
}

export async function getDisasterLevel() {
  const currentState = await prisma.disasterState.findUnique({
    where: { id: 1 },
  });

  return currentState?.level ?? 1;
}