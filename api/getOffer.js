import { GET_OFFER_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * Applicable offer for a plant at a given quantity.
 *
 * Frontend display only: the payload carries a flat `discount` off the unit
 * price so the screen can show `price − discount` as a struck-through cut.
 * It is never sent back on save and does not apply to special plants.
 *
 * Response payload shape: { offerId, discount }
 */
export const getApplicableOffer = async (plantId, quantity) => {
  try {
    const response = await axiosClient.get(GET_OFFER_URL, {
      params: { plantId, quantity },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
