import { CREATE_QUOTATION_URL } from "../constants/apiConstants";
import { toApiDate } from "../utility/dates";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * POST /quotation/create
 *
 * `loadingDate` is required by the controller and bound as yyyy-MM-dd, so it is
 * formatted off the local calendar (see utility/dates) rather than sent as an
 * ISO timestamp.
 */
export const createQuotation = async (
  customerId,
  userId,
  companyId,
  loadingDate,
) => {
  const loading = toApiDate(loadingDate);
  if (!loading) {
    return { status: "FAILURE", message: "Pick a loading date." };
  }
  try {
    const response = await axiosClient.post(CREATE_QUOTATION_URL, null, {
      params: {
        customerId,
        userId,
        companyId,
        loadingDate: loading,
      },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
