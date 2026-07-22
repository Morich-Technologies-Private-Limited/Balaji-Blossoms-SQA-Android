import { SEARCH_PLANTS_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * GET /plant/searchPlants?key=rose&maxValue=20
 *
 * Each PlantDto carries its own inventoryList, so a search result already knows
 * which units hold the plant, how many are in stock and the tray size per unit.
 * That is what feeds the unit dropdown - no extra call per row.
 *
 * Returns the ApiResponseModal shape: { status, message, payload }
 */
export const searchPlants = async (key, maxValue = 20) => {
  try {
    const response = await axiosClient.get(SEARCH_PLANTS_URL, {
      params: { key, maxValue },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
