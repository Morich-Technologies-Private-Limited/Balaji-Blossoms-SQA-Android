import {
    CONVERT_TO_INVOICE_URL,
    MOVE_TO_DELIVERY_SHADE_URL,
} from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

export const moveToDeliveryShade = async (quotationId) => {
  try {
    const response = await axiosClient.post(MOVE_TO_DELIVERY_SHADE_URL, null, {
      params: {
        quotationId,
      },
      responseType: "arraybuffer",
    });

    return {
      status: "SUCCESS",
      payload: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
};

export const convertToInvoice = async (quotationId) => {
  try {
    const response = await axiosClient.post(CONVERT_TO_INVOICE_URL, null, {
      params: {
        quotationId,
      },
      responseType: "arraybuffer",
    });

    return {
      status: "SUCCESS",
      payload: response.data,
    };
  } catch (error) {
    return handleApiError(error);
  }
};
