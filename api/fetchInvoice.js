// api/fetchInvoice.js
import {
  INVOICE_CREATE_PAYMENT_URL, // GET /find?invoiceId=
  INVOICE_FIND_BY_UNIT_URL,
  INVOICE_FIND_URL,
  INVOICE_SEND_TO_TALLY_URL,
} from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/** GET /find?invoiceId= → ApiResponseModal<InvoiceDto> */
export const fetchInvoiceById = async (invoiceId) => {
  try {
    const response = await axiosClient.get(INVOICE_FIND_URL, {
      params: { invoiceId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/** GET /findByUnitId?unitId= → ApiResponseModal<List<InvoiceDto>> */
export const fetchInvoicesByUnit = async (unitId) => {
  try {
    const response = await axiosClient.get(INVOICE_FIND_BY_UNIT_URL, {
      params: { unitId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/** POST /create/payment → ApiResponseModal (payload not the updated InvoiceDto) */
export const createInvoicePayment = async ({ invoiceId, amount, remark }) => {
  try {
    const response = await axiosClient.post(INVOICE_CREATE_PAYMENT_URL, {
      invoiceId,
      amount,
      remark,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/** POST /send/tally?invoiceId= → ApiResponseModal — endpoint signature TBD */
export const sendInvoiceToTally = async (invoiceId) => {
  try {
    const response = await axiosClient.post(INVOICE_SEND_TO_TALLY_URL, null, {
      params: { invoiceId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
