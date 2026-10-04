import {
  CONVERT_TO_INVOICE_URL,
  DELETE_QUOTATION_URL,
  MOVE_TO_DELIVERY_SHADE_URL,
} from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

const PDF_TYPE = "application/pdf";

const fileNameFrom = (headers, fallback) => {
  const disposition =
    (typeof headers?.get === "function"
      ? headers.get("content-disposition")
      : headers?.["content-disposition"]) || "";
  const match =
    /filename\*=UTF-8''([^;]+)/i.exec(disposition) ||
    /filename="?([^";]+)"?/i.exec(disposition);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1].trim()) || fallback;
  } catch {
    return match[1].trim() || fallback;
  }
};

const toPdfPayload = (response, fallbackName) => ({
  blob: response.data,
  mimeType: PDF_TYPE,
  fileName: fileNameFrom(response.headers, fallbackName),
});

export const moveToLoadingShade = async (quotationId) => {
  if (!quotationId) {
    return { status: "FAILURE", message: "Quotation id is missing." };
  }
  try {
    const response = await axiosClient.post(MOVE_TO_DELIVERY_SHADE_URL, null, {
      params: { quotationId },
      responseType: "blob",
      headers: { Accept: `${PDF_TYPE}, application/json` },
    });
    if (!response.data || response.data.size === 0) {
      return {
        status: "FAILURE",
        message: "The server returned an empty file.",
      };
    }
    return {
      status: "SUCCESS",
      payload: toPdfPayload(response, `loading-slip-${quotationId}.pdf`),
    };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * `loadedBy` is the delivery person who physically loaded the order — picked
 * from /info/deliverPerson/findAll, not typed. The backend requires it, so a
 * blank selection is rejected here rather than sent as an empty param.
 */
export const convertToInvoice = async (quotationId, loadedBy) => {
  if (!quotationId) {
    return { status: "FAILURE", message: "Quotation id is missing." };
  }
  const loader = String(loadedBy ?? "").trim();
  if (!loader) {
    return { status: "FAILURE", message: "Select who loaded this order." };
  }
  try {
    const response = await axiosClient.post(CONVERT_TO_INVOICE_URL, null, {
      params: { quotationId, loadedBy: loader },
      responseType: "blob",
      headers: { Accept: `${PDF_TYPE}, application/json` },
    });
    if (!response.data || response.data.size === 0) {
      return {
        status: "FAILURE",
        message: "The server returned an empty file.",
      };
    }
    return {
      status: "SUCCESS",
      payload: toPdfPayload(response, `invoice-${quotationId}.pdf`),
    };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * DELETE /quotation/delete?quotationId=45&reason=...
 *
 * Nothing is deleted on the spot: the server raises a deletion request for an
 * admin to approve or reject, and answers with the request
 * (QuotationDeleteRequestDto — id, status PENDING, totalAmountToRefund). The
 * quotation stays exactly as it is until that request is approved.
 *
 * The reason is compulsory. A second request for an order that already has one
 * awaiting approval is rejected by the server, as is one whose invoice has
 * already gone to Tally.
 *
 * The endpoint also takes an `invoiceId` instead, for an invoiced order, and
 * rejects both ids at once — so only `quotationId` goes out from here.
 */
export const requestQuotationDeletion = async (quotationId, reason) => {
  if (!quotationId) {
    return { status: "FAILURE", message: "Quotation id is missing." };
  }
  const why = String(reason ?? "").trim();
  if (!why) {
    return { status: "FAILURE", message: "A reason is required to delete." };
  }
  try {
    const response = await axiosClient.delete(DELETE_QUOTATION_URL, {
      params: { quotationId, reason: why },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
