// utility/printPdf.js
import * as FileSystem from "expo-file-system"; // SDK 53+: import from "expo-file-system/legacy"
import * as Print from "expo-print";
import { Platform } from "react-native";

/**
 * Open the OS print dialog for a PDF.
 *
 * Accepts whatever `downloadInvoicePdf(...).payload` hands back:
 *   • a base64 string ("JVBERi0x…")            ← most likely
 *   • a base64 data URI ("data:application/pdf;base64,…")
 *   • raw bytes (Uint8Array / ArrayBuffer)
 *
 * Resolves once the print dialog has been presented; throws otherwise, so the
 * caller can surface "Could not open the print dialog."
 */
export async function printPdf(file) {
  const base64 = toBase64(file);
  if (!base64) {
    throw new Error("printPdf: no PDF data to print.");
  }

  if (Platform.OS === "web") {
    return printOnWeb(base64);
  }
  return printOnNative(base64);
}

/* ── input normalisation → bare base64 ─────────────────────────────────── */
const toBase64 = (file) => {
  if (!file) return null;

  if (typeof file === "string") {
    // strip a "data:…;base64," prefix if present
    const comma = file.indexOf("base64,");
    return comma === -1 ? file : file.slice(comma + 7);
  }

  if (file instanceof Uint8Array || file instanceof ArrayBuffer) {
    const bytes = file instanceof ArrayBuffer ? new Uint8Array(file) : file;
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64"); // node/test env
  }

  return null;
};

/* ── native (iOS / Android) ────────────────────────────────────────────── */
const printOnNative = async (base64) => {
  const uri = `${FileSystem.cacheDirectory}invoice-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  // Note: don't delete `uri` right after — on Android the print service may
  // still be reading it. It lives in the cache dir, which the OS reclaims.
  await Print.printAsync({ uri });
};

/* ── web ───────────────────────────────────────────────────────────────── */
const printOnWeb = (base64) =>
  new Promise((resolve, reject) => {
    try {
      const chars = atob(base64);
      const bytes = new Uint8Array(chars.length);
      for (let i = 0; i < chars.length; i += 1) {
        bytes[i] = chars.charCodeAt(i);
      }
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );

      const iframe = document.createElement("iframe");
      Object.assign(iframe.style, {
        position: "fixed",
        width: "0",
        height: "0",
        border: "0",
        right: "0",
        bottom: "0",
      });
      iframe.src = url;

      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          resolve();
        } catch (e) {
          reject(e);
        }
        // give the print dialog time to grab the document before cleanup
        setTimeout(() => {
          URL.revokeObjectURL(url);
          iframe.remove();
        }, 60000);
      };
      iframe.onerror = () => reject(new Error("Failed to load PDF for print."));

      document.body.appendChild(iframe);
    } catch (e) {
      reject(e);
    }
  });
