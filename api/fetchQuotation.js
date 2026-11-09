import {
  QUOTATION_BY_UNIT_URL,
  QUOTATION_BY_USER_URL,
  QUOTATION_CHANGE_DETAIL_URL,
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
      /* lite: list rows without plant lines / history (counts only). The
         editor fetches the full quotation by id when one is opened. */
      params: { userId, invoicedWithinHours: INVOICED_WITHIN_HOURS, lite: true },
    });

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchQuotationsByUnit = async (unitId) => {
  try {
    const response = await axiosClient.get(QUOTATION_BY_UNIT_URL, {
      params: { unitId, invoicedWithinHours: INVOICED_WITHIN_HOURS, lite: true },
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
 * Always requested lite: each quotation carries only its counts and plant
 * names; a card's rows are loaded by fetchQuotationChangeDetail on open.
 *
 * payload: [{ quotationId, customerName, mobileNo, level, assignedUserName,
 *   lastChangeDate, updatedCount, removedCount, plantNames, lite: true }]
 */
export const fetchQuotationChanges = async ({
  unitId,
  userId,
  fromDate,
  toDate,
}) => {
  try {
    const params = { fromDate, toDate, lite: true };
    if (unitId != null) params.unitId = unitId;
    else params.userId = userId;

    const response = await axiosClient.get(QUOTATION_CHANGES_URL, { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * GET /quotation/changes/detail — one quotation's change rows in the range.
 *
 * payload: { quotationId, ..., changes: [{ date, updatedBy, changeType,
 *   plantName, price, packingName, previousQuantity, updatedQuantity, reason }] }
 */
export const fetchQuotationChangeDetail = async ({
  quotationId,
  fromDate,
  toDate,
}) => {
  try {
    const response = await axiosClient.get(QUOTATION_CHANGE_DETAIL_URL, {
      params: { quotationId, fromDate, toDate },
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
