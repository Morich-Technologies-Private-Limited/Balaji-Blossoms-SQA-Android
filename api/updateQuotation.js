import { UPDATE_QUOTATION_PLANTS_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * PUT /quotation/updatePlants?quotationId=45&userId=john@balajiblossoms.com
 *
 * Sends the complete final state of the quotation. Rows left out are deleted by
 * the backend, so the payload must always contain everything that should survive
 * - including special plants that were not touched on this screen.
 *
 * Prices are never sent: the backend resolves plant, offer and packing itself.
 */

export const updateQuotationPlants = async (quotationId, userId, body) => {
  try {
    const response = await axiosClient.put(UPDATE_QUOTATION_PLANTS_URL, body, {
      params: { quotationId, userId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
