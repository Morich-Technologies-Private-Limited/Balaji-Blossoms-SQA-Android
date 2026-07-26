import {
  QUOTATION_BY_UNIT_URL,
  QUOTATION_BY_USER_URL,
  QUOTATION_FIND_URL,
} from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

export const fetchQuotationsByUser = async (userId) => {
  try {
    const response = await axiosClient.get(QUOTATION_BY_USER_URL, {
      params: { userId },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchQuotationsByUnit = async (unitId) => {
  try {
    const response = await axiosClient.get(QUOTATION_BY_UNIT_URL, {
      params: { unitId },
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
