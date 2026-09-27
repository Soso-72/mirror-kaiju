import { api } from "./transfert";


export async function requisitionResource(payload: {
  sourceDistrictId: number;
  destinationDistrictId?: number;
  resourceTypeId: number;
  quantity: number;
}) {
  try {
    const response = await api.post("/resource/requisition", payload);
    return response.data;
  } catch (error) {
    console.error("Error requisitioning resource:", error);
    throw error;
  }
}

export async function reserveResource(payload: {
  districtId: number;
  resourceTypeId: number;
  quantity: number;
}) {
  try {
    const response = await api.post("/resource/reserve", payload);
    return response.data;
  } catch (error) {
    console.error("Error reserving resource:", error);
    throw error;
  }
}

export async function unreserveResource(payload: {
  districtId: number;
  resourceTypeId: number;
  quantity: number;
}) {
  try {
    const response = await api.post("/resource/unreserve", payload);
    return response.data;
  } catch (error) {
    console.error("Error unreserving resource:", error);
    throw error;
  }
}