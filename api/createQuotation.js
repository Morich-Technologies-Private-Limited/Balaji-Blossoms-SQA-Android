import { CREATE_QUOTATION_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

export const createQuotation = async (customerId, userId, companyId) => {
  try {
    const response = await axiosClient.post(CREATE_QUOTATION_URL, null, {
      params: {
        customerId,
        userId,
        companyId,
      },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
