import { QUOTATION_EDIT_LEVEL_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * GET /quotation/editLevel?role=...
 * Returns { status, payload: ["DRAFT", "DELIVERY_SHADE", ...], message } — the
 * quotation levels this role is allowed to edit.
 *
 * The caller decides what an empty or failed answer means; see
 * `fallbackEditLevels` in components/quotation/Edit.jsx.
 */
export const getQuotationEditLevels = async (role) => {
  try {
    const response = await axiosClient.get(QUOTATION_EDIT_LEVEL_URL, {
      params: { role },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
