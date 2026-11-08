import {
  QUOTATION_BY_UNIT_URL,
  QUOTATION_BY_USER_URL,
  QUOTATION_FIND_URL,
} from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/* Draft and loading-shade quotations always come back; invoiced ones only for
   this many hours after the invoice. */
const INVOICED_WITHIN_HOURS = 48;

export const fetchQuotationsByUser = async (userId) => {
  try {
    const response = await axiosClient.get(QUOTATION_BY_USER_URL, {
      params: { userId, invoicedWithinHours: INVOICED_WITHIN_HOURS },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchQuotationsByUnit = async (unitId) => {
  try {
    const response = await axiosClient.get(QUOTATION_BY_UNIT_URL, {
      params: { unitId, invoicedWithinHours: INVOICED_WITHIN_HOURS },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const getQuotation = async (quotationId) => {
  try {
    console.log("Quotation api called");
    const response = await axiosClient.get(QUOTATION_FIND_URL, {
      params: { quotationId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
