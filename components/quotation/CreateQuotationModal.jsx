import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { createQuotation } from "../../api/createQuotation";
import { getCompanies } from "../../api/getCompanies.js";
import { searchCustomers } from "../../api/searchCustomers.js";
import { getCurrentUser } from "../../utility/secureStorage";
import makeStyles from "./CreateQuotationModal.styles.js";

const SEARCH_DEBOUNCE = 350;
const MIN_QUERY = 2;

/* CompanyDto.isDefault is declared as `private boolean isDefault`, so Lombok's
   getter is isDefault() and Jackson may serialise it as "default". Accept both
   spellings so the picker still highlights the right company either way. */
const isDefaultCompany = (company) =>
  company?.isDefault === true || company?.default === true;

const companyLabel = (company) =>
  company?.companyName || `Company ${company?.companyId}`;

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
 * Flow: pick the issuing company → search customers by name / mobile / GST →
 * pick one from the dropdown → review the full customer details → create. The
 * quotation is created against the selected customer, company, and the
 * signed-in user.
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

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [companyOpen, setCompanyOpen] = useState(false);

  /* Set to the customer's defaultBillingCompanyId while the "replace or keep"
     warning is up; null when there is nothing to warn about. */
  const [billingConflict, setBillingConflict] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = userIdProp || storedUser?.emailId;

  /* Guards against out-of-order search responses: only the latest request's
     result is allowed to land. */
  const reqIdRef = useRef(0);
  const debounceRef = useRef(null);
  /* Same idea for the company list, which can be reloaded via retry. */
  const companyReqRef = useRef(0);
  /* customerId we've already raised the billing-company warning for, so it is
     shown once per pick rather than every time the company list settles. */
  const warnedForRef = useRef(null);

  const loadCompanies = useCallback(async () => {
    const myReq = ++companyReqRef.current;
    setCompaniesLoading(true);
    setCompaniesError(null);

    const response = await getCompanies();
    if (myReq !== companyReqRef.current) return;

    if (response?.status === "SUCCESS" || response?.status === "NOT_FOUND") {
      const list = response.payload || [];
      setCompanies(list);
      setCompanyId(
        (prev) =>
          prev ?? (list.find(isDefaultCompany) || list[0])?.companyId ?? null,
      );
    } else {
      setCompanies([]);
      setCompaniesError(response?.message || "Couldn't load companies.");
    }
    setCompaniesLoading(false);
  }, []);

  /* Reset everything each time the modal is opened, load the stored user as a
     fallback for userId, and fetch the company list. */
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setResults([]);
    setSearching(false);
    setSearchError(null);
    setDropdownOpen(false);
    setSelected(null);
    setCompanies([]);
    setCompanyId(null);
    setCompanyOpen(false);
    setCompaniesError(null);
    setBillingConflict(null);
    setSubmitting(false);
    setError(null);
    warnedForRef.current = null;

    let alive = true;
    (async () => {
      const user = await getCurrentUser();
      if (alive) setStoredUser(user);
    })();

    loadCompanies();

    return () => {
      alive = false;
      companyReqRef.current++;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [visible, loadCompanies]);

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

  const findCompany = useCallback(
    (id) =>
      id == null
        ? null
        : companies.find((company) => company.companyId === id) || null,
    [companies],
  );

  /* Raise the "replace or keep" warning once per customer pick, when their
     CustomerDto.defaultBillingCompanyId points at a company other than the one
     currently selected. Runs as an effect rather than inline in pickCustomer
     because the company list may still be loading when the customer is picked.
     A default that isn't in the list is ignored — we couldn't switch to it. */
  useEffect(() => {
    if (!selected || companyId == null) return;
    if (warnedForRef.current === selected.customerId) return;

    const defaultId = selected.defaultBillingCompanyId;
    if (defaultId == null || defaultId === companyId) return;
    if (!findCompany(defaultId)) return;

    warnedForRef.current = selected.customerId;
    setBillingConflict(defaultId);
  }, [selected, companyId, findCompany]);

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
    setBillingConflict(null);
    warnedForRef.current = null;
  };

  const pickCompany = (id) => {
    setCompanyId(id);
    setCompanyOpen(false);
    setError(null);
  };

  /* Switch to the customer's default billing company. */
  const replaceWithDefaultBilling = () => {
    setCompanyId(billingConflict);
    setCompanyOpen(false);
    setBillingConflict(null);
    setError(null);
  };

  const selectedCompany = findCompany(companyId);
  const conflictCompany = findCompany(billingConflict);

  const canSubmit = !!selected && !!userId && companyId != null && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (companyId == null) setError("Select a company first.");
      else if (!selected) setError("Search and select a customer first.");
      else if (!userId) setError("No signed-in user found. Sign in again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await createQuotation(
      selected.customerId,
      userId,
      companyId,
    );

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
      onRequestClose={() =>
        billingConflict != null ? setBillingConflict(null) : onClose?.()
      }
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
                  Pick a company, find a customer, then start their draft.
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
              {/* ── company ── */}
              <Text style={styles.sectionLabel}>Company</Text>

              {companiesLoading ? (
                <View style={styles.readonlyRow}>
                  <ActivityIndicator size="small" color={C.NAVY} />
                  <Text style={styles.readonlyText}>Loading companies…</Text>
                </View>
              ) : companiesError ? (
                <Pressable style={styles.readonlyRow} onPress={loadCompanies}>
                  <Ionicons
                    name="refresh-outline"
                    size={styles.iconSize}
                    color={C.ORANGE}
                  />
                  <Text
                    style={[styles.readonlyText, styles.retryText]}
                    numberOfLines={2}
                  >
                    {companiesError} Tap to retry.
                  </Text>
                </Pressable>
              ) : companies.length === 0 ? (
                <View style={styles.readonlyRow}>
                  <Ionicons
                    name="business-outline"
                    size={styles.iconSize}
                    color={C.PLACEHOLDER}
                  />
                  <Text style={styles.readonlyText}>
                    No companies configured.
                  </Text>
                </View>
              ) : (
                <View>
                  <Pressable
                    onPress={() => setCompanyOpen((open) => !open)}
                    style={({ hovered, pressed }) => [
                      styles.selectTrigger,
                      (hovered || pressed) && styles.selectTriggerHover,
                      companyOpen && styles.selectTriggerOpen,
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={styles.iconSize}
                      color={C.PLACEHOLDER}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.selectValue,
                        !selectedCompany && styles.selectPlaceholder,
                      ]}
                    >
                      {selectedCompany
                        ? companyLabel(selectedCompany)
                        : "Select a company"}
                    </Text>
                    {selectedCompany && isDefaultCompany(selectedCompany) ? (
                      <Text style={styles.companyBadge}>DEFAULT</Text>
                    ) : null}
                    <Ionicons
                      name={companyOpen ? "chevron-up" : "chevron-down"}
                      size={styles.iconSize}
                      color={C.PLACEHOLDER}
                    />
                  </Pressable>

                  {companyOpen ? (
                    <View style={styles.dropdown}>
                      <ScrollView
                        style={styles.companyScroll}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        {companies.map((company, index) => {
                          const active = company.companyId === companyId;
                          return (
                            <Pressable
                              key={company.companyId}
                              onPress={() => pickCompany(company.companyId)}
                              style={({ hovered, pressed }) => [
                                styles.companyOption,
                                index === companies.length - 1 &&
                                  styles.optionLast,
                                (hovered || pressed) && styles.optionHover,
                              ]}
                            >
                              <Ionicons
                                name={
                                  active
                                    ? "checkmark-circle"
                                    : "ellipse-outline"
                                }
                                size={18}
                                color={active ? C.NAVY : C.PLACEHOLDER}
                              />
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.companyOptionText,
                                  active && styles.companyOptionTextActive,
                                ]}
                              >
                                {companyLabel(company)}
                              </Text>
                              {isDefaultCompany(company) ? (
                                <Text style={styles.companyBadge}>DEFAULT</Text>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              )}

              {/* ── search + dropdown ── */}
              {!selected ? (
                <View style={[styles.searchBlock, { marginTop: 20 }]}>
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
                <View style={[styles.detailBlock, { marginTop: 20 }]}>
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

        {/* ── default-billing-company warning ──
            Rendered in-tree above the sheet rather than as a nested <Modal>,
            which Android handles unreliably. */}
        {conflictCompany ? (
          <View style={styles.warnOverlay}>
            {/* swallows taps so the sheet and backdrop stay inert behind it */}
            <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

            <View style={styles.warnCard}>
              <View style={styles.warnHeadRow}>
                <View style={styles.warnBadge}>
                  <Ionicons
                    name="warning-outline"
                    size={styles.iconSize}
                    color={C.RED}
                  />
                </View>
                <Text style={styles.warnTitle}>Different billing nursery</Text>
              </View>

              <Text style={styles.warnText}>
                {selected?.customerName || "This customer"} bills under{" "}
                {companyLabel(conflictCompany)} by default, but you&apos;ve
                selected {selectedCompany ? companyLabel(selectedCompany) : "—"}
                . Replace it or keep your selection?
              </Text>

              <View style={styles.warnCompare}>
                <View style={styles.warnCompareRow}>
                  <Text style={styles.warnCompareTag}>Default</Text>
                  <Text numberOfLines={1} style={styles.warnCompareName}>
                    {companyLabel(conflictCompany)}
                  </Text>
                </View>
                <View
                  style={[styles.warnCompareRow, styles.warnCompareDivider]}
                >
                  <Text style={styles.warnCompareTag}>Selected</Text>
                  <Text numberOfLines={1} style={styles.warnCompareName}>
                    {selectedCompany ? companyLabel(selectedCompany) : "—"}
                  </Text>
                </View>
              </View>

              <View style={styles.warnActions}>
                <Pressable
                  style={styles.warnKeepBtn}
                  onPress={() => setBillingConflict(null)}
                >
                  <Text numberOfLines={2} style={styles.warnKeepBtnText}>
                    KEEP SELECTED
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.warnReplaceBtn}
                  onPress={replaceWithDefaultBilling}
                >
                  <Text numberOfLines={2} style={styles.warnReplaceBtnText}>
                    REPLACE
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
