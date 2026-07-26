import { QUOTATION_ACCESS_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * GET /check/access?quotationId=...
 * Returns { status, payload: { message, accessLevel: "EDIT" | "READ" }, message }.
 * Caller should default to READ on any failure.
 */
export const getQuotationAccess = async (quotationId) => {
  try {
    const response = await axiosClient.get(QUOTATION_ACCESS_URL, {
      params: { quotationId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
