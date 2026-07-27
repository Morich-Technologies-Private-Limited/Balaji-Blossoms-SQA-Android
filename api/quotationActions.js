import {
  CONVERT_TO_INVOICE_URL,
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

const toPdfPayload = (response, fallbackName) => {
  const blob = new Blob([response.data], { type: PDF_TYPE });
  return {
    blob,
    mimeType: PDF_TYPE,
    fileName: fileNameFrom(response.headers, fallbackName),
  };
};

export const moveToLoadingShade = async (quotationId) => {
  if (!quotationId) {
    return { status: "FAILURE", message: "Quotation id is missing." };
  }
  try {
    const response = await axiosClient.post(MOVE_TO_DELIVERY_SHADE_URL, null, {
      params: { quotationId },
      responseType: "arraybuffer",
      headers: { Accept: `${PDF_TYPE}, application/json` },
    });
    if (!response.data || response.data.byteLength === 0) {
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

export const convertToInvoice = async (quotationId) => {
  if (!quotationId) {
    return { status: "FAILURE", message: "Quotation id is missing." };
  }
  try {
    const response = await axiosClient.post(CONVERT_TO_INVOICE_URL, null, {
      params: { quotationId },
      responseType: "arraybuffer",
      headers: { Accept: `${PDF_TYPE}, application/json` },
    });
    if (!response.data || response.data.byteLength === 0) {
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
