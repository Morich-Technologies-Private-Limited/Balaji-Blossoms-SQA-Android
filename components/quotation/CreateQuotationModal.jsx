import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { createQuotation } from "../../api/createQuotation";
import { searchCustomers } from "../../api/searchCustomers.js";
import { getCurrentUser } from "../../utility/secureStorage";
import makeStyles from "./CreateQuotationModal.styles.js";

const SEARCH_DEBOUNCE = 350;
const MIN_QUERY = 2;

/* The detail rows shown once a customer is picked. Each pulls a field off the
   CustomerDto; empty values are rendered as an em dash. `full: true` rows span
   the whole width (long values like address). */
const DETAIL_FIELDS = [
  { key: "customerId", label: "Customer ID" },
  { key: "alias", label: "Alias" },
  { key: "mobileNumber", label: "Mobile" },
  { key: "telephoneNumber", label: "Telephone" },
  { key: "email", label: "Email", full: true },
  { key: "address", label: "Address", full: true },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pinCode", label: "PIN code" },
  { key: "country", label: "Country" },
  { key: "contactPerson", label: "Contact person" },
  { key: "gstNumber", label: "GST number" },
  { key: "panNumber", label: "PAN" },
  { key: "panName", label: "PAN name" },
];

/**
 * Create-quotation popup.
 *
 * Flow: search customers by name / mobile / GST → pick one from the dropdown →
 * review the full customer details → create. The quotation is created against
 * the selected customer's id and the signed-in user.
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
  const C = styles.colors;

  const [storedUser, setStoredUser] = useState(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = userIdProp || storedUser?.emailId;

  /* Guards against out-of-order search responses: only the latest request's
     result is allowed to land. */
  const reqIdRef = useRef(0);
  const debounceRef = useRef(null);

  /* Reset everything each time the modal is opened, and load the stored user
     as a fallback for userId. */
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setResults([]);
    setSearching(false);
    setSearchError(null);
    setDropdownOpen(false);
    setSelected(null);
    setSubmitting(false);
    setError(null);

    let alive = true;
    (async () => {
      const user = await getCurrentUser();
      if (alive) setStoredUser(user);
    })();
    return () => {
      alive = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [visible]);

  /* Debounced search. Runs whenever the query changes and no customer is
     selected. A query shorter than MIN_QUERY clears the list without a call. */
  useEffect(() => {
    if (selected) return;

    const term = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (term.length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      setDropdownOpen(false);
      return;
    }

    setSearching(true);
    setDropdownOpen(true);

    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      const response = await searchCustomers(term);
      if (myReq !== reqIdRef.current) return; // a newer search superseded this

      if (response?.status === "SUCCESS") {
        setResults(response.payload || []);
        setSearchError(null);
      } else if (response?.status === "NOT_FOUND") {
        setResults([]);
        setSearchError(null);
      } else {
        setResults([]);
        setSearchError(response?.message || "Couldn't search customers.");
      }
      setSearching(false);
    }, SEARCH_DEBOUNCE);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  const pickCustomer = (customer) => {
    reqIdRef.current++; // invalidate any in-flight search
    setSelected(customer);
    setDropdownOpen(false);
    setResults([]);
    setSearching(false);
    setSearchError(null);
    setError(null);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setError(null);
  };

  const canSubmit = !!selected && !!userId && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!selected) setError("Search and select a customer first.");
      else if (!userId) setError("No signed-in user found. Sign in again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await createQuotation(selected.customerId, userId);

    setSubmitting(false);

    if (response?.status === "SUCCESS") {
      onCreated?.(response.payload);
      return;
    }

    setError(response?.message || "Couldn't create the quotation.");
  };

  const valueOf = (customer, key) => {
    const raw = customer?.[key];
    if (raw === null || raw === undefined || raw === "") return "—";
    return String(raw);
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

            {/* header */}
            <View style={styles.headerRow}>
              <View style={styles.headerBadge}>
                <Ionicons
                  name="document-text-outline"
                  size={styles.iconSize}
                  color={C.NAVY}
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>New quotation</Text>
                <Text style={styles.subtitle}>
                  Find a customer, then start their draft.
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={styles.iconSize} color={C.MUTED} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── search + dropdown ── */}
              {!selected ? (
                <View style={styles.searchBlock}>
                  <Text style={styles.sectionLabel}>Customer</Text>

                  <View
                    style={[
                      styles.inputWrap,
                      dropdownOpen && styles.inputWrapOpen,
                      searchError && styles.inputWrapError,
                    ]}
                  >
                    <Ionicons
                      name="search-outline"
                      size={styles.iconSize}
                      color={C.PLACEHOLDER}
                    />
                    <TextInput
                      style={styles.input}
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search by name, mobile, GST…"
                      placeholderTextColor={C.PLACEHOLDER}
                      returnKeyType="search"
                      autoFocus
                    />
                    {searching ? (
                      <ActivityIndicator size="small" color={C.NAVY} />
                    ) : query.length > 0 ? (
                      <Pressable onPress={() => setQuery("")} hitSlop={8}>
                        <Ionicons
                          name="close-circle"
                          size={styles.iconSize}
                          color={C.PLACEHOLDER}
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  {/* dropdown */}
                  {dropdownOpen ? (
                    <View style={styles.dropdown}>
                      {searching && results.length === 0 ? (
                        <View style={styles.dropdownState}>
                          <ActivityIndicator size="small" color={C.NAVY} />
                          <Text style={styles.dropdownStateText}>
                            Searching…
                          </Text>
                        </View>
                      ) : searchError ? (
                        <View style={styles.dropdownState}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={18}
                            color={C.ORANGE}
                          />
                          <Text style={styles.dropdownStateText}>
                            {searchError}
                          </Text>
                        </View>
                      ) : results.length === 0 ? (
                        <View style={styles.dropdownState}>
                          <Ionicons
                            name="person-outline"
                            size={18}
                            color={C.PLACEHOLDER}
                          />
                          <Text style={styles.dropdownStateText}>
                            No customers match “{query.trim()}”.
                          </Text>
                        </View>
                      ) : (
                        <ScrollView
                          style={styles.dropdownScroll}
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled
                        >
                          {results.map((customer, index) => (
                            <Pressable
                              key={customer.customerId ?? index}
                              onPress={() => pickCustomer(customer)}
                              style={({ hovered, pressed }) => [
                                styles.option,
                                index === results.length - 1 &&
                                  styles.optionLast,
                                (hovered || pressed) && styles.optionHover,
                              ]}
                            >
                              <View style={styles.optionAvatar}>
                                <Text style={styles.optionAvatarText}>
                                  {(customer.customerName || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.optionText}>
                                <Text
                                  numberOfLines={1}
                                  style={styles.optionName}
                                >
                                  {customer.customerName || "Unnamed customer"}
                                  {customer.alias
                                    ? `  ·  ${customer.alias}`
                                    : ""}
                                </Text>
                                <Text
                                  numberOfLines={1}
                                  style={styles.optionMeta}
                                >
                                  {[
                                    `ID ${customer.customerId}`,
                                    customer.mobileNumber,
                                    customer.city,
                                  ]
                                    .filter(Boolean)
                                    .join("  ·  ")}
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={C.PLACEHOLDER}
                              />
                            </Pressable>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.hint}>
                      Type at least {MIN_QUERY} characters to search.
                    </Text>
                  )}
                </View>
              ) : (
                /* ── selected customer details ── */
                <View style={styles.detailBlock}>
                  <View style={styles.sectionHeadRow}>
                    <Text style={styles.sectionLabel}>Selected customer</Text>
                    <Pressable
                      onPress={clearSelection}
                      hitSlop={8}
                      style={styles.changeBtn}
                    >
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={15}
                        color={C.NAVY}
                      />
                      <Text style={styles.changeBtnText}>CHANGE</Text>
                    </Pressable>
                  </View>

                  <View style={styles.customerCard}>
                    <View style={styles.customerCardTop}>
                      <View style={styles.customerAvatar}>
                        <Text style={styles.customerAvatarText}>
                          {(selected.customerName || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.customerName}>
                          {selected.customerName || "Unnamed customer"}
                        </Text>
                        {selected.alias ? (
                          <Text numberOfLines={1} style={styles.customerAlias}>
                            {selected.alias}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.detailGrid}>
                      {DETAIL_FIELDS.map((field) => (
                        <View
                          key={field.key}
                          style={[
                            styles.detailCell,
                            field.full && styles.detailCellFull,
                          ]}
                        >
                          <Text style={styles.detailLabel}>{field.label}</Text>
                          <Text
                            style={styles.detailValue}
                            numberOfLines={field.full ? 2 : 1}
                          >
                            {valueOf(selected, field.key)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* assigned-to */}
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                Assigned to
              </Text>
              <View style={styles.readonlyRow}>
                <Ionicons
                  name="briefcase-outline"
                  size={styles.iconSize}
                  color={C.PLACEHOLDER}
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
                    color={C.ORANGE}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* actions */}
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
