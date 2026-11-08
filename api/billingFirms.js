import { BILLING_FIRM_LIST_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * GET /quotation/firm/list
 * Returns { status, payload: [{ firmName, location, owner }], message }.
 *
 * Feeds the "Firm (note for billing)" choice on an advance payment. The note is
 * only the supervisor's suggestion — the billing manager decides the final firm.
 */
export const findAllBillingFirms = async () => {
  try {
    const response = await axiosClient.get(BILLING_FIRM_LIST_URL);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
