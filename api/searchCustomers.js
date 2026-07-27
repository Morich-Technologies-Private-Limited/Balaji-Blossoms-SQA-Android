import { CUSTOMER_SEARCH_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * Search customers by a free-text key (name, mobile, GST, etc.).
 *
 * GET /search?searchKey=&maxRecord=
 * Response payload shape: List<CustomerDto>
 * {
 *   customerId, customerName, alias, address, city, state, pinCode, country,
 *   contactPerson, telephoneNumber, mobileNumber, email, panNumber, panName,
 *   gstNumber
 * }
 *
 * The server returns NOT_FOUND (HTTP 400) with a null payload when nothing
 * matches; handleApiError normalises that into { status, message, payload }.
 */
export const searchCustomers = async (searchKey, maxRecord = 20) => {
  try {
    const response = await axiosClient.get(CUSTOMER_SEARCH_URL, {
      params: { searchKey, maxRecord },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
