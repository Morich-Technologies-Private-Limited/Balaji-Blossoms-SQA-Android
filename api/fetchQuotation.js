import {
  QUOTATION_BY_UNIT_URL,
  QUOTATION_BY_USER_URL,
  QUOTATION_CHANGES_URL,
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

/**
 * GET /quotation/changes — quotations whose plant quantities were updated or
 * plants deleted between fromDate and toDate (yyyy-MM-dd, both inclusive),
 * with only those plant rows. Pass unitId for the unit view, else userId.
 *
 * payload: [{ quotationId, customerName, mobileNo, level, assignedUserName,
 *   lastChangeDate, changes: [{ date, updatedBy, changeType, plantName, price,
 *   packingName, previousQuantity, updatedQuantity, reason }] }]
 */
export const fetchQuotationChanges = async ({
  unitId,
  userId,
  fromDate,
  toDate,
}) => {
  try {
    const params = { fromDate, toDate };
    if (unitId != null) params.unitId = unitId;
    else params.userId = userId;

    const response = await axiosClient.get(QUOTATION_CHANGES_URL, { params });
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
