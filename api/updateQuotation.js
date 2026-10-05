import {
  UPDATE_LOADING_DATE_URL,
  UPDATE_QUOTATION_PLANTS_URL,
} from "../constants/apiConstants";
import { toApiDate } from "../utility/dates";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * PUT /quotation/updatePlants?quotationId=45&userId=john@example.com
 *
 * Sends the complete final state of the quotation. Rows left out are deleted by
 * the backend, so the payload must always contain everything that should survive
 * - including special plants that were not touched on this screen.
 *
 * Prices are never sent: the backend resolves plant, offer and packing itself.
 *
 * Rows that left the quotation are additionally listed in `plantRemovalDtoList`
 * ({ plantId, barcodeId, specialPlant, reason }) — the surviving lists say what
 * is gone, that list says why.
 *
 * The delivery tick of every surviving row is repeated in `plantCheckedList`
 * ({ plantId, barcodeId, specialPlant, plantChecked }), regular lines and
 * special plants together, so the ticks can be settled from one list.
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

/**
 * POST /quotation/update/loadindDate?quotationId=45&loadingDate=2026-09-30
 *
 * The loading date is its own endpoint, not part of the plants payload, so
 * changing it is a standalone write that carries nothing else with it.
 */
export const updateLoadingDate = async (quotationId, loadingDate) => {
  if (!quotationId) {
    return { status: "FAILURE", message: "Quotation id is missing." };
  }
  const loading = toApiDate(loadingDate);
  if (!loading) {
    return { status: "FAILURE", message: "Pick a loading date." };
  }
  try {
    const response = await axiosClient.post(UPDATE_LOADING_DATE_URL, null, {
      params: { quotationId, loadingDate: loading },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
