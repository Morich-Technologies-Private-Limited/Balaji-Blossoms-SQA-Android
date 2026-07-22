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

import { createCustomer } from "../../api/createCustomer";
import makeStyles from "./CreateCustomer.styles";

/** Seconds the success dialog stays up before it hands control back. */
const REDIRECT_SECONDS = 3;

const EMPTY = {
  customerId: "",
  customerName: "",
  alias: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  country: "India",
  contactPerson: "",
  telephoneNumber: "",
  mobileNumber: "",
  email: "",
  panNumber: "",
  panName: "",
  gstNumber: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/;

const SECTIONS = [
  {
    key: "customer",
    label: "",
    fields: [
      {
        name: "customerId",
        label: "Customer ID",
        placeholder: "CUST-0001",
        icon: "id-card-outline",
        autoCapitalize: "characters",
        maxLength: 20,
      },
      {
        name: "customerName",
        label: "Customer name",
        placeholder: "Balaji Nursery Pvt Ltd",
        icon: "business-outline",
        autoCapitalize: "words",
      },
      {
        name: "alias",
        label: "Alias",
        placeholder: "Short name for lists",
        icon: "pricetag-outline",
        optional: true,
      },
      {
        name: "contactPerson",
        label: "Contact person",
        placeholder: "Who to call",
        icon: "person-outline",
        autoCapitalize: "words",
      },
      {
        name: "mobileNumber",
        label: "Mobile number",
        placeholder: "10-digit mobile",
        icon: "call-outline",
        keyboardType: "phone-pad",
        maxLength: 10,
      },
      {
        name: "telephoneNumber",
        label: "Telephone",
        placeholder: "Landline with STD code",
        icon: "keypad-outline",
        keyboardType: "phone-pad",
        optional: true,
      },
      {
        name: "email",
        label: "Email",
        placeholder: "accounts@company.com",
        icon: "mail-outline",
        keyboardType: "email-address",
        autoCapitalize: "none",
        optional: true,
      },
    ],
  },
  {
    key: "address",
    label: "Address",
    fields: [
      {
        name: "address",
        label: "Street address",
        placeholder: "Plot, street, landmark",
        icon: "location-outline",
        span: 2,
      },
      {
        name: "city",
        label: "City",
        placeholder: "Indore",
        icon: "map-outline",
        autoCapitalize: "words",
      },
      {
        name: "state",
        label: "State",
        placeholder: "Madhya Pradesh",
        icon: "map-outline",
        autoCapitalize: "words",
      },
      {
        name: "pinCode",
        label: "PIN code",
        placeholder: "452001",
        icon: "mail-open-outline",
        keyboardType: "number-pad",
        maxLength: 6,
      },
      {
        name: "country",
        label: "Country",
        placeholder: "India",
        icon: "earth-outline",
        autoCapitalize: "words",
      },
    ],
  },
  {
    key: "tax",
    label: "Tax details",
    fields: [
      {
        name: "panNumber",
        label: "PAN number",
        placeholder: "ABCDE1234F",
        icon: "card-outline",
        autoCapitalize: "characters",
        maxLength: 10,
        optional: true,
      },
      {
        name: "panName",
        label: "Name on PAN",
        placeholder: "As printed on the card",
        icon: "person-circle-outline",
        autoCapitalize: "words",
        optional: true,
      },
      {
        name: "gstNumber",
        label: "GST number",
        placeholder: "23ABCDE1234F1Z5",
        icon: "receipt-outline",
        autoCapitalize: "characters",
        maxLength: 15,
        optional: true,
      },
    ],
  },
];

/** Pack fields into rows adding up to at most `columns` worth of span. */
const packRows = (fields, columns) => {
  const limit = Math.max(1, Number(columns) || 1);
  const rows = [];
  let row = [];
  let used = 0;

  fields.forEach((field) => {
    const span = Math.min(Number(field.span) || 1, limit);
    if (used + span > limit) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push({ ...field, span });
    used += span;
  });

  if (row.length) rows.push(row);
  return rows;
};

const validate = (form) => {
  const errors = {};

  if (!form.customerId.trim()) errors.customerId = "Required.";
  if (!form.customerName.trim()) errors.customerName = "Required.";
  if (!form.address.trim()) errors.address = "Required.";
  if (!form.city.trim()) errors.city = "Required.";
  if (!form.state.trim()) errors.state = "Required.";
  if (!form.country.trim()) errors.country = "Required.";
  if (!form.contactPerson.trim()) errors.contactPerson = "Required.";

  if (!form.pinCode.trim()) errors.pinCode = "Required.";
  else if (!/^\d{6}$/.test(form.pinCode.trim()))
    errors.pinCode = "Enter 6 digits.";

  if (!form.mobileNumber.trim()) errors.mobileNumber = "Required.";
  else if (!/^\d{10}$/.test(form.mobileNumber.trim()))
    errors.mobileNumber = "Enter 10 digits.";

  if (form.email.trim() && !EMAIL_RE.test(form.email.trim()))
    errors.email = "Enter a valid email.";

  if (
    form.panNumber.trim() &&
    !PAN_RE.test(form.panNumber.trim().toUpperCase())
  )
    errors.panNumber = "Looks like ABCDE1234F.";

  if (
    form.gstNumber.trim() &&
    !GST_RE.test(form.gstNumber.trim().toUpperCase())
  )
    errors.gstNumber = "Needs 15 valid characters.";

  return errors;
};

/**
 * Create customer form.
 *
 * Fields scroll; the action bar is pinned below the scroll area so Save
 * and Cancel stay on screen at every size.
 *
 * On save the form confirms in a dialog and counts down before handing
 * control to `onCreated` — the user can leave early or stay and add
 * another customer instead.
 *
 * Props
 *  - onCreated  (customer) => void
 *  - onCancel   () => void
 */
export default function CreateCustomer({ onCreated, onCancel }) {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const styles = useMemo(
    () => makeStyles({ width, height, isTablet, isDesktop }),
    [width, height, isTablet, isDesktop],
  );

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  /** Saved customer awaiting redirect — null when the dialog is closed. */
  const [saved, setSaved] = useState(null);
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  // Keep the callback fresh without restarting the countdown each render.
  const onCreatedRef = useRef(onCreated);
  useEffect(() => {
    onCreatedRef.current = onCreated;
  }, [onCreated]);

  // One tick per second while the dialog is up; fires onCreated at zero.
  useEffect(() => {
    if (!saved) return undefined;

    if (seconds <= 0) {
      onCreatedRef.current?.(saved);
      return undefined;
    }

    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [saved, seconds]);

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  /** Leave now instead of waiting out the countdown. */
  const goNow = () => {
    const customer = saved;
    setSaved(null);
    onCreatedRef.current?.(customer);
  };

  /** Stay put with a blank form. */
  const addAnother = () => {
    setSaved(null);
    setSeconds(REDIRECT_SECONDS);
    setBanner(null);
  };

  const handleSubmit = async () => {
    const found = validate(form);
    setErrors(found);

    if (Object.keys(found).length) {
      setBanner({ type: "error", text: "Check the highlighted fields." });
      return;
    }

    setSaving(true);
    setBanner(null);

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    );
    payload.customerId = payload.customerId.toUpperCase();
    payload.panNumber = payload.panNumber.toUpperCase();
    payload.gstNumber = payload.gstNumber.toUpperCase();

    const response = await createCustomer(payload);
    setSaving(false);

    if (response?.status === "SUCCESS") {
      setForm(EMPTY);
      setErrors({});
      setSeconds(REDIRECT_SECONDS);
      setSaved(response.payload ?? payload);
    } else {
      const message = response?.message || "Could not save this customer.";

      // A clashing id belongs on the field, not buried in the banner.
      if (/exists|duplicate|already/i.test(message)) {
        setErrors({ customerId: "This ID is already taken." });
      }

      setBanner({ type: "error", text: message });
    }
  };

  const renderField = (field) => {
    const {
      name,
      label,
      placeholder,
      icon,
      optional = false,
      keyboardType = "default",
      autoCapitalize = "sentences",
      maxLength,
      span = 1,
    } = field;

    // flexBasis 0 keeps span widths exact regardless of placeholder length.
    const flexStyle = styles.isPhone
      ? null
      : { flexGrow: Number(span) || 1, flexShrink: 1, flexBasis: 0 };

    return (
      <View key={name} style={[styles.field, flexStyle]}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
          {optional ? null : <Text style={styles.required}> *</Text>}
        </Text>

        <View
          style={[
            styles.inputWrap,
            focused === name && styles.inputWrapFocused,
            errors[name] && styles.inputWrapError,
          ]}
        >
          <Ionicons
            name={icon}
            size={styles.iconSize}
            color={errors[name] ? styles.danger : styles.placeholderColor}
          />
          <TextInput
            style={styles.input}
            value={form[name]}
            onChangeText={setField(name)}
            onFocus={() => setFocused(name)}
            onBlur={() => setFocused(null)}
            placeholder={placeholder}
            placeholderTextColor={styles.placeholderColor}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            maxLength={maxLength}
          />
        </View>

        {errors[name] ? (
          <Text style={styles.errorText} numberOfLines={1}>
            {errors[name]}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {banner ? (
            <View
              style={[
                styles.banner,
                banner.type === "error"
                  ? styles.bannerError
                  : styles.bannerSuccess,
              ]}
            >
              <Ionicons
                name={
                  banner.type === "error"
                    ? "alert-circle-outline"
                    : "checkmark-circle-outline"
                }
                size={styles.iconSize}
                color={banner.type === "error" ? styles.danger : styles.green}
              />
              <Text style={styles.bannerText}>{banner.text}</Text>
            </View>
          ) : null}

          {SECTIONS.map((section) => (
            <View style={styles.section} key={section.key}>
              {section.label ? (
                <Text style={styles.sectionLabel}>{section.label}</Text>
              ) : null}

              {packRows(section.fields, styles.columns).map((row, index) => {
                const filled = row.reduce(
                  (sum, f) => sum + (Number(f.span) || 1),
                  0,
                );
                const remainder = (Number(styles.columns) || 1) - filled;

                return (
                  <View style={styles.row} key={`${section.key}-${index}`}>
                    {row.map(renderField)}
                    {!styles.isPhone && remainder > 0 ? (
                      <View
                        style={[
                          styles.spacer,
                          { flexGrow: remainder, flexShrink: 1, flexBasis: 0 },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Outside the ScrollView — always reachable. */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.buttonGhost,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              setForm(EMPTY);
              setErrors({});
              setBanner(null);
              onCancel?.();
            }}
            disabled={saving}
          >
            <Text style={[styles.buttonText, styles.buttonGhostText]}>
              CANCEL
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.buttonPrimary,
              pressed && styles.buttonPressed,
              saving && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="checkmark"
                size={styles.iconSize}
                color="#FFFFFF"
              />
            )}
            <Text style={styles.buttonText}>
              {saving ? "SAVING…" : "SAVE CUSTOMER"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Success dialog — confirms first, redirects after the countdown. */}
      <Modal
        visible={!!saved}
        transparent
        animationType="fade"
        onRequestClose={goNow}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="checkmark" size={34} color="#FFFFFF" />
            </View>

            <Text style={styles.modalTitle}>Customer saved</Text>

            <Text style={styles.modalBody}>
              {saved?.customerName || "The customer"}
              {saved?.customerId ? ` (${saved.customerId})` : ""} is ready to
              use on quotations and invoices.
            </Text>

            <Text style={styles.modalCountdown}>
              Returning in {Math.max(seconds, 0)}…
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.buttonGhost,
                  styles.modalButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={addAnother}
              >
                <Text style={[styles.buttonText, styles.buttonGhostText]}>
                  ADD ANOTHER
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.buttonPrimary,
                  styles.modalButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={goNow}
              >
                <Text style={styles.buttonText}>GO NOW</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
