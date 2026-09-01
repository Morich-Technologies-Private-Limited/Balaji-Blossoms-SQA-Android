import { GET_OFFER_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * Applicable offer for a parent plant group at a pooled quantity.
 *
 * Offers are cut group-wise, not per plant: every plant under the same parent
 * group (Rose Blue, Rose White → "Rose") pools its quantity into one lookup,
 * and the discount that comes back applies to each of those plants
 * individually.
 *
 * Frontend display only: the payload carries a flat `discount` off the unit
 * price so the screen can show `price − discount` as a struck-through cut.
 * It is never sent back on save and does not apply to special plants.
 *
 * Response payload shape: { offerId, discount }
 */
export const getApplicableOffer = async (plantGroupName, totalQuantity) => {
  try {
    const response = await axiosClient.get(GET_OFFER_URL, {
      params: { plantGroupName, totalQuantity },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
