import { PACKING_LIST_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * GET /plant/packingList
 *
 * No authentication required.
 */
export const fetchPackingList = async () => {
  try {
    const response = await axiosClient.get(PACKING_LIST_URL, {
      requiresAuth: false,
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
