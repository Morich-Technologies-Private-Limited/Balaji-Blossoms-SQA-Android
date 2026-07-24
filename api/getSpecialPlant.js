import { SPECIAL_PLANT_BY_BARCODE_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * Look up a single available special plant by its barcode.
 *
 * Quantity is always 1 (a special plant is one physical item), so it is not
 * editable on the screen. The offer API is not applied to special plants.
 *
 * Response payload shape: SpecialPlant
 * { barcodeId, plantName, arrivalDate, departureDate, price, status, unitId, unitName, reason }
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
