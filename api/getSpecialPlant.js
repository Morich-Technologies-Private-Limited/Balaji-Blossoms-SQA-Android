import { SPECIAL_PLANT_BY_BARCODE_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * Look up a single available special plant by its barcode.
 *
 * Quantity is always 1 (a special plant is one physical item), so it is not
 * editable on the screen. The offer API is not applied to special plants.
 *
 * `discountPrice` is the final price the customer pays, worked out by the
 * backend — the app never derives it. It is absent when the plant carries no
 * discount, in which case `price` is what is charged.
 *
 * Response payload shape: SpecialPlant
 * { barcodeId, plantName, arrivalDate, departureDate, price, discountPrice, status, unitId, unitName, reason }
 */
export const getSpecialPlantByBarcodeId = async (barcodeId) => {
  try {
    const response = await axiosClient.get(SPECIAL_PLANT_BY_BARCODE_URL, {
      params: { barcodeId },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
