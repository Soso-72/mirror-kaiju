import { prisma } from "../config/prisma.js";

export async function getProfil(userId: number) {
    return prisma.user.findUnique({
        where: {
            id: userId,
        }, select: {
            email: true,
            role: true,
            id: true,
        }
    });
}