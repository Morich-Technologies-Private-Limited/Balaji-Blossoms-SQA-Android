import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { createQuotation } from "../../api/createQuotation";
import { getCurrentUser } from "../../utility/secureStorage";
import makeStyles from "./CreateQuotationModal.styles.js";

/**
 * Create-quotation popup.
 *
 * Props
 *  - visible    boolean
 *  - userId     optional; falls back to the signed-in user's emailId from secure storage
 *  - userName   optional display name shown on the assignment row
 *  - onClose    () => void
 *  - onCreated  (quotation) => void — receives the saved quotation on success
 */
export default function CreateQuotationModal({
  visible,
  userId: userIdProp,
  userName,
  onClose,
  onCreated,
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const styles = useMemo(
    () => makeStyles({ width, isTablet, isDesktop }),
    [width, isTablet, isDesktop],
  );

  const [storedUser, setStoredUser] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = userIdProp || storedUser?.emailId;

  useEffect(() => {
    if (!visible) return;
    setCustomerId("");
    setError(null);
    setSubmitting(false);

    let alive = true;
    (async () => {
      const user = await getCurrentUser();
      if (alive) setStoredUser(user);
    })();
    return () => {
      alive = false;
    };
  }, [visible]);

  const trimmedId = customerId.trim();
  const canSubmit = /^\d+$/.test(trimmedId) && !!userId && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!userId) setError("No signed-in user found. Sign in again.");
      else setError("Enter a numeric customer ID.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await createQuotation(Number(trimmedId), userId);

    setSubmitting(false);

    if (response?.status === "SUCCESS") {
      onCreated?.(response.payload);
      return;
    }

    setError(response?.message || "Couldn't create the quotation.");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetStrip} />

            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.title}>New quotation</Text>
                <Text style={styles.subtitle}>
                  Starts as a draft you can add plants to.
                </Text>
              </View>

              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={styles.iconSize} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Customer</Text>
            <View
              style={[
                styles.inputWrap,
                error && !userId ? null : error ? styles.inputWrapError : null,
              ]}
            >
              <Ionicons
                name="person-circle-outline"
                size={styles.iconSize}
                color="#94A3B8"
              />
              <TextInput
                style={styles.input}
                value={customerId}
                onChangeText={(value) => {
                  setCustomerId(value.replace(/[^0-9]/g, ""));
                  if (error) setError(null);
                }}
                placeholder="Customer ID"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                autoFocus
              />
            </View>

            <Text style={styles.sectionLabel}>Assigned to</Text>
            <View style={styles.readonlyRow}>
              <Ionicons
                name="briefcase-outline"
                size={styles.iconSize}
                color="#94A3B8"
              />
              <Text style={styles.readonlyText} numberOfLines={1}>
                {userName ? `${userName} · ${userId}` : userId || "Loading…"}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#E8622C"
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable style={styles.secondaryBtn} onPress={onClose}>
                <Text style={styles.secondaryBtnText}>CANCEL</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryBtn, !canSubmit && styles.primaryBtnOff]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>CREATE QUOTATION</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
