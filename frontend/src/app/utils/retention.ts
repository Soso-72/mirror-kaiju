import { api } from "./transfert";

export async function updateRetentionThreshold(payload: {
  districtId: number;
  alertLevel: number;
  retentionThreshold: number;
}) {
  try {
    const response = await api.post("/retention/update", payload);
    return response.data;
  } catch (error) {
    console.error("Error updating retention threshold:", error);
    throw error;
  }
}