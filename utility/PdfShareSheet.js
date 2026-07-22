import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { downloadPdf, sharePdfOnWhatsApp } from "../utility/pdfShare";

/**
 * The sheet that appears once a PDF is ready: send it to the customer, or keep
 * a copy. It knows nothing about quotations, so any screen with a file
 * descriptor from the share utility can show it.
 *
 *   <PdfShareSheet
 *     file={{ blob, fileName }}      // null keeps the sheet closed
 *     title="Invoice generated"
 *     subtitle="QTN-482 · Green Acres"
 *     message="Invoice for QTN-482 · Green Acres"
 *     onClose={() => setPdf(null)}
 *     onError={setError}
 *   />
 */
export default function PdfShareSheet({
  file,
  title = "Your PDF is ready",
  subtitle,
  message = "",
  shareLabel = "SHARE ON WHATSAPP",
  downloadLabel = "DOWNLOAD PDF",
  doneLabel = "Done",
  onClose,
  onError,
}) {
  const [busy, setBusy] = useState(null); // "share" | "download" | null

  const run = useCallback(
    async (kind, action) => {
      setBusy(kind);
      try {
        await action();
      } catch (error) {
        onError?.(error?.message || "The file could not be opened.");
      } finally {
        setBusy(null);
      }
    },
    [onError],
  );

  if (!file) return null;

  const caption = [subtitle, file.fileName].filter(Boolean).join(" · ");

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.icon}>
            <Ionicons name="document-text-outline" size={26} color={GREEN} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.button,
                styles.whats,
                (hovered || pressed) && styles.whatsHover,
                busy && styles.buttonBusy,
              ]}
              disabled={!!busy}
              accessibilityRole="button"
              onPress={() =>
                run("share", () => sharePdfOnWhatsApp(file, { message }))
              }
            >
              {busy === "share" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="logo-whatsapp" size={19} color="#FFFFFF" />
              )}
              <Text style={styles.buttonText}>{shareLabel}</Text>
            </Pressable>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.button,
                styles.ghost,
                (hovered || pressed) && styles.ghostHover,
                busy && styles.buttonBusy,
              ]}
              disabled={!!busy}
              accessibilityRole="button"
              onPress={() => run("download", () => downloadPdf(file))}
            >
              {busy === "download" ? (
                <ActivityIndicator color={NAVY} />
              ) : (
                <Ionicons name="download-outline" size={19} color={NAVY} />
              )}
              <Text style={[styles.buttonText, styles.ghostText]}>
                {downloadLabel}
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.done} onPress={onClose} hitSlop={8}>
            <Text style={styles.doneText}>{doneLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const NAVY = "#0F4776";
const GREEN = "#16A34A";

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    padding: 24,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "#16A34A14",
  },
  title: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  actions: { alignSelf: "stretch", marginTop: 20, gap: 10 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 46,
    borderRadius: 10,
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#FFFFFF",
  },
  whats: { backgroundColor: "#25D366" },
  whatsHover: { backgroundColor: "#1EBE5B" },
  ghost: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  ghostHover: { backgroundColor: "#F1F5F9" },
  ghostText: { color: NAVY },
  done: { marginTop: 16, paddingVertical: 6, paddingHorizontal: 12 },
  doneText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
});
