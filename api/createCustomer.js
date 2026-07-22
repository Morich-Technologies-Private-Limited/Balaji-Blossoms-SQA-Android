import { CREATE_CUSTOMER_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * POST /customer/create
 *
 * Backend takes the whole CustomerDto as a request body (unlike
 * createQuotation, which passes ids as query params).
 *
 * Returns the ApiResponseModal shape: { status, message, payload }
 */
export const createCustomer = async (customerDto) => {
  try {
    const response = await axiosClient.post(CREATE_CUSTOMER_URL, customerDto);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export default createCustomer;
