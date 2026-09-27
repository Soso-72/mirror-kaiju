import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface DisasterStateResponse {
  id: number;
  level: number;
  isRetentionOverrideActive: boolean;
  updatedAt: string;
}

/**
 * Récupère le niveau de catastrophe actuel
 */
export async function getDisasterLevel(): Promise<number> {
  try {
    const response = await api.get("/disaster-level");
    return response.data?.response?.level ?? 1;
  } catch (error) {
    console.error("Erreur lors de la récupération du niveau d'alerte:", error);
    return 1;
  }
}

/**
 * Met à jour le niveau de catastrophe (1 à 5)
 */
export async function updateDisasterLevel(level: number) {
  try {
    const response = await api.put("/disaster-level", { level: Number(level) });
    return {
      success: true,
      data: response.data.response as DisasterStateResponse,
    };
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour du niveau d'alerte:", error);
    return {
      success: false,
      message: error.response?.data?.error?.message || "Échec de la mise à jour du niveau d'alerte",
    };
  }
}
