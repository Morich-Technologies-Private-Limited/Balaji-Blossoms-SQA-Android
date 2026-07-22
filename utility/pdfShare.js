import { Alert, Linking, Platform } from "react-native";

/**
 * Download a PDF, or hand it to WhatsApp or the system share sheet.
 *
 * Nothing here knows what the document is, so any screen can use it. A file is
 * described by one object and any one of three sources is enough:
 *
 *   { blob }    the bytes, which is what an axios `responseType: "blob"` call
 *               returns — downloads everywhere, shared as a real file on a phone
 *   { base64 }  the bytes inline, same capabilities as a blob
 *   { url }     a hosted copy, and the only thing WhatsApp can carry on the web
 *
 * Ask the backend for a public link if you want browser sharing to send a real
 * file rather than a message with a link in it.
 *
 *   { blob, base64, url, fileName, mimeType }
 */

const isWeb = Platform.OS === "web";
const PDF_TYPE = "application/pdf";

/* expo-file-system moved its classic API behind /legacy in SDK 54. */
const fileSystem = () => {
  try {
    // eslint-disable-next-line global-require
    return require("expo-file-system/legacy");
  } catch {
    // eslint-disable-next-line global-require
    return require("expo-file-system");
  }
};

const sharing = () => {
  try {
    // eslint-disable-next-line global-require
    return require("expo-sharing");
  } catch {
    return null;
  }
};

const notify = (message) => {
  if (isWeb) {
    // eslint-disable-next-line no-alert
    if (typeof window !== "undefined") window.alert(message);
    return;
  }
  Alert.alert("Sharing", message);
};

/* ── source conversion ───────────────────────────────────────────────── */

const base64ToBlob = (base64, type = PDF_TYPE) => {
  // atob is a browser API; this path is only reached on the web.
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(blob);
  });

/** Bytes as base64, whichever way they arrived. Null when there are none. */
const asBase64 = async (file) => {
  if (file?.base64) return file.base64;
  if (file?.blob) return blobToBase64(file.blob);
  return null;
};

/** Writes the file into the app cache and returns a file:// uri. */
const cacheFile = async (base64, fileName) => {
  const FileSystem = fileSystem();
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
};

/** True when the file carries its own bytes rather than only a link. */
export const hasBytes = (file) => !!(file?.blob || file?.base64);

/* ── actions ─────────────────────────────────────────────────────────── */

/** Save the PDF to the device. */
export async function downloadPdf(file = {}) {
  const { url, fileName = "document.pdf", mimeType = PDF_TYPE } = file;

  try {
    if (isWeb) {
      const blob =
        file.blob || (file.base64 ? base64ToBlob(file.base64, mimeType) : null);
      const href = blob ? URL.createObjectURL(blob) : url;
      if (!href) return notify("No file came back from the server.");

      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = fileName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      if (blob) setTimeout(() => URL.revokeObjectURL(href), 4000);
      return;
    }

    const base64 = await asBase64(file);

    if (!base64) {
      if (url) return Linking.openURL(url);
      return notify("No file came back from the server.");
    }

    const uri = await cacheFile(base64, fileName);
    const Sharing = sharing();

    if (Sharing && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri, {
        mimeType,
        UTI: "com.adobe.pdf",
        dialogTitle: fileName,
      });
      return;
    }

    notify(`Saved to ${uri}`);
  } catch (error) {
    notify(error?.message || "The file could not be saved.");
  }
}

/** Open the system share sheet. Falls back to a download on the web. */
export async function sharePdf(file = {}, { message = "" } = {}) {
  const { fileName = "document.pdf", mimeType = PDF_TYPE } = file;

  try {
    if (isWeb) return downloadPdf(file);

    const base64 = await asBase64(file);
    if (!base64) {
      if (file.url) return Linking.openURL(file.url);
      return notify("No file came back from the server.");
    }

    const uri = await cacheFile(base64, fileName);
    const Sharing = sharing();

    if (Sharing && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(uri, {
        mimeType,
        UTI: "com.adobe.pdf",
        dialogTitle: message || fileName,
      });
      return;
    }

    notify("Install expo-sharing to send files from this device.");
  } catch (error) {
    notify(error?.message || "The file could not be shared.");
  }
}

/** Send the PDF to WhatsApp. */
export async function sharePdfOnWhatsApp(file = {}, options = {}) {
  const { fileName = "document.pdf" } = file;
  // Tolerates the older call shape: sharePdfOnWhatsApp({ ...file, message }).
  const message = options.message ?? file.message ?? "";

  try {
    /* A hosted link travels through WhatsApp on every platform. */
    if (file.url) {
      const text = encodeURIComponent(`${message}\n${file.url}`.trim());
      const target = `https://wa.me/?text=${text}`;
      if (isWeb) {
        window.open(target, "_blank", "noopener");
      } else {
        const app = `whatsapp://send?text=${text}`;
        const canOpen = await Linking.canOpenURL(app);
        await Linking.openURL(canOpen ? app : target);
      }
      return;
    }

    if (!hasBytes(file)) return notify("No file came back from the server.");

    /* On a phone the share sheet hands the actual file to WhatsApp. */
    if (!isWeb) return sharePdf(file, { message });

    /* A browser cannot attach a file to WhatsApp, so download it and open a
       chat with the message ready to go. */
    await downloadPdf(file);
    const text = encodeURIComponent(
      `${message}\n(PDF ${fileName} attached)`.trim(),
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  } catch (error) {
    notify(error?.message || "WhatsApp could not be opened.");
  }
}
