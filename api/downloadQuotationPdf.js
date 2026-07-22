import { QUOTATION_PDF_URL } from "../constants/apiConstants";
import axiosClient from "./axiosClient";
import { handleApiError } from "./errorHandler";

/**
 * Fetch the PDF for a quotation.
 *
 * The endpoint streams bytes, so the response is asked for as a blob. Three
 * things follow from that and are handled here rather than at the call site:
 *
 *  - a failure body is *also* a blob, so it has to be read back into JSON
 *    before the shared error handler can find a message in it;
 *  - some backends answer 200 with a JSON error, so the content type is
 *    checked instead of trusted;
 *  - the real file name lives in Content-Disposition, not in the body.
 *
 * On success the payload is a file descriptor the share utilities understand:
 * `{ blob, fileName, mimeType }`.
 *
 * Web note: the browser only sees Content-Disposition if the server sends
 * `Access-Control-Expose-Headers: Content-Disposition`. Without it the name
 * falls back to `quotation-<id>.pdf`, which is still correct, just generic.
 */

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
    // The body was not JSON. A short plain-text body is still readable.
    const trimmed = String(text || "").trim();
    return trimmed && trimmed.length < 200 ? trimmed : fallback;
  }
};

/** `attachment; filename="invoice-42.pdf"` → `invoice-42.pdf` */
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

export const downloadQuotationPdf = async (quotationId, { signal } = {}) => {
  if (!quotationId) {
    return { status: "FAILURE", message: "Quotation id is missing." };
  }

  try {
    const response = await axiosClient.get(QUOTATION_PDF_URL, {
      params: { quotationId },
      responseType: "blob",
      headers: { Accept: `${PDF_TYPE}, application/json` },
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
    // Turn the blob error body back into JSON so handleApiError can read it.
    const body = error?.response?.data;
    if (isBlob(body)) {
      const text = await blobToText(body);
      try {
        error.response.data = JSON.parse(text);
      } catch {
        error.response.data = { message: parseMessage(text, "") };
      }
    }
    return handleApiError(error);
  }
};

export default downloadQuotationPdf;
