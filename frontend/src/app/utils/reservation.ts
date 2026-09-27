import { AxiosError } from "axios";
import { api, getStoredToken, setAuthToken } from "./user";

export interface Reservation {
  id: number | string;
  districtCode: string;
  districtName?: string;
  resourceName: string;
  quantity: number;
  createdAt: string;
}

// Émis après chaque réservation réussie pour que le flux (FeedReserve) se recharge
export const RESERVATIONS_CHANGED = "reservations:changed";

// Le token n'est posé sur l'instance axios qu'après getUserProfile(), on le réapplique ici
function applyToken() {
  setAuthToken(getStoredToken());
}

export async function getReservations(): Promise<Reservation[]> {
  applyToken();
  try {
    const response = await api.get("/reservations");
    return response.data.response ?? response.data;
  } catch (error) {
    const err = error as AxiosError<{ message?: string }>;
    throw new Error(err.response?.data?.message || "Impossible de charger les réservations");
  }
}

export async function createReservation(input: {
  districtCode: string;
  resourceName: string;
  quantity: number;
}): Promise<{ success: boolean; message?: string }> {
  applyToken();
  try {
    await api.post("/reservation", input);
    window.dispatchEvent(new Event(RESERVATIONS_CHANGED));
    return { success: true };
  } catch (error) {
    const err = error as AxiosError<{ message?: string; error?: string }>;
    const status = err.response?.status;
    console.error("createReservation :", status, err.response?.data ?? err.message);
    return {
      success: false,
      message:
        err.response?.data?.message ||
        err.response?.data?.error ||
        (status ? `La réservation a échoué (erreur ${status})` : "Backend injoignable"),
    };
  }
}