import {
  COLLECTION_SHEET_PDF_URL,
  INVOICE_PDF_URL,
  QUOTATION_PDF_URL,
} from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

const PDF_TYPE = "application/pdf";

const isBlob = (value) => typeof Blob !== "undefined" && value instanceof Blob;

/** Reads a blob as text on both web and React Native. */
const blobToText = (blob) =>
  new Promise((resolve) => {
    if (typeof blob?.text === "function") {
      blob
        .text()
        .then(resolve)
        .catch(() => resolve(""));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsText(blob);
  });

const parseMessage = (text, fallback) => {
  try {
    const body = JSON.parse(text);
    return body?.message || body?.error || fallback;
  } catch {
    const trimmed = String(text || "").trim();
    return trimmed && trimmed.length < 200 ? trimmed : fallback;
  }
};

/** Extract filename from Content-Disposition header */
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

/**
 * Download Quotation PDF
 */
export const downloadQuotationPdf = async (quotationId, { signal } = {}) => {
  if (!quotationId) {
    return {
      status: "FAILURE",
      message: "Quotation id is missing.",
    };
  }

  try {
    const response = await axiosClient.get(QUOTATION_PDF_URL, {
      params: { quotationId },
      responseType: "blob",
      headers: {
        Accept: `${PDF_TYPE}, application/json`,
      },
      signal,
    });

    const blob = response.data;
    const type = String(blob?.type || "").toLowerCase();

    if (!blob || blob.size === 0) {
      return {
        status: "FAILURE",
        message: "The server returned an empty file.",
      };
    }

    if (type && !type.includes("pdf")) {
      const text = await blobToText(blob);
      return {
        status: "FAILURE",
        message: parseMessage(text, "The server did not return a PDF."),
      };
    }

    return {
      status: "SUCCESS",
      payload: {
        blob,
        mimeType: PDF_TYPE,
        fileName: fileNameFrom(
          response.headers,
          `quotation-${quotationId}.pdf`,
        ),
      },
    };
  } catch (error) {
    const body = error?.response?.data;

    if (isBlob(body)) {
      const text = await blobToText(body);

      try {
        error.response.data = JSON.parse(text);
      } catch {
        error.response.data = {
          message: parseMessage(text, ""),
        };
      }
    }

    return handleApiError(error);
  }
};

/**
 * Download Collection Sheet PDF
 */
export const downloadCollectionSheetPdf = async (
  quotationId,
  { signal } = {},
) => {
  if (!quotationId) {
    return {
      status: "FAILURE",
      message: "Quotation id is missing.",
    };
  }

  try {
    const response = await axiosClient.get(COLLECTION_SHEET_PDF_URL, {
      params: { quotationId },
      responseType: "blob",
      headers: {
        Accept: `${PDF_TYPE}, application/json`,
      },
      signal,
    });

    const blob = response.data;
    const type = String(blob?.type || "").toLowerCase();

    if (!blob || blob.size === 0) {
      return {
        status: "FAILURE",
        message: "The server returned an empty file.",
      };
    }

    if (type && !type.includes("pdf")) {
      const text = await blobToText(blob);
      return {
        status: "FAILURE",
        message: parseMessage(text, "The server did not return a PDF."),
      };
    }

    return {
      status: "SUCCESS",
      payload: {
        blob,
        mimeType: PDF_TYPE,
        fileName: fileNameFrom(
          response.headers,
          `collection-sheet-${quotationId}.pdf`,
        ),
      },
    };
  } catch (error) {
    const body = error?.response?.data;

    if (isBlob(body)) {
      const text = await blobToText(body);

      try {
        error.response.data = JSON.parse(text);
      } catch {
        error.response.data = {
          message: parseMessage(text, ""),
        };
      }
    }

    return handleApiError(error);
  }
};

/**
 * Download Invoice PDF
 */
export const downloadInvoicePdf = async (invoiceId, { signal } = {}) => {
  if (!invoiceId) {
    return {
      status: "FAILURE",
      message: "Invoice id is missing.",
    };
  }

  try {
    const response = await axiosClient.get(INVOICE_PDF_URL, {
      params: { invoiceId },
      responseType: "blob",
      headers: {
        Accept: `${PDF_TYPE}, application/json`,
      },
      signal,
    });

    const blob = response.data;
    const type = String(blob?.type || "").toLowerCase();

    if (!blob || blob.size === 0) {
      return {
        status: "FAILURE",
        message: "The server returned an empty file.",
      };
    }

    if (type && !type.includes("pdf")) {
      const text = await blobToText(blob);
      return {
        status: "FAILURE",
        message: parseMessage(text, "The server did not return a PDF."),
      };
    }

    return {
      status: "SUCCESS",
      payload: {
        blob,
        mimeType: PDF_TYPE,
        fileName: fileNameFrom(response.headers, `invoice-${invoiceId}.pdf`),
      },
    };
  } catch (error) {
    const body = error?.response?.data;

    if (isBlob(body)) {
      const text = await blobToText(body);

      try {
        error.response.data = JSON.parse(text);
      } catch {
        error.response.data = {
          message: parseMessage(text, ""),
        };
      }
    }

    return handleApiError(error);
  }
};
