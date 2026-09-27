import { prisma } from "../config/prisma.js";

export function getUserPasswordByEMail(email: string) {
  return prisma.user.findUnique({
    where: {
      email: email,
    },
    select: {
      passwordHash: true,
      role: true,
      id: true,
      districtId: true,
    },
  });
}