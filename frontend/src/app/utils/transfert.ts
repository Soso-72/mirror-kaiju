import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔑 Ajout de l'intercepteur pour injecter automatiquement le Token JWT
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token"); // Vérifie que ta clé de stockage s'appelle "token"

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export async function getCreatedTransferRequests() {
  try {
    const response = await api.get("/transfer/created");
    return response.data;
  } catch (error) {
    console.error("Error fetching created transfer requests:", error);
    throw error;
  }
}

export async function createTransferRequest(payload: {
  sourceDistrictName?: string;
  destinationDistrictName?: string;
  resourceTypeName?: string;
  sourceDistrictId?: number;
  destinationDistrictId?: number;
  resourceTypeId?: number;
  quantity: number;
  requestedById: number;
  routeType?: "adjacent" | "maritime";
}) {
  try {
    const response = await api.post("/transfer/create", payload);
    return response.data;
  } catch (error) {
    console.error("Error creating transfer request:", error);
    throw error;
  }
}

export async function getReceivedTransferRequests() {
  try {
    const response = await api.get("/transfer/received");
    return response.data;
  } catch (error) {
    console.error("Error fetching received transfer requests:", error);
    throw error;
  }
}

export async function approveTransferRequest(transferId: number) {
  try {
    const response = await api.post(`/transfer/${transferId}/approve`);
    return response.data;
  } catch (error) {
    console.error(`Error approving transfer request with ID ${transferId}:`, error);
    throw error;
  }
}

export async function rejectTransferRequest(transferId: number, reason: string) {
  try {
    const response = await api.post(`/transfer/${transferId}/reject`, { reason });
    return response.data;
  } catch (error) {
    console.error(`Error rejecting transfer request with ID ${transferId}:`, error);
    throw error;
  }
}

export async function getAvailableRoutes(sourceDistrictId: number, destinationDistrictId: number) {
  try {
    const response = await api.get("/transfer/routes", {
      params: { sourceDistrictId, destinationDistrictId },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching available routes:", error);
    throw error;
  }
}

export async function getAllTransfers(status?: "pending" | "approved" | "rejected" | "completed") {
  try {
    const response = await api.get("/transfer/all", {
      params: status ? { status } : undefined,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching all transfer requests:", error);
    throw error;
  }
}