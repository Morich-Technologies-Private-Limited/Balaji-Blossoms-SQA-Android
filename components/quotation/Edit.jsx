import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

import { downloadQuotationPdf } from "../../api/downloadQuotationPdf";
import { fetchPackingList } from "../../api/fetchPacking";
import { getApplicableOffer } from "../../api/getOffer";
import { getSpecialPlantByBarcodeId } from "../../api/getSpecialPlant";
import { searchPlants } from "../../api/plantApi";
import {
  generateInvoice,
  moveToLoadingShade,
} from "../../api/quotationActions.js";
import { updateQuotationPlants } from "../../api/updateQuotation";

import PdfShareSheet from "../../utility/PdfShareSheet";
import { getCurrentUser } from "../../utility/secureStorage";
import makeStyles from "./Edit.styles";

const LEVEL_META = {
  DRAFT: { label: "Draft", tint: "#E8622C" },
  DELIVERY_SHADE: { label: "Delivery shade", tint: "#0F4776" },
  INVOICE_GENERATED: { label: "Invoiced", tint: "#16A34A" },
};

const SEARCH_DEBOUNCE = 350;
const NO_PACKING = { packingId: null, packingName: "No packing", price: 0 };

/* Selected-by-customer is a two-value dropdown. New rows default to NO. */
const CHOICE_OPTIONS = [
  { value: false, label: "No", hint: "Added by the nursery" },
  { value: true, label: "Yes", hint: "The customer asked for it" },
];

/* Offered in the reason modal as one-tap fills. */
const REASON_PRESETS = [
  "Customer changed the order",
  "Stock not available",
  "Damaged in transit",
  "Packing revised",
  "Entered by mistake",
];

/* Breakpoints measured on the table container.
   Columns are dropped in reverse order of importance as space runs out, and
   their values move into the plant cell or the quantity hint. */
const BP_CALC = 1180; // dedicated seedling maths column
const BP_CHOICE = 1040; // "selected by" column
const BP_PRICE = 940; // unit price column
const BP_SNO = 860; // serial number column
const BP_CARD = 760; // below this the grid becomes editable cards

const norm = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/** The backend enum is spelled SEELDING; accept the correct spelling too. */
const isSeedling = (plantType) => norm(plantType).startsWith("se");

const toCount = (value) => {
  const parsed = parseInt(String(value ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toMoney = (value) => {
  const parsed = parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

/** Money always shows paise, the way ledgers do: ₹2,250.00 */
const formatAmount = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

let lineSeq = 0;
const nextKey = () => `line-${(lineSeq += 1)}`;

const packingForSize = (size, packings) =>
  packings.find((packing) => norm(packing.size) === norm(size)) || null;

const packingLabel = (packing) =>
  packing?.packingName || packing?.size || NO_PACKING.packingName;

/** What the customer is actually billed: the discount wins when there is one. */
const priceOf = (source) => {
  const discounted = toMoney(source?.discountedPrice);
  if (discounted > 0) return discounted;
  return toMoney(source?.price ?? source?.plantPrice ?? source?.unitPrice ?? 0);
};

const listPriceOf = (source) =>
  toMoney(source?.price ?? source?.plantPrice ?? source?.unitPrice ?? 0);

/** Offer discount is a flat amount off the unit price, fetched per quantity.
    Display only: it never changes the saved quotation or the billed amount, and
    it is not applied to special plants. */
const offerDiscountOf = (line) => Math.max(0, toMoney(line?.offerDiscount));
const effectivePriceOf = (line) =>
  Math.max(0, toMoney(line?.price) - offerDiscountOf(line));

/** A special plant is scanned in by barcode; its quantity is always 1, so it is
    not editable, and the offer API does not apply to it. */
const specialFromRecord = (record) => ({
  key: nextKey(),
  barcodeId: record?.barcodeId,
  plantName: record?.plantName || "Special plant",
  price: toMoney(record?.price),
  unitId: record?.unitId ?? null,
  unitName: record?.unitName ?? null,
  status: record?.status ?? null,
  arrivalDate: record?.arrivalDate ?? null,
  departureDate: record?.departureDate ?? null,
});

/** Jackson serialises `isSelectedByCustomer` both ways depending on config.
    Unlike before, an absent value now means NO — new rows are the nursery's
    until somebody says otherwise. */
const chosenByCustomer = (source) =>
  source?.selectedByCustomer ?? source?.isSelectedByCustomer ?? false;

const subtitleOf = (source, seedling) =>
  source?.botanicalName ||
  source?.scientificName ||
  source?.variety ||
  (seedling ? "Sold by tray" : "Single plant");

const derivedQuantity = (line) => {
  const entered = toCount(line.quantity);
  const traySize = toCount(line.traySize);
  return line.seedling && traySize > 0 ? entered * traySize : entered;
};

const lineAmount = (line) => derivedQuantity(line) * toMoney(line.price);

const linePacking = (line) =>
  toCount(line.quantity) * toMoney(line.packingCharge);

const unitWord = (line) => (line.seedling ? "trays" : "plants");

/* ── per-row change detection ────────────────────────────────────────
   Each row remembers the values it was last saved with (the `base*` fields).
   These helpers say what moved, and are also what the reason modal lists. */

const quantityChanged = (line) =>
  line.isNew || toCount(line.quantity) !== toCount(line.baseQuantity);

const packingChanged = (line) =>
  !line.isNew &&
  (line.packingName !== line.basePackingName ||
    toMoney(line.packingCharge) !== toMoney(line.basePackingCharge));

const choiceChanged = (line) =>
  !line.isNew && !!line.selectedByCustomer !== !!line.baseSelectedByCustomer;

const unitChanged = (line) =>
  !line.isNew && (line.unitId ?? null) !== (line.baseUnitId ?? null);

const lineChanged = (line) =>
  quantityChanged(line) ||
  packingChanged(line) ||
  choiceChanged(line) ||
  unitChanged(line);

/** Everything the save call cares about, flattened so it can be compared. */
const signatureOf = (lines) =>
  JSON.stringify(
    lines.map((line) => [
      line.plantId,
      line.unitId ?? 0,
      toCount(line.quantity),
      line.packingName,
      toMoney(line.packingCharge),
      line.selectedByCustomer ? 1 : 0,
    ]),
  );

/** The whole saveable document: the lines, the special plants, plus the two
    quotation-level money fields. Used for change tracking so a discount, a
    transport edit, or a scanned special plant alone still counts as dirty. */
const stateSignatureOf = (lines, discount, remark, transport, specials) =>
  `${signatureOf(lines)}|${toMoney(discount)}|${String(
    remark ?? "",
  ).trim()}|${toMoney(transport)}|${(specials || [])
    .map((special) => special.barcodeId)
    .sort()
    .join(",")}`;

const lineFromReservation = (reservation, isDraft) => {
  const seedling = isSeedling(reservation.plantType);

  const quantity = isDraft
    ? seedling
      ? reservation.trayReserved
      : reservation.quantityReserved
    : seedling
      ? reservation.trayDelivered
      : reservation.quantityDelivered;

  const packingName = reservation.packingName || NO_PACKING.packingName;
  const packingCharge = String(reservation.packingCharge ?? 0);
  const chosen = chosenByCustomer(reservation);

  return {
    key: nextKey(),
    plantId: reservation.plantId,
    plantName: reservation.plantName,
    plantSubtitle: subtitleOf(reservation, seedling),
    size: reservation.size,
    plantType: reservation.plantType,
    seedling,
    price: priceOf(reservation),
    listPrice: listPriceOf(reservation),
    traySize: reservation.traySize ?? null,
    unitId: reservation.unitId ?? null,
    unitName: reservation.unitName ?? null,
    available: null,
    inventoryList: null,
    quantity: String(quantity ?? 0),
    reserved: seedling
      ? reservation.trayReserved
      : reservation.quantityReserved,
    packingId: null,
    packingName,
    packingCharge,
    packingManual: false,
    selectedByCustomer: chosen,
    /* the saved baseline this row is compared against */
    baseQuantity: String(quantity ?? 0),
    basePackingName: packingName,
    basePackingCharge: packingCharge,
    baseSelectedByCustomer: chosen,
    baseUnitId: reservation.unitId ?? null,
    checked: false,
    isNew: false,
  };
};

/** Fold a freshly saved row back into its baseline: same values, nothing dirty. */
const settleLine = (line) => ({
  ...line,
  baseQuantity: String(toCount(line.quantity)),
  basePackingName: line.packingName,
  basePackingCharge: line.packingCharge,
  baseSelectedByCustomer: !!line.selectedByCustomer,
  baseUnitId: line.unitId ?? null,
  isNew: false,
});

/** Audit rows come back on the quotation; normalise the shapes we might get. */
const auditFromRecord = (record, index) => ({
  key: `audit-${index}`,
  values: record?.description || record?.values || "—",
  reason: record?.reason || "",
  updatedBy: record?.updatedBy || record?.updatedByName || "",
  date: record?.date || record?.updatedDate || record?.updateDate || null,
});

/* ── row ───────────────────────────────────────────────────────────── */

const TableRow = memo(function TableRow({ item, index, columns, styles }) {
  const dirty = lineChanged(item);

  return (
    <View style={styles.rowGroup}>
      <View
        style={[
          styles.row,
          index % 2 === 1 && styles.rowAlt,
          dirty && styles.rowDirty,
        ]}
      >
        {columns.map((col) => (
          <View
            key={col.key}
            style={[
              styles.cellWrap,
              { width: col.size },
              col.align === "right"
                ? styles.alignRight
                : col.align === "center"
                  ? styles.alignCenter
                  : styles.alignLeft,
            ]}
          >
            {col.render(item, index)}
          </View>
        ))}
      </View>
    </View>
  );
});

/* ── transport modal ─────────────────────────────────────────────────
   One field: a flat transport cost added to the whole order. Keeps its own
   draft so Cancel discards cleanly and Apply commits in one go. */
function TransportModal({ styles, initialTransport, onApply, onClose }) {
  const C = styles.colors;
  const [transport, setTransport] = useState(initialTransport);
  const value = toMoney(transport);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Transport cost</Text>
            <Text style={styles.sheetSubtitle}>
              Added to the whole quotation
            </Text>
          </View>

          <View style={styles.adjustBody}>
            <View style={styles.adjustField}>
              <View style={styles.moneyHead}>
                <Ionicons name="car-outline" size={15} color={C.NAVY} />
                <Text style={styles.moneyLabel}>Transport cost</Text>
              </View>
              <View style={styles.chargeBoxLg}>
                <Text style={styles.chargePrefixLg}>₹</Text>
                <TextInput
                  style={styles.chargeInputLg}
                  value={transport}
                  onChangeText={(v) => setTransport(v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  autoFocus
                  placeholder="0"
                  placeholderTextColor={C.FAINT}
                />
                <Text style={styles.chargeSuffixLg}>on order</Text>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.modalCancel,
                (hovered || pressed) && styles.ghostButtonHover,
              ]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </Pressable>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.modalApply,
                (hovered || pressed) && styles.primaryButtonHover,
              ]}
              onPress={() => onApply(value > 0 ? String(value) : "")}
            >
              <Text style={styles.modalApplyText}>APPLY</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── discount modal ──────────────────────────────────────────────────
   A flat discount off the whole order plus its compulsory remark. */
function DiscountModal({
  styles,
  subtotal,
  transport,
  initialDiscount,
  initialRemark,
  onApply,
  onClose,
}) {
  const C = styles.colors;
  const [discount, setDiscount] = useState(initialDiscount);
  const [remark, setRemark] = useState(initialRemark);

  const discountValue = toMoney(discount);
  const beforeDiscount = subtotal + toMoney(transport);

  const remarkMissing = discountValue > 0 && !remark.trim();
  const overTotal = discountValue > beforeDiscount;
  const invalid = remarkMissing || overTotal;

  const apply = () => {
    if (invalid) return;
    onApply({
      discount: discountValue > 0 ? String(discountValue) : "",
      remark: discountValue > 0 ? remark.trim() : "",
    });
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Additional discount</Text>
            <Text style={styles.sheetSubtitle}>
              Taken off the whole quotation
            </Text>
          </View>

          <View style={styles.adjustBody}>
            <View style={styles.adjustField}>
              <View style={styles.moneyHead}>
                <Ionicons name="pricetag-outline" size={15} color={C.NAVY} />
                <Text style={styles.moneyLabel}>Discount amount</Text>
              </View>

              <View
                style={[styles.chargeBoxLg, overTotal && styles.qtyBoxWarn]}
              >
                <Text style={styles.chargePrefixLg}>₹</Text>
                <TextInput
                  style={styles.chargeInputLg}
                  value={discount}
                  onChangeText={(v) => setDiscount(v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  autoFocus
                  placeholder="0"
                  placeholderTextColor={C.FAINT}
                />
                <Text style={styles.chargeSuffixLg}>off total</Text>
              </View>
            </View>

            <View style={styles.adjustField}>
              <View style={styles.moneyHead}>
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={15}
                  color={C.NAVY}
                />
                <Text style={styles.moneyLabel}>
                  Reason {discountValue > 0 ? "(required)" : ""}
                </Text>
              </View>

              <TextInput
                style={[
                  styles.discountRemarkInput,
                  remarkMissing && styles.discountRemarkInputError,
                ]}
                value={remark}
                onChangeText={setRemark}
                placeholder="Why is this discount being given?"
                placeholderTextColor={C.FAINT}
                multiline
              />

              {remarkMissing ? (
                <Text style={styles.adjustError}>
                  A reason is required for the discount.
                </Text>
              ) : overTotal ? (
                <Text style={styles.adjustError}>
                  The discount is more than the order total (
                  {formatAmount(beforeDiscount)}).
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.modalCancel,
                (hovered || pressed) && styles.ghostButtonHover,
              ]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </Pressable>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.modalApply,
                (hovered || pressed) && !invalid && styles.primaryButtonHover,
                invalid && styles.primaryButtonDisabled,
              ]}
              onPress={apply}
              disabled={invalid}
            >
              <Text style={styles.modalApplyText}>APPLY</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── special plant modal ─────────────────────────────────────────────
   Scan or type a barcode, look it up, and add it. */
function SpecialPlantModal({ styles, onAdd, onClose }) {
  const C = styles.colors;

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);

  const submit = async () => {
    if (busy || !code.trim()) return;
    setError(null);
    setBusy(true);
    const result = await onAdd(code);
    setBusy(false);
    if (!result?.ok) {
      setError(result?.message || "No special plant found for that barcode.");
      return;
    }
    setLastAdded(result.plant?.plantName || code.trim());
    setCode("");
  };

  const disabled = busy || !code.trim();

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add special plant</Text>
            <Text style={styles.sheetSubtitle}>
              Scanned by barcode · quantity is always 1
            </Text>
          </View>

          <View style={styles.adjustBody}>
            <View style={styles.adjustField}>
              <View style={styles.moneyHead}>
                <Ionicons name="barcode-outline" size={15} color={C.NAVY} />
                <Text style={styles.moneyLabel}>Barcode ID</Text>
              </View>

              <View style={styles.searchWrap}>
                <Ionicons name="scan-outline" size={17} color={C.FAINT} />
                <TextInput
                  style={styles.searchInput}
                  value={code}
                  onChangeText={(value) => {
                    setCode(value);
                    setError(null);
                  }}
                  placeholder="Scan or type a barcode ID"
                  placeholderTextColor={C.FAINT}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  editable={!busy}
                />
                {busy ? <ActivityIndicator color={C.NAVY} /> : null}
              </View>

              {error ? (
                <Text style={styles.adjustError}>{error}</Text>
              ) : lastAdded ? (
                <View style={styles.moneyReadItem}>
                  <Ionicons name="checkmark-circle" size={15} color={C.GREEN} />
                  <Text style={styles.moneyReadText}>Added {lastAdded}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.modalCancel,
                (hovered || pressed) && styles.ghostButtonHover,
              ]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>DONE</Text>
            </Pressable>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.modalApply,
                (hovered || pressed) && !disabled && styles.primaryButtonHover,
                disabled && styles.primaryButtonDisabled,
              ]}
              onPress={submit}
              disabled={disabled}
            >
              <Text style={styles.modalApplyText}>ADD</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── reason modal ────────────────────────────────────────────────────
   The single place a reason is ever collected. It is a gate in front of an
   action, not a field on a row: it summarises what is about to be recorded,
   takes one reason, and hands it back so the caller can run the action.

   `request` is { title, summary, changes[], confirmLabel, confirmTone }.
   Each change is { icon, tone, title, detail?, from?, to? }. */
function ReasonModal({ styles, request, busy, onSubmit, onClose }) {
  const C = styles.colors;
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const trimmed = reason.trim();
  const missing = trimmed.length === 0;
  const tooShort = !missing && trimmed.length < 3;
  const invalid = missing || tooShort;

  const submit = () => {
    setTouched(true);
    if (invalid || busy) return;
    onSubmit(trimmed);
  };

  const changes = request?.changes || [];
  const destructive = request?.confirmTone === "danger";

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={busy ? () => {} : onClose}
    >
      <Pressable
        style={styles.sheetBackdrop}
        onPress={busy ? undefined : onClose}
      >
        <Pressable style={styles.reasonSheet} onPress={() => {}}>
          {/* header */}
          <View style={styles.reasonHeader}>
            <View style={styles.reasonHeaderIcon}>
              <Ionicons
                name={destructive ? "trash-outline" : "create-outline"}
                size={20}
                color={C.ALERT}
              />
            </View>
            <View style={styles.reasonHeaderText}>
              <Text style={styles.reasonTitle}>Reason Required</Text>
              <Text style={styles.reasonSubtitle}>
                {request?.summary ||
                  "This quotation has left draft, so the change has to be recorded."}
              </Text>
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.reasonBody}>
              {/* values updated */}
              <View style={styles.reasonBlock}>
                <View style={styles.reasonBlockHead}>
                  <Ionicons name="list-outline" size={15} color={C.NAVY} />
                  <Text style={styles.reasonBlockLabel}>Values updated</Text>
                  {changes.length > 1 ? (
                    <View style={styles.reasonCountTag}>
                      <Text style={styles.reasonCountText}>
                        {changes.length}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.changeList}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {changes.map((change, index) => (
                      <View
                        key={`${change.title}-${index}`}
                        style={[
                          styles.changeRow,
                          index === changes.length - 1 && styles.changeRowLast,
                        ]}
                      >
                        <View
                          style={[
                            styles.changeIcon,
                            change.tone === "add" && styles.changeIconAdd,
                            change.tone === "remove" && styles.changeIconRemove,
                            change.tone === "edit" && styles.changeIconEdit,
                          ]}
                        >
                          <Ionicons
                            name={change.icon || "ellipse-outline"}
                            size={13}
                            color={
                              change.tone === "add"
                                ? C.GREEN_DEEP
                                : change.tone === "remove"
                                  ? C.RED
                                  : C.ALERT
                            }
                          />
                        </View>

                        <View style={styles.changeBody}>
                          <Text style={styles.changeTitle}>{change.title}</Text>
                          {change.detail ? (
                            <Text style={styles.changeDetail}>
                              {change.detail}
                            </Text>
                          ) : null}
                          {change.from != null && change.to != null ? (
                            <View style={styles.changeFromTo}>
                              <Text style={styles.changeFrom}>
                                {change.from}
                              </Text>
                              <Ionicons
                                name="arrow-forward"
                                size={12}
                                color={C.MUTED}
                              />
                              <Text style={styles.changeTo}>{change.to}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ))}

                    {changes.length === 0 ? (
                      <View style={[styles.changeRow, styles.changeRowLast]}>
                        <View style={styles.changeBody}>
                          <Text style={styles.changeDetail}>
                            No field-level detail for this action.
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </ScrollView>
                </View>
              </View>

              {/* the reason itself */}
              <View style={styles.reasonBlock}>
                <View style={styles.reasonBlockHead}>
                  <Ionicons
                    name="chatbox-ellipses-outline"
                    size={15}
                    color={C.NAVY}
                  />
                  <Text style={styles.reasonBlockLabel}>Reason</Text>
                </View>

                <TextInput
                  style={[
                    styles.reasonInputLg,
                    focused && styles.reasonInputLgFocus,
                    touched && invalid && styles.reasonInputLgError,
                  ]}
                  value={reason}
                  onChangeText={setReason}
                  onFocus={() => setFocused(true)}
                  onBlur={() => {
                    setFocused(false);
                    setTouched(true);
                  }}
                  placeholder="Explain why this change is being made. This is stored on the quotation history."
                  placeholderTextColor={C.FAINT}
                  multiline
                  autoFocus
                  editable={!busy}
                  maxLength={300}
                />

                <View style={styles.reasonFootRow}>
                  {touched && missing ? (
                    <Text style={styles.reasonHelpError}>
                      A reason is required.
                    </Text>
                  ) : touched && tooShort ? (
                    <Text style={styles.reasonHelpError}>
                      Add a little more detail.
                    </Text>
                  ) : (
                    <Text style={styles.reasonHelp}>
                      Saved against this quotation&apos;s audit history.
                    </Text>
                  )}
                  <Text style={styles.reasonCounter}>{trimmed.length}/300</Text>
                </View>

                <View style={styles.reasonChipRow}>
                  {REASON_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      style={({ hovered, pressed }) => [
                        styles.reasonChip,
                        (hovered || pressed) && styles.reasonChipHover,
                      ]}
                      onPress={() => {
                        setReason(preset);
                        setTouched(true);
                      }}
                      disabled={busy}
                    >
                      <Text style={styles.reasonChipText}>{preset}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* actions */}
          <View style={styles.reasonActions}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.modalCancel,
                (hovered || pressed) && styles.ghostButtonHover,
              ]}
              onPress={onClose}
              disabled={busy}
            >
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </Pressable>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.modalApply,
                (hovered || pressed) && !invalid && styles.primaryButtonHover,
                (invalid || busy) && styles.primaryButtonDisabled,
              ]}
              onPress={submit}
              disabled={invalid || busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="save-outline" size={17} color="#FFFFFF" />
              )}
              <Text style={styles.modalApplyText}>
                {busy ? "SAVING…" : request?.confirmLabel || "SAVE"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Edit the plants on a quotation.
 *
 * Level drives the whole screen. In Draft the grid is fully editable and
 * nothing is audited: plants can be added, removed, re-quantified, re-packed
 * and re-flagged, then saved, without ever being asked for a reason. Once the
 * quotation leaves Draft every change is history, so the Reason Modal gates the
 * save and the delete; in Delivery shade each row also gets a tick box so the
 * packer can check items off. Once invoiced the screen is read-only.
 *
 * `selectedByCustomer` is a Yes / No dropdown. New rows default to **No** — a
 * plant belongs to the nursery until somebody says the customer asked for it.
 *
 * Reasons are never collected inline. The Reason Modal opens only when one is
 * actually required (past Draft), lists exactly what is about to be recorded
 * under "Values updated", takes a single reason, and then runs the action it
 * was gating. That same reason is sent on every changed row of the save.
 *
 * Saving is deliberately inert: SAVE CHANGES, MOVE TO LOADING SHADE and
 * GENERATE INVOICE all call `updateQuotationPlants` and stop. Nothing chains
 * into `moveToLoadingShade` or `generateInvoice`; those run only from their own
 * dedicated confirm, once there is nothing left unsaved. The modal never closes
 * on save — the response is folded back into the screen by `rehydrate`, so the
 * plant list, special plants, packing, discount, transport, offers and every
 * total refresh in place.
 *
 * Layout contract: the grid never scrolls sideways. Column widths come from the
 * measured container and the plant column absorbs the remainder. Under 760px
 * each row becomes an editable card.
 *
 * The screen holds the complete final state of the quotation and sends it in
 * one call: rows removed here are removed on the server. The request shape is
 * unchanged — for seedlings the tray count is still what goes over the wire.
 */
export default function Edit({ quotation, onClose, onSaved }) {
  const { width } = useWindowDimensions();
  const [avail, setAvail] = useState(0);

  const space = avail || width;
  const isCardMode = space < BP_CARD;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const large = isTablet || isDesktop;

  const styles = useMemo(
    () => makeStyles({ width, isTablet, isDesktop, isCardMode }),
    [width, isTablet, isDesktop, isCardMode],
  );
  const C = styles.colors;

  /* The level is held in state so a save response can move the screen on
     without the parent having to remount it. */
  const [level, setLevel] = useState(quotation?.level);

  const isDraft = level === "DRAFT";
  const isDelivery = level === "DELIVERY_SHADE";
  const isInvoiced = level === "INVOICE_GENERATED";

  const canEditLines = !isInvoiced; // quantities, units, packing, add and remove
  const canEditTotals = !isInvoiced; // discount, transport, specials
  const showChecks = isDelivery; // tick boxes live in the action column
  /* Draft is not history. Nothing before this point is audited or reasoned. */
  const auditActive = !isDraft;

  const levelMeta = LEVEL_META[level] || {
    label: level || "—",
    tint: "#94A3B8",
  };

  const initialLines = useMemo(
    () =>
      (quotation?.plantList || []).map((row) =>
        lineFromReservation(row, quotation?.level === "DRAFT"),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const initialSpecials = useMemo(
    () => (quotation?.specialPlantList || []).map(specialFromRecord),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [lines, setLines] = useState(initialLines);
  const [specials, setSpecials] = useState(initialSpecials);
  const [specialOpen, setSpecialOpen] = useState(false);

  /* Quotation-level money fields. Stored as strings so the input can be
     cleared; coerced with toMoney everywhere they are used. */
  const [discount, setDiscount] = useState(() => {
    const value = toMoney(quotation?.additionalDiscount);
    return value > 0 ? String(value) : "";
  });
  const [discountRemark, setDiscountRemark] = useState(
    () => quotation?.additionalDiscountRemark || "",
  );
  const [transport, setTransport] = useState(() => {
    const value = toMoney(quotation?.transportationCost);
    return value > 0 ? String(value) : "";
  });
  const [transportOpen, setTransportOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);

  /* Audit history, refreshed from every save response. */
  const [auditTrail, setAuditTrail] = useState(() =>
    (quotation?.invoiceUpdateDetailList || []).map(auditFromRecord),
  );
  const [auditOpen, setAuditOpen] = useState(false);

  const baselineRef = useRef(
    stateSignatureOf(
      initialLines,
      quotation?.additionalDiscount,
      quotation?.additionalDiscountRemark,
      quotation?.transportationCost,
      initialSpecials,
    ),
  );

  const [packings, setPackings] = useState([]);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picker, setPicker] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null); // "shade" | "invoice" | "pdf" | null
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [userId, setUserId] = useState(null);
  const [pdf, setPdf] = useState(null);

  /* The reason modal is a gate in front of a pending action. */
  const [pendingAction, setPendingAction] = useState(null);

  const searchTimer = useRef(null);
  const searchRef = useRef(null);

  /* ── bootstrap ───────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [user, packingResponse] = await Promise.all([
        getCurrentUser(),
        fetchPackingList(),
      ]);
      if (!alive) return;
      setUserId(user?.emailId || null);
      if (packingResponse?.status === "SUCCESS") {
        setPackings(packingResponse.payload || []);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ── plant search ────────────────────────────────────────────────── */
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const key = term.trim();
    if (key.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const response = await searchPlants(key, 20);
      setResults(response?.status === "SUCCESS" ? response.payload || [] : []);
      setSearching(false);
    }, SEARCH_DEBOUNCE);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [term]);

  /* ── offer lookup (display only) ─────────────────────────────────── */
  const offerCache = useRef(new Map());

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      const pending = lines.filter(
        (line) =>
          line.plantId != null &&
          toCount(line.quantity) > 0 &&
          line.offerKey !== `${line.plantId}:${toCount(line.quantity)}`,
      );
      if (pending.length === 0) return;

      const resolved = await Promise.all(
        pending.map(async (line) => {
          const qty = toCount(line.quantity);
          const key = `${line.plantId}:${qty}`;
          let value = offerCache.current.get(key);
          if (value === undefined) {
            const response = await getApplicableOffer(line.plantId, qty);
            value =
              response?.status === "SUCCESS"
                ? toMoney(response.payload?.discount)
                : 0;
            offerCache.current.set(key, value);
          }
          return { key: line.key, offerKey: key, discount: value };
        }),
      );

      if (!alive) return;
      setLines((prev) =>
        prev.map((line) => {
          const hit = resolved.find((r) => r.key === line.key);
          return hit
            ? { ...line, offerDiscount: hit.discount, offerKey: hit.offerKey }
            : line;
        }),
      );
    }, SEARCH_DEBOUNCE);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [lines]);

  /* A transient success banner clears itself. */
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const updateLine = useCallback((key, patch) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }, []);

  const dropLine = useCallback((key) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const toggleCheck = useCallback((key) => {
    setLines((prev) =>
      prev.map((line) =>
        line.key === key ? { ...line, checked: !line.checked } : line,
      ),
    );
  }, []);

  const toggleCheckAll = useCallback(() => {
    setLines((prev) => {
      const checkable = prev.filter((line) => !line.isNew);
      const next = !checkable.every((line) => line.checked);
      return prev.map((line) =>
        line.isNew ? line : { ...line, checked: next },
      );
    });
  }, []);

  const addPlant = useCallback(
    (plant) => {
      const inventory = plant.inventoryList || [];
      const preferred =
        inventory.find((row) => row.unitId === quotation?.unitId) ||
        inventory.find((row) => (row.quantity || 0) > 0) ||
        inventory[0] ||
        null;

      setLines((prev) => {
        const existing = prev.find(
          (line) =>
            line.plantId === plant.plantId &&
            line.unitId === (preferred?.unitId ?? null),
        );

        if (existing) {
          return prev.map((line) =>
            line.key === existing.key
              ? { ...line, quantity: String(toCount(line.quantity) + 1) }
              : line,
          );
        }

        const packing = packingForSize(plant.size, packings);
        const seedling = isSeedling(plant.plantType);
        const packingName = packingLabel(packing);
        const packingCharge = String(packing?.price ?? 0);

        return [
          ...prev,
          {
            key: nextKey(),
            plantId: plant.plantId,
            plantName: plant.plantName,
            plantSubtitle: subtitleOf(plant, seedling),
            size: plant.size,
            plantType: plant.plantType,
            seedling,
            price: priceOf(plant),
            listPrice: listPriceOf(plant),
            traySize: preferred?.traySize ?? null,
            unitId: preferred?.unitId ?? null,
            unitName: preferred?.unitName ?? null,
            available: preferred?.quantity ?? null,
            inventoryList: inventory,
            quantity: "1",
            reserved: null,
            packingId: packing?.packingId ?? null,
            packingName,
            packingCharge,
            packingManual: false,
            /* new rows are the nursery's until told otherwise */
            selectedByCustomer: false,
            baseQuantity: "0",
            basePackingName: packingName,
            basePackingCharge: packingCharge,
            baseSelectedByCustomer: false,
            baseUnitId: preferred?.unitId ?? null,
            checked: false,
            isNew: true,
          },
        ];
      });

      setTerm("");
      setResults([]);
    },
    [packings, quotation?.unitId],
  );

  /* ── special plants (barcode) ────────────────────────────────────── */
  const addSpecialByBarcode = useCallback(
    async (rawCode) => {
      const code = String(rawCode || "").trim();
      if (!code) return { ok: false, message: "Enter a barcode ID." };

      if (specials.some((special) => norm(special.barcodeId) === norm(code))) {
        return {
          ok: false,
          message: "That barcode is already on the quotation.",
        };
      }

      const response = await getSpecialPlantByBarcodeId(code);
      if (response?.status !== "SUCCESS" || !response.payload) {
        return {
          ok: false,
          message:
            response?.message || "No special plant found for that barcode.",
        };
      }

      setSpecials((prev) => [...prev, specialFromRecord(response.payload)]);
      return { ok: true, plant: response.payload };
    },
    [specials],
  );

  const removeSpecial = useCallback((key) => {
    setSpecials((prev) => prev.filter((special) => special.key !== key));
  }, []);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus?.();
  }, []);

  /* ── pickers ─────────────────────────────────────────────────────── */
  const openUnitPicker = useCallback(
    async (line) => {
      setPicker({ type: "unit", key: line.key, loading: !line.inventoryList });
      if (line.inventoryList) return;

      const response = await searchPlants(line.plantName, 20);
      const match =
        response?.status === "SUCCESS"
          ? (response.payload || []).find((p) => p.plantId === line.plantId)
          : null;

      updateLine(line.key, {
        inventoryList: match?.inventoryList || [],
        ...(match && !line.price ? { price: priceOf(match) } : null),
      });
      setPicker((prev) =>
        prev && prev.key === line.key ? { ...prev, loading: false } : prev,
      );
    },
    [updateLine],
  );

  const openPackingPicker = useCallback((key) => {
    setPicker({ type: "packing", key });
  }, []);

  const openChoicePicker = useCallback((key) => {
    setPicker({ type: "choice", key });
  }, []);

  const chooseUnit = useCallback(
    (line, inventory) => {
      updateLine(line.key, {
        unitId: inventory.unitId,
        unitName: inventory.unitName,
        traySize: inventory.traySize ?? line.traySize,
        available: inventory.quantity ?? null,
      });
      setPicker(null);
    },
    [updateLine],
  );

  const choosePacking = useCallback(
    (line, packing) => {
      updateLine(line.key, {
        packingId: packing.packingId ?? null,
        packingName: packingLabel(packing),
        packingCharge: String(packing.price ?? 0),
        packingManual: false,
      });
      setPicker(null);
    },
    [updateLine],
  );

  const chooseChoice = useCallback(
    (line, option) => {
      updateLine(line.key, { selectedByCustomer: option.value });
      setPicker(null);
    },
    [updateLine],
  );

  const activeLine = useMemo(
    () => lines.find((line) => line.key === picker?.key) || null,
    [lines, picker],
  );

  /* ── totals ──────────────────────────────────────────────────────── */
  const totals = useMemo(() => {
    let quantity = 0;
    let plantAmount = 0;
    let packing = 0;

    lines.forEach((line) => {
      quantity += derivedQuantity(line);
      plantAmount += lineAmount(line);
      packing += linePacking(line);
    });

    const special = specials.reduce((sum, sp) => sum + toMoney(sp.price), 0);

    const subtotal = plantAmount + packing + special;
    const transportValue = toMoney(transport);
    const beforeDiscount = subtotal + transportValue;
    const discountValue = Math.min(toMoney(discount), beforeDiscount);

    return {
      rows: lines.length,
      quantity,
      plantAmount,
      packing,
      special,
      specialRows: specials.length,
      subtotal,
      transport: transportValue,
      beforeDiscount,
      discount: discountValue,
      grand: beforeDiscount - discountValue,
    };
  }, [lines, specials, discount, transport]);

  /* ── change tracking ─────────────────────────────────────────────── */
  const dirty = useMemo(
    () =>
      stateSignatureOf(lines, discount, discountRemark, transport, specials) !==
      baselineRef.current,
    [lines, discount, discountRemark, transport, specials],
  );

  const changedLines = useMemo(() => lines.filter(lineChanged), [lines]);

  const incomplete = lines.some(
    (line) => !line.unitId || toCount(line.quantity) <= 0,
  );

  const discountEntered = toMoney(discount);
  const transportEntered = toMoney(transport);
  const discountRemarkMissing = discountEntered > 0 && !discountRemark.trim();
  const discountOverTotal = discountEntered > totals.beforeDiscount;

  const checkableLines = lines.filter((line) => !line.isNew);
  const checkedCount = checkableLines.filter((line) => line.checked).length;
  const allChecked =
    checkableLines.length > 0 && checkedCount === checkableLines.length;

  const working = saving || busy !== null;

  const blockingReason = !userId
    ? "Signed-in user not found. Sign in again to save."
    : incomplete
      ? "Every row needs a unit and a quantity above zero."
      : discountRemarkMissing
        ? "Add a remark for the additional discount."
        : discountOverTotal
          ? "The discount is more than the order total."
          : null;

  const canSave = dirty && !working && !blockingReason;

  const applyTransport = useCallback((value) => {
    setTransport(value);
    setTransportOpen(false);
  }, []);

  const applyDiscount = useCallback((next) => {
    setDiscount(next.discount);
    setDiscountRemark(next.remark);
    setDiscountOpen(false);
  }, []);

  /* ── rehydrate from a save response ──────────────────────────────────
     The modal never closes on save, so everything the server recomputed —
     prices, offers, packing amounts, totals, the level itself and the audit
     trail — is folded back into the screen here. Tick state is preserved by
     plant + unit so a packer does not lose their place. */
  const rehydrate = useCallback(
    (payload) => {
      if (!payload) return;

      const nextLevel = payload.level ?? level;
      const nextIsDraft = nextLevel === "DRAFT";

      setLevel(nextLevel);

      setLines((prev) => {
        const checkedMap = new Map(
          prev.map((line) => [
            `${line.plantId}:${line.unitId ?? 0}`,
            line.checked,
          ]),
        );
        const offerMap = new Map(
          prev.map((line) => [
            `${line.plantId}:${line.unitId ?? 0}`,
            { offerDiscount: line.offerDiscount, offerKey: line.offerKey },
          ]),
        );

        return (payload.plantList || []).map((row) => {
          const rebuilt = lineFromReservation(row, nextIsDraft);
          const id = `${rebuilt.plantId}:${rebuilt.unitId ?? 0}`;
          const offer = offerMap.get(id);
          return {
            ...rebuilt,
            checked: checkedMap.get(id) ?? false,
            offerDiscount: offer?.offerDiscount,
            offerKey: offer?.offerKey,
          };
        });
      });

      const nextSpecials = (payload.specialPlantList || []).map(
        specialFromRecord,
      );
      setSpecials(nextSpecials);

      const nextDiscount = toMoney(payload.additionalDiscount);
      const nextDiscountText = nextDiscount > 0 ? String(nextDiscount) : "";
      const nextRemark = payload.additionalDiscountRemark || "";
      const nextTransport = toMoney(payload.transportationCost);
      const nextTransportText = nextTransport > 0 ? String(nextTransport) : "";

      setDiscount(nextDiscountText);
      setDiscountRemark(nextRemark);
      setTransport(nextTransportText);

      setAuditTrail(
        (payload.invoiceUpdateDetailList || []).map(auditFromRecord),
      );

      /* The saved document becomes the new baseline, so the screen is clean. */
      baselineRef.current = stateSignatureOf(
        (payload.plantList || []).map((row) =>
          lineFromReservation(row, nextIsDraft),
        ),
        nextDiscountText,
        nextRemark,
        nextTransportText,
        nextSpecials,
      );
    },
    [level],
  );

  /* ── save ────────────────────────────────────────────────────────────
     The only write this screen performs. It never chains into another call:
     whatever asked for the save gets told whether it worked, and stops. */
  const persist = useCallback(
    async (reason) => {
      if (blockingReason) {
        setError(blockingReason);
        return null;
      }

      setError(null);
      setNotice(null);
      setSaving(true);

      const discountAmount = toMoney(discount);
      const transportAmount = toMoney(transport);
      const trimmedReason = String(reason || "").trim();

      const body = {
        plantList: lines.map((line) => ({
          plantId: line.plantId,
          // Unchanged contract: seedlings still send the tray count.
          quantityReserved: toCount(line.quantity),
          unitId: line.unitId,
          unitName: line.unitName,
          packingName: line.packingName,
          packingCharge: toMoney(line.packingCharge),
          selectedByCustomer: line.selectedByCustomer,
          // Draft is never audited, so no reason is ever attached there.
          reason:
            auditActive && trimmedReason && lineChanged(line)
              ? trimmedReason
              : null,
        })),
        specialPlantList: specials.map((special) => ({
          barcodeId: special.barcodeId,
        })),
        additionalDiscount: discountAmount,
        additionalDiscountRemark:
          discountAmount > 0 ? discountRemark.trim() : null,
        transportationCost: transportAmount,
      };

      const response = await updateQuotationPlants(
        quotation.quotationId,
        userId,
        body,
      );

      setSaving(false);

      if (response?.status === "SUCCESS") {
        const payload = response.payload;

        if (payload) {
          rehydrate(payload);
        } else {
          // No echo from the server: settle locally so the screen goes clean.
          setLines((prev) => prev.map(settleLine));
          baselineRef.current = stateSignatureOf(
            lines.map(settleLine),
            discount,
            discountRemark,
            transport,
            specials,
          );
        }

        setNotice(response.message || "Quotation saved.");
        // The parent is told, but the modal stays open.
        onSaved?.(payload ?? true);
        return payload ?? true;
      }

      setError(response?.message || "Could not save the quotation.");
      return null;
    },
    [
      blockingReason,
      lines,
      specials,
      quotation,
      userId,
      onSaved,
      discount,
      discountRemark,
      transport,
      auditActive,
      rehydrate,
    ],
  );

  /* ── reason gate ─────────────────────────────────────────────────────
     Builds the "values updated" summary for the modal from whatever is
     actually dirty, so the operator sees precisely what will be recorded. */
  const describeChanges = useCallback(() => {
    const out = [];

    changedLines.forEach((line) => {
      if (line.isNew) {
        out.push({
          icon: "add-circle-outline",
          tone: "add",
          title: `${line.plantName} added`,
          detail: `${formatNumber(toCount(line.quantity))} ${unitWord(line)} · ${
            line.unitName || "no unit"
          }`,
        });
        return;
      }

      if (quantityChanged(line)) {
        out.push({
          icon: "swap-horizontal",
          tone: "edit",
          title: `${line.plantName} quantity changed`,
          from: `${formatNumber(toCount(line.baseQuantity))} ${unitWord(line)}`,
          to: `${formatNumber(toCount(line.quantity))} ${unitWord(line)}`,
        });
      }

      if (unitChanged(line)) {
        out.push({
          icon: "business-outline",
          tone: "edit",
          title: `${line.plantName} unit changed`,
          to: line.unitName || "—",
          from: "previous unit",
        });
      }

      if (packingChanged(line)) {
        out.push({
          icon: "cube-outline",
          tone: "edit",
          title: `${line.plantName} packing changed`,
          from: `${line.basePackingName} (${formatAmount(
            line.basePackingCharge,
          )})`,
          to: `${line.packingName} (${formatAmount(line.packingCharge)})`,
        });
      }

      if (choiceChanged(line)) {
        out.push({
          icon: "person-outline",
          tone: "edit",
          title: `${line.plantName} selected by customer changed`,
          from: line.baseSelectedByCustomer ? "Yes" : "No",
          to: line.selectedByCustomer ? "Yes" : "No",
        });
      }
    });

    if (transportEntered !== toMoney(quotation?.transportationCost)) {
      out.push({
        icon: "car-outline",
        tone: "edit",
        title: "Transport cost changed",
        from: formatAmount(quotation?.transportationCost),
        to: formatAmount(transportEntered),
      });
    }

    if (discountEntered !== toMoney(quotation?.additionalDiscount)) {
      out.push({
        icon: "pricetag-outline",
        tone: "edit",
        title: "Additional discount changed",
        from: formatAmount(quotation?.additionalDiscount),
        to: formatAmount(discountEntered),
      });
    }

    return out;
  }, [changedLines, transportEntered, discountEntered, quotation]);

  /* Save Changes. Past Draft it opens the reason modal first; in Draft it
     saves straight away. Either way it stops at the save. */
  const handleSave = useCallback(() => {
    if (working) return;

    if (blockingReason) {
      setError(blockingReason);
      return;
    }

    if (!dirty) {
      setNotice("Nothing to save.");
      return;
    }

    if (!auditActive) {
      persist(null);
      return;
    }

    setPendingAction({
      type: "save",
      request: {
        summary:
          "This quotation has left draft, so the changes below are recorded against its history.",
        changes: describeChanges(),
        confirmLabel: "SAVE CHANGES",
      },
    });
  }, [working, blockingReason, dirty, auditActive, persist, describeChanges]);

  /* Delete. Allowed in Draft and Delivery shade; past Draft it is reasoned. */
  const requestDelete = useCallback(
    (line) => {
      if (working) return;

      if (!auditActive) {
        dropLine(line.key);
        return;
      }

      /* A row added in this session was never saved, so removing it is not
         history — it just goes away. */
      if (line.isNew) {
        dropLine(line.key);
        return;
      }

      setPendingAction({
        type: "delete",
        lineKey: line.key,
        request: {
          summary: `${line.plantName} will be removed from this quotation and the removal recorded.`,
          changes: [
            {
              icon: "trash-outline",
              tone: "remove",
              title: `${line.plantName} deleted`,
              detail: `${formatNumber(toCount(line.quantity))} ${unitWord(
                line,
              )} · ${line.unitName || "no unit"} · ${formatAmount(
                lineAmount(line),
              )}`,
            },
          ],
          confirmLabel: "DELETE & SAVE",
          confirmTone: "danger",
        },
      });
    },
    [working, auditActive, dropLine],
  );

  /* The reason modal hands the reason back here. A delete is applied to the
     rows first, then the whole document is saved in one call. */
  const submitPendingAction = useCallback(
    async (reason) => {
      const action = pendingAction;
      if (!action) return;

      if (action.type === "delete") {
        /* Drop the row, then save the resulting document. `persist` reads
           `lines` from its closure, so the save is issued with the row
           already removed rather than waiting for a re-render. */
        const nextLines = lines.filter((line) => line.key !== action.lineKey);
        setLines(nextLines);
        setPendingAction(null);

        // Give React a tick to commit before the save reads state.
        setTimeout(() => {
          setPendingActionReason({ reason, lines: nextLines });
        }, 0);
        return;
      }

      setPendingAction(null);
      await persist(reason);
    },
    [pendingAction, lines, persist],
  );

  /* A delete needs the save to run against the *new* line list, so it is
     staged here and picked up once the state has committed. */
  const [pendingActionReason, setPendingActionReason] = useState(null);

  useEffect(() => {
    if (!pendingActionReason) return;
    const { reason } = pendingActionReason;
    setPendingActionReason(null);
    persist(reason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingActionReason]);

  /* ── paperwork ───────────────────────────────────────────────────── */
  const openPdf = useCallback(
    async (kind, title) => {
      const response = await downloadQuotationPdf(quotation?.quotationId);

      if (response?.status !== "SUCCESS") {
        setError(response?.message || "The PDF could not be downloaded.");
        return false;
      }

      setPdf({ kind, title, file: response.payload });
      return true;
    },
    [quotation?.quotationId],
  );

  const reopenPdf = useCallback(async () => {
    if (working) return;
    setError(null);
    setBusy("pdf");
    await openPdf(
      isDelivery ? "shade" : "invoice",
      isDelivery ? "Loading slip" : "Invoice",
    );
    setBusy(null);
  }, [working, isDelivery, openPdf]);

  /* ── move / invoice ──────────────────────────────────────────────────
     Neither of these ever fires from a save. When there is anything unsaved
     the button saves and stops, leaving the operator to press it again once
     the screen is clean. Only a clean screen actually runs the action. */
  const runMove = useCallback(async () => {
    if (working) return;

    if (dirty) {
      handleSave();
      return;
    }

    setError(null);
    setNotice(null);
    setBusy("shade");

    const response = await moveToLoadingShade(quotation.quotationId, userId);

    if (response?.status !== "SUCCESS") {
      setBusy(null);
      setError(
        response?.message ||
          "Could not move this quotation to the loading shade.",
      );
      return;
    }

    if (response.payload) rehydrate(response.payload);
    onSaved?.(response.payload || {});
    setNotice("Moved to the loading shade.");

    await openPdf("shade", "Moved to loading shade");
    setBusy(null);
  }, [
    working,
    dirty,
    handleSave,
    quotation,
    userId,
    onSaved,
    openPdf,
    rehydrate,
  ]);

  const runInvoice = useCallback(async () => {
    if (working) return;

    if (dirty) {
      handleSave();
      return;
    }

    setError(null);
    setNotice(null);
    setBusy("invoice");

    const response = await generateInvoice(quotation.quotationId, userId, {
      plantList: lines.map((line) => ({
        plantId: line.plantId,
        unitId: line.unitId,
        quantityDelivered: toCount(line.quantity),
        selectedByCustomer: line.selectedByCustomer,
      })),
    });

    if (response?.status !== "SUCCESS") {
      setBusy(null);
      setError(response?.message || "Could not generate the invoice.");
      return;
    }

    if (response.payload) rehydrate(response.payload);
    onSaved?.(response.payload || {});
    setNotice("Invoice generated.");

    await openPdf("invoice", "Invoice generated");
    setBusy(null);
  }, [
    working,
    dirty,
    handleSave,
    quotation,
    userId,
    lines,
    onSaved,
    openPdf,
    rehydrate,
  ]);

  const saveHint = blockingReason
    ? blockingReason
    : dirty
      ? isDraft
        ? "Save your changes before moving this to the loading shade."
        : "Save your changes before generating the invoice."
      : showChecks && !allChecked
        ? `Tick every row to generate the invoice. ${checkedCount} of ${checkableLines.length} checked.`
        : null;

  /* ── shared field renderers ──────────────────────────────────────── */

  /* A row is editable when the quotation is not yet invoiced, or when it was
     just added here. Past Draft the reserved rows are frozen for quantity, but
     packing and the customer flag stay open — only invoicing freezes them. */
  const lineEditable = useCallback(
    (line) => canEditLines || !!line.isNew,
    [canEditLines],
  );

  const checkBox = useCallback(
    (checked, onPress, label) => (
      <Pressable
        style={({ hovered, pressed }) => [
          styles.check,
          checked && styles.checkOn,
          hovered && styles.checkHover,
          pressed && styles.checkPressed,
        ]}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        onPress={onPress}
      >
        {checked ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : null}
      </Pressable>
    ),
    [styles],
  );

  const priceBlock = useCallback(
    (line) => {
      const offer = offerDiscountOf(line);
      if (offer > 0) {
        return (
          <View style={styles.alignRight}>
            <Text style={styles.priceText}>
              {formatAmount(effectivePriceOf(line))}
            </Text>
            <Text style={styles.priceStrike}>{formatAmount(line.price)}</Text>
          </View>
        );
      }
      return (
        <View style={styles.alignRight}>
          <Text style={styles.priceText}>{formatAmount(line.price)}</Text>
          {line.listPrice > line.price ? (
            <Text style={styles.priceStrike}>
              {formatAmount(line.listPrice)}
            </Text>
          ) : null}
        </View>
      );
    },
    [styles],
  );

  const unitSelect = useCallback(
    (line) => {
      if (!lineEditable(line)) {
        return (
          <Text style={styles.readValue} numberOfLines={1}>
            {line.unitName || "—"}
          </Text>
        );
      }

      return (
        <Pressable
          style={({ hovered, pressed }) => [
            styles.select,
            !line.unitId && styles.selectInvalid,
            hovered && styles.selectHover,
            pressed && styles.selectPressed,
          ]}
          onPress={() => openUnitPicker(line)}
        >
          <Text
            style={line.unitName ? styles.selectText : styles.selectPlaceholder}
            numberOfLines={1}
          >
            {line.unitName || "Select unit"}
          </Text>
          <Ionicons name="chevron-down" size={14} color={C.MUTED} />
        </Pressable>
      );
    },
    [styles, C, lineEditable, openUnitPicker],
  );

  const qtyField = useCallback(
    (line, { showDerived }) => {
      const entered = toCount(line.quantity);
      const traySize = toCount(line.traySize);
      const over =
        line.available != null && !line.seedling && entered > line.available;
      const moved = quantityChanged(line) && !line.isNew;

      const derived =
        showDerived && line.seedling && traySize > 0 ? (
          <Text style={styles.derivedHint} numberOfLines={1}>
            = {formatNumber(derivedQuantity(line))} plants ({traySize}/tray)
          </Text>
        ) : null;

      if (!lineEditable(line)) {
        return (
          <View style={styles.cellFill}>
            <View style={styles.readQty}>
              <Text style={styles.readQtyValue}>{formatNumber(entered)}</Text>
              <Text style={styles.readQtyUnit}>{unitWord(line)}</Text>
            </View>
            {derived}
            {line.reserved != null ? (
              <Text style={styles.qtyHint} numberOfLines={1}>
                Reserved {formatNumber(line.reserved)}
              </Text>
            ) : null}
          </View>
        );
      }

      return (
        <View style={styles.cellFill}>
          <View
            style={[
              styles.qtyBox,
              moved && styles.qtyBoxDirty,
              over && styles.qtyBoxWarn,
            ]}
          >
            <TextInput
              style={styles.qtyInput}
              value={line.quantity}
              onChangeText={(value) =>
                updateLine(line.key, { quantity: value.replace(/[^0-9]/g, "") })
              }
              keyboardType="number-pad"
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={C.FAINT}
            />
            <Text style={styles.qtyUnit}>
              {line.seedling ? "Trays" : "Plants"}
            </Text>
          </View>

          {derived}

          {over ? (
            <Text style={styles.qtyHintWarn} numberOfLines={1}>
              Only {formatNumber(line.available)} in stock
            </Text>
          ) : moved ? (
            <Text style={styles.qtyHintMoved} numberOfLines={1}>
              Was {formatNumber(toCount(line.baseQuantity))}
            </Text>
          ) : line.reserved != null && !isDraft ? (
            <Text style={styles.qtyHint} numberOfLines={1}>
              Reserved {formatNumber(line.reserved)}
            </Text>
          ) : line.available != null ? (
            <Text style={styles.qtyHint} numberOfLines={1}>
              {formatNumber(line.available)} in stock
            </Text>
          ) : null}
        </View>
      );
    },
    [styles, C, isDraft, lineEditable, updateLine],
  );

  const packingField = useCallback(
    (line) => {
      if (!lineEditable(line)) {
        return (
          <View style={styles.packStack}>
            <Text style={styles.readValue} numberOfLines={1}>
              {line.packingName}
            </Text>
            <Text style={styles.readSub} numberOfLines={1}>
              {formatAmount(line.packingCharge)}{" "}
              {line.seedling ? "/ tray" : "/ plant"}
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.packStack}>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.select,
              hovered && styles.selectHover,
              pressed && styles.selectPressed,
            ]}
            onPress={() => openPackingPicker(line.key)}
          >
            <Text style={styles.selectText} numberOfLines={1}>
              {line.packingName}
            </Text>
            <Ionicons name="chevron-down" size={14} color={C.MUTED} />
          </Pressable>

          <View
            style={[
              styles.chargeBox,
              line.packingManual && styles.chargeBoxManual,
            ]}
          >
            <Text
              style={[
                styles.chargePrefix,
                line.packingManual && styles.chargeManualText,
              ]}
            >
              ₹
            </Text>
            <TextInput
              style={[
                styles.chargeInput,
                line.packingManual && styles.chargeManualText,
              ]}
              value={line.packingCharge}
              onChangeText={(value) =>
                updateLine(line.key, {
                  packingCharge: value.replace(/[^0-9.]/g, ""),
                  packingManual: true,
                })
              }
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={C.FAINT}
            />
            <Text style={styles.chargeSuffix}>
              {line.seedling ? "/ tray" : "/ plant"}
            </Text>
          </View>
        </View>
      );
    },
    [styles, C, lineEditable, openPackingPicker, updateLine],
  );

  /* Selected by customer: a Yes / No dropdown, disabled when read-only. */
  const choiceField = useCallback(
    (line) => {
      const on = !!line.selectedByCustomer;

      if (!lineEditable(line)) {
        return (
          <View
            style={[styles.choicePill, on ? styles.choiceOn : styles.choiceOff]}
          >
            <Ionicons
              name={on ? "checkmark-circle" : "remove-circle-outline"}
              size={12}
              color={on ? C.GREEN_DEEP : C.MUTED}
            />
            <Text
              style={[
                styles.choiceText,
                on ? styles.choiceTextOn : styles.choiceTextOff,
              ]}
              numberOfLines={1}
            >
              {on ? "Yes" : "No"}
            </Text>
          </View>
        );
      }

      return (
        <Pressable
          style={({ hovered, pressed }) => [
            styles.choiceSelect,
            on ? styles.choiceSelectYes : styles.choiceSelectNo,
            (hovered || pressed) && styles.choiceSelectHover,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${line.plantName} selected by customer: ${
            on ? "Yes" : "No"
          }`}
          onPress={() => openChoicePicker(line.key)}
        >
          <View style={styles.choiceValueRow}>
            <Ionicons
              name={on ? "checkmark-circle" : "remove-circle-outline"}
              size={14}
              color={on ? C.GREEN_DEEP : C.MUTED}
            />
            <Text
              style={[
                styles.choiceValueText,
                on ? styles.choiceValueYes : styles.choiceValueNo,
              ]}
              numberOfLines={1}
            >
              {on ? "Yes" : "No"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={C.MUTED} />
        </Pressable>
      );
    },
    [styles, C, lineEditable, openChoicePicker],
  );

  const deleteButton = useCallback(
    (line) => (
      <Pressable
        style={({ hovered, pressed }) => [
          styles.deleteBtn,
          hovered && styles.deleteBtnHover,
          pressed && styles.deleteBtnPressed,
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${line.plantName}`}
        onPress={() => requestDelete(line)}
      >
        <Ionicons name="trash-outline" size={16} color={C.RED} />
      </Pressable>
    ),
    [styles, C, requestDelete],
  );

  /* Delivery shade shows the tick box and the delete together: deletion is no
     longer draft-only. */
  const actionField = useCallback(
    (line) => {
      if (showChecks) {
        return (
          <View style={styles.actionStack}>
            {checkBox(
              line.checked,
              () => toggleCheck(line.key),
              `Check ${line.plantName}`,
            )}
            {canEditLines ? deleteButton(line) : null}
          </View>
        );
      }
      if (canEditLines) return deleteButton(line);
      return <Text style={styles.dashText}>—</Text>;
    },
    [showChecks, canEditLines, checkBox, toggleCheck, deleteButton, styles],
  );

  /* ── columns ─────────────────────────────────────────────────────── */
  const columns = useMemo(() => {
    if (isCardMode) return [];

    const inner = space - styles.gutter * 2 - 2; // shell border
    const dense = space < 1000;
    const showCalc = space >= BP_CALC;
    const showChoice = space >= BP_CHOICE;
    const showPrice = space >= BP_PRICE;
    const showSno = space >= BP_SNO;

    const w = {
      sno: 40,
      price: dense ? 84 : 96,
      unit: dense ? 132 : 150,
      qty: dense ? 138 : 156,
      calc: 172,
      packing: dense ? 150 : 168,
      choice: dense ? 108 : 120,
      amount: dense ? 104 : 118,
      action: showChecks && canEditLines ? 88 : 56,
    };

    const defs = [
      showSno && {
        key: "sno",
        label: "#",
        size: w.sno,
        align: "center",
        render: (line, index) => (
          <Text style={styles.snoText}>{index + 1}</Text>
        ),
      },
      {
        key: "plant",
        label: "Plant",
        flex: true,
        align: "left",
        render: (line) => (
          <View style={styles.cellFill}>
            <Text style={styles.plantName} numberOfLines={1}>
              {line.plantName}
            </Text>
            <Text style={styles.plantSub} numberOfLines={1}>
              {line.plantSubtitle}
            </Text>
            <View style={styles.metaRow}>
              {line.size ? (
                <View style={styles.metaTag}>
                  <Text style={styles.metaTagText}>{line.size}</Text>
                </View>
              ) : null}
              {!showPrice ? (
                <View style={styles.metaTag}>
                  <Text style={styles.metaTagText}>
                    {formatAmount(effectivePriceOf(line))} / plant
                  </Text>
                </View>
              ) : null}
              {!showChoice ? (
                <View style={styles.metaTag}>
                  <Text style={styles.metaTagText}>
                    Customer: {line.selectedByCustomer ? "Yes" : "No"}
                  </Text>
                </View>
              ) : null}
              {lineChanged(line) ? (
                <View style={styles.changeTag}>
                  <Ionicons
                    name={line.isNew ? "add" : "swap-horizontal"}
                    size={10}
                    color={C.ALERT}
                  />
                  <Text style={styles.changeTagText}>
                    {line.isNew ? "NEW" : "CHANGED"}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ),
      },
      showPrice && {
        key: "price",
        label: "Price",
        sublabel: "per plant",
        size: w.price,
        align: "right",
        render: (line) => priceBlock(line),
      },
      {
        key: "unit",
        label: "Unit",
        size: w.unit,
        align: "center",
        render: unitSelect,
      },
      {
        key: "quantity",
        label: isDraft ? "Reserved qty" : "Delivered qty",
        sublabel: "trays or plants",
        size: w.qty,
        align: "center",
        render: (line) => qtyField(line, { showDerived: !showCalc }),
      },
      showCalc && {
        key: "calc",
        label: "Seedling maths",
        sublabel: "trays × tray size",
        size: w.calc,
        align: "center",
        render: (line) => {
          if (!line.seedling) return <Text style={styles.dashText}>—</Text>;

          const traySize = toCount(line.traySize);
          if (traySize <= 0) {
            return (
              <Text style={styles.calcMissing} numberOfLines={2}>
                Tray size unknown
              </Text>
            );
          }

          return (
            <View style={styles.calcCard}>
              <Text style={styles.calcLine} numberOfLines={1}>
                <Text style={styles.calcLabel}>Trays </Text>
                <Text style={styles.calcValue}>
                  {formatNumber(toCount(line.quantity))}
                </Text>
                <Text style={styles.calcLabel}> × {traySize}</Text>
              </Text>
              <Text style={styles.calcLine} numberOfLines={1}>
                <Text style={styles.calcValueStrong}>
                  {formatNumber(derivedQuantity(line))} plants
                </Text>
              </Text>
            </View>
          );
        },
      },
      {
        key: "packing",
        label: "Packing",
        sublabel: "type and charge",
        size: w.packing,
        align: "center",
        render: packingField,
      },
      showChoice && {
        key: "choice",
        label: "Selected by",
        sublabel: "customer",
        size: w.choice,
        align: "center",
        render: choiceField,
      },
      {
        key: "amount",
        label: "Amount",
        size: w.amount,
        align: "right",
        render: (line) => (
          <Text style={styles.amountText} numberOfLines={1}>
            {formatAmount(lineAmount(line))}
          </Text>
        ),
      },
      {
        key: "action",
        label: showChecks ? "Check" : "",
        size: w.action,
        align: "center",
        renderHead: showChecks
          ? () => checkBox(allChecked, toggleCheckAll, "Check every row")
          : null,
        render: actionField,
      },
    ].filter(Boolean);

    const fixed = defs.reduce((sum, col) => sum + (col.size || 0), 0);
    const plantWidth = Math.max(160, inner - fixed);

    return defs.map((col) => ({
      ...col,
      size: col.flex ? plantWidth : col.size,
    }));
  }, [
    space,
    isCardMode,
    styles,
    C,
    isDraft,
    showChecks,
    canEditLines,
    allChecked,
    toggleCheckAll,
    checkBox,
    priceBlock,
    unitSelect,
    qtyField,
    packingField,
    choiceField,
    actionField,
  ]);

  const renderRow = useCallback(
    ({ item, index }) => (
      <TableRow item={item} index={index} columns={columns} styles={styles} />
    ),
    [columns, styles],
  );

  /* ── card row (narrow screens) ───────────────────────────────────── */
  const renderCard = useCallback(
    ({ item, index }) => (
      <View
        style={[
          styles.lineCard,
          item.checked && styles.lineCardChecked,
          lineChanged(item) && styles.lineCardDirty,
        ]}
      >
        <View style={styles.lineCardTop}>
          <View style={styles.lineIndex}>
            <Text style={styles.lineIndexText}>{index + 1}</Text>
          </View>

          <View style={styles.fill}>
            <Text style={styles.plantName} numberOfLines={1}>
              {item.plantName}
            </Text>
            <Text style={styles.plantSub} numberOfLines={1}>
              {item.plantSubtitle}
            </Text>
            <View style={styles.metaRow}>
              {item.size ? (
                <View style={styles.metaTag}>
                  <Text style={styles.metaTagText}>{item.size}</Text>
                </View>
              ) : null}
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>
                  {formatAmount(effectivePriceOf(item))} / plant
                </Text>
              </View>
              {lineChanged(item) ? (
                <View style={styles.changeTag}>
                  <Ionicons
                    name={item.isNew ? "add" : "swap-horizontal"}
                    size={10}
                    color={C.ALERT}
                  />
                  <Text style={styles.changeTagText}>
                    {item.isNew ? "NEW" : "CHANGED"}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {actionField(item)}
        </View>

        <View style={styles.fieldGrid}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Unit</Text>
            {unitSelect(item)}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {isDraft ? "Reserved qty" : "Delivered qty"}
            </Text>
            {qtyField(item, { showDerived: true })}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Packing</Text>
            {packingField(item)}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Selected by customer</Text>
            {choiceField(item)}
          </View>
        </View>

        <View style={styles.lineFooter}>
          <Text style={styles.lineTotalLabel}>Line amount</Text>
          <Text style={styles.lineTotal}>{formatAmount(lineAmount(item))}</Text>
        </View>
      </View>
    ),
    [
      styles,
      C,
      isDraft,
      unitSelect,
      qtyField,
      packingField,
      choiceField,
      actionField,
    ],
  );

  const keyExtractor = useCallback((item) => item.key, []);

  const onTableLayout = useCallback((event) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    setAvail((prev) => (Math.abs(prev - measured) > 2 ? measured : prev));
  }, []);

  /* ── picker sheet ────────────────────────────────────────────────── */
  const renderPicker = () => {
    if (!picker || !activeLine) return null;

    const unitMode = picker.type === "unit";
    const choiceMode = picker.type === "choice";

    const options = unitMode
      ? activeLine.inventoryList || []
      : choiceMode
        ? CHOICE_OPTIONS
        : [NO_PACKING, ...packings];

    const title = unitMode
      ? "Select unit"
      : choiceMode
        ? "Selected by customer"
        : "Select packing";

    return (
      <Modal
        transparent
        animationType="fade"
        visible
        onRequestClose={() => setPicker(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Text style={styles.sheetSubtitle}>
                {activeLine.plantName}
                {activeLine.size ? ` · ${activeLine.size}` : ""}
              </Text>
            </View>

            {picker.loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={C.NAVY} />
                <Text style={styles.loadingText}>Checking stock…</Text>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                {options.length === 0 ? (
                  <Text style={styles.resultEmpty}>
                    {unitMode
                      ? "This plant is not stocked in any unit."
                      : "No packing options yet."}
                  </Text>
                ) : null}

                {options.map((option) => {
                  const active = unitMode
                    ? option.unitId === activeLine.unitId
                    : choiceMode
                      ? option.value === !!activeLine.selectedByCustomer
                      : packingLabel(option) === activeLine.packingName;

                  const optionKey = unitMode
                    ? `unit-${option.unitId}`
                    : choiceMode
                      ? `choice-${option.label}`
                      : `packing-${option.packingId ?? "none"}`;

                  return (
                    <Pressable
                      key={optionKey}
                      style={({ hovered }) => [
                        styles.optionRow,
                        hovered && styles.optionRowHover,
                        active && styles.optionRowActive,
                      ]}
                      onPress={() =>
                        unitMode
                          ? chooseUnit(activeLine, option)
                          : choiceMode
                            ? chooseChoice(activeLine, option)
                            : choosePacking(activeLine, option)
                      }
                    >
                      {choiceMode ? (
                        <View style={styles.optionLead}>
                          <View
                            style={[
                              styles.optionIcon,
                              option.value && styles.optionIconYes,
                            ]}
                          >
                            <Ionicons
                              name={
                                option.value
                                  ? "checkmark-circle"
                                  : "remove-circle-outline"
                              }
                              size={16}
                              color={option.value ? C.GREEN_DEEP : C.MUTED}
                            />
                          </View>
                          <View style={styles.fill}>
                            <Text
                              style={[
                                styles.optionText,
                                active && styles.optionTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Text style={styles.optionMeta}>{option.hint}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.fill}>
                          <Text
                            style={[
                              styles.optionText,
                              active && styles.optionTextActive,
                            ]}
                          >
                            {unitMode ? option.unitName : packingLabel(option)}
                          </Text>
                          <Text style={styles.optionMeta}>
                            {unitMode
                              ? `${formatNumber(option.quantity ?? 0)} in stock${
                                  option.traySize
                                    ? ` · ${option.traySize} per tray`
                                    : ""
                                }`
                              : option.size
                                ? `Fits ${option.size}`
                                : "No charge"}
                          </Text>
                        </View>
                      )}

                      {active ? (
                        <Ionicons name="checkmark" size={18} color={C.NAVY} />
                      ) : !unitMode && !choiceMode ? (
                        <Text style={styles.optionBadge}>
                          {formatAmount(option.price)}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  /* ── audit history ───────────────────────────────────────────────── */
  const renderAudit = () => {
    if (!auditActive || auditTrail.length === 0) return null;

    const valuesWidth = isCardMode ? undefined : "46%";
    const reasonWidth = isCardMode ? undefined : "54%";

    return (
      <View style={styles.auditSection}>
        <View style={styles.auditHead}>
          <Ionicons name="time-outline" size={16} color={C.NAVY} />
          <Text style={styles.auditTitle}>Audit history</Text>
          <View style={styles.metaTag}>
            <Text style={styles.metaTagText}>{auditTrail.length}</Text>
          </View>
          <Pressable onPress={() => setAuditOpen((prev) => !prev)} hitSlop={8}>
            <Text style={styles.auditToggleText}>
              {auditOpen ? "Hide" : "Show"}
            </Text>
          </Pressable>
        </View>

        {auditOpen ? (
          <View style={styles.auditShell}>
            {!isCardMode ? (
              <View style={styles.auditHeadRow}>
                <View style={[styles.auditCell, { width: valuesWidth }]}>
                  <Text style={styles.auditHeadCell}>Values updated</Text>
                </View>
                <View style={[styles.auditCell, { width: reasonWidth }]}>
                  <Text style={styles.auditHeadCell}>Reason</Text>
                </View>
              </View>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {auditTrail.map((entry, index) => (
                <View
                  key={entry.key}
                  style={[
                    styles.auditRow,
                    index % 2 === 1 && styles.auditRowAlt,
                  ]}
                >
                  <View style={[styles.auditCell, { width: valuesWidth }]}>
                    {isCardMode ? (
                      <Text style={styles.auditCardLabel}>Values updated</Text>
                    ) : null}
                    <Text style={styles.auditValueText}>{entry.values}</Text>
                    <View style={styles.auditMetaRow}>
                      {entry.updatedBy ? (
                        <Text style={styles.auditMetaText}>
                          {entry.updatedBy}
                        </Text>
                      ) : null}
                      {entry.date ? (
                        <Text style={styles.auditMetaText}>
                          {formatStamp(entry.date)}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.auditCell, { width: reasonWidth }]}>
                    {isCardMode ? (
                      <Text style={styles.auditCardLabel}>Reason</Text>
                    ) : null}
                    {entry.reason ? (
                      <Text style={styles.auditReasonText}>{entry.reason}</Text>
                    ) : (
                      <Text style={styles.auditReasonEmpty}>
                        No reason recorded
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  };

  /* ── render ──────────────────────────────────────────────────────── */
  const showResults = term.trim().length >= 2;
  const quotationDate = formatDate(
    quotation?.quotationDate ||
      quotation?.deliveryDate ||
      quotation?.createdDate ||
      quotation?.creationDate,
  );

  const quotationLine = `QTN-${quotation?.quotationId}${
    quotation?.customerName ? ` · ${quotation.customerName}` : ""
  }`;

  const tableHead = (
    <View style={styles.tableHead}>
      {columns.map((col) => (
        <View
          key={col.key}
          style={[
            styles.headCellWrap,
            { width: col.size },
            col.align === "right"
              ? styles.alignRight
              : col.align === "center"
                ? styles.alignCenter
                : styles.alignLeft,
          ]}
        >
          {col.renderHead ? (
            col.renderHead()
          ) : (
            <>
              <Text style={styles.headCell} numberOfLines={1}>
                {col.label}
              </Text>
              {col.sublabel ? (
                <Text style={styles.headCellSub} numberOfLines={1}>
                  {col.sublabel}
                </Text>
              ) : null}
            </>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        {/* ── header ── */}
        <View style={styles.header}>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.iconBtn,
              hovered && styles.iconBtnHover,
              pressed && styles.iconBtnPressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={19} color={C.NAVY} />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={styles.title} numberOfLines={1}>
              {canEditLines ? "Edit quotation" : "Check quotation"}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {quotationLine}
            </Text>
          </View>

          <View style={styles.headerMeta}>
            {dirty ? (
              <View style={styles.dirtyPill}>
                <View style={styles.dirtyDot} />
                <Text style={styles.dirtyText}>UNSAVED</Text>
              </View>
            ) : null}

            <View
              style={[
                styles.levelPill,
                {
                  backgroundColor: `${levelMeta.tint}14`,
                  borderColor: `${levelMeta.tint}33`,
                },
              ]}
            >
              <View
                style={[styles.levelDot, { backgroundColor: levelMeta.tint }]}
              />
              <Text style={[styles.levelPillText, { color: levelMeta.tint }]}>
                {levelMeta.label}
              </Text>
            </View>

            {large ? (
              <>
                <View style={styles.headerDivider} />
                <View style={styles.dateWrap}>
                  <Ionicons name="calendar-outline" size={16} color={C.NAVY} />
                  <Text style={styles.dateText}>{quotationDate}</Text>
                </View>
              </>
            ) : null}

            {auditActive && auditTrail.length > 0 ? (
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.iconBtn,
                  auditOpen && styles.iconBtnActive,
                  hovered && styles.iconBtnHover,
                  pressed && styles.iconBtnPressed,
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Toggle audit history"
                onPress={() => setAuditOpen((prev) => !prev)}
              >
                <Ionicons name="time-outline" size={19} color={C.NAVY} />
              </Pressable>
            ) : null}

            {!isDraft ? (
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.iconBtn,
                  hovered && styles.iconBtnHover,
                  pressed && styles.iconBtnPressed,
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Open the quotation PDF"
                disabled={working}
                onPress={reopenPdf}
              >
                {busy === "pdf" ? (
                  <ActivityIndicator color={C.NAVY} />
                ) : (
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color={C.NAVY}
                  />
                )}
              </Pressable>
            ) : null}

            <Pressable
              style={({ hovered, pressed }) => [
                styles.iconBtn,
                hovered && styles.iconBtnHover,
                pressed && styles.iconBtnPressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
            >
              <Ionicons name="close" size={19} color="#475569" />
            </Pressable>
          </View>
        </View>

        {/* ── search + add ── */}
        {canEditTotals ? (
          <View style={styles.toolbar}>
            <View style={styles.searchAnchor}>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={17} color={C.FAINT} />
                <TextInput
                  ref={searchRef}
                  style={styles.searchInput}
                  value={term}
                  onChangeText={setTerm}
                  placeholder="Search a plant by name, size or variety"
                  placeholderTextColor={C.FAINT}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searching ? <ActivityIndicator color={C.NAVY} /> : null}
                {term.length > 0 && !searching ? (
                  <Pressable onPress={() => setTerm("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color={C.FAINT} />
                  </Pressable>
                ) : null}
              </View>

              {showResults ? (
                <View style={styles.results}>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {searching && results.length === 0 ? (
                      <View style={styles.resultLoading}>
                        <ActivityIndicator color={C.NAVY} />
                        <Text style={styles.resultLoadingText}>
                          Searching the catalogue…
                        </Text>
                      </View>
                    ) : null}

                    {!searching && results.length === 0 ? (
                      <Text style={styles.resultEmpty}>
                        No plants match “{term.trim()}”. Try a shorter name.
                      </Text>
                    ) : null}

                    {results.map((plant) => {
                      const inventory = plant.inventoryList || [];
                      const stock = inventory.reduce(
                        (sum, row) => sum + (row.quantity || 0),
                        0,
                      );
                      const availableUnits = inventory.filter(
                        (row) => (row.quantity || 0) > 0,
                      ).length;

                      return (
                        <Pressable
                          key={plant.plantId}
                          style={({ pressed, hovered }) => [
                            styles.resultCard,
                            hovered && styles.resultCardHover,
                            pressed && styles.resultCardPressed,
                          ]}
                          onPress={() => addPlant(plant)}
                        >
                          <View style={styles.resultIcon}>
                            <Ionicons
                              name="leaf-outline"
                              size={17}
                              color={C.NAVY}
                            />
                          </View>

                          <View style={styles.fill}>
                            <Text style={styles.resultName} numberOfLines={1}>
                              {plant.plantName}
                            </Text>

                            <View style={styles.chipRow}>
                              <View style={styles.chip}>
                                <Text style={styles.chipText}>
                                  {plant.size || "No size"}
                                </Text>
                              </View>
                              <View style={styles.chip}>
                                <Text style={styles.chipText}>
                                  {formatNumber(stock)} in stock
                                </Text>
                              </View>
                              <View style={styles.chip}>
                                <Text style={styles.chipText}>
                                  {availableUnits} unit
                                  {availableUnits === 1 ? "" : "s"}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.resultPriceWrap}>
                            <Text style={styles.resultPrice}>
                              {formatAmount(priceOf(plant))}
                            </Text>
                            <Text style={styles.resultPriceLabel}>
                              per plant
                            </Text>
                          </View>

                          <Ionicons
                            name="add-circle"
                            size={22}
                            color={C.GREEN}
                          />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.addButton,
                hovered && styles.addButtonHover,
                pressed && styles.addButtonPressed,
              ]}
              onPress={focusSearch}
            >
              <Ionicons name="add" size={19} color="#FFFFFF" />
              {space >= 460 ? (
                <Text style={styles.addButtonText}>ADD PLANT</Text>
              ) : null}
            </Pressable>
          </View>
        ) : null}

        {/* ── check progress (delivery shade) ── */}
        {showChecks && lines.length > 0 ? (
          <View style={styles.checkStrip}>
            <Ionicons
              name={allChecked ? "checkmark-circle" : "ellipse-outline"}
              size={18}
              color={allChecked ? C.GREEN : C.MUTED}
            />
            <Text style={styles.checkStripText}>
              {allChecked
                ? "Every row checked. The invoice is ready."
                : `${checkedCount} of ${checkableLines.length} rows checked`}
            </Text>
            <Pressable onPress={toggleCheckAll} hitSlop={8}>
              <Text style={styles.checkStripLink}>
                {allChecked ? "Clear all" : "Check all"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── grid ── */}
        <View style={styles.tableWrap} onLayout={onTableLayout}>
          <View style={isCardMode ? styles.fill : styles.tableShell}>
            {!isCardMode && lines.length > 0 ? tableHead : null}

            <FlatList
              data={lines}
              keyExtractor={keyExtractor}
              renderItem={isCardMode ? renderCard : renderRow}
              extraData={columns}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={7}
              removeClippedSubviews={Platform.OS === "android"}
              contentContainerStyle={
                isCardMode ? styles.cardList : styles.tableBody
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="leaf-outline" size={28} color={C.NAVY} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    No plants on this quotation
                  </Text>
                  <Text style={styles.emptyText}>
                    {canEditTotals
                      ? "Search above to add the first one."
                      : "Nothing was reserved against this quotation."}
                  </Text>
                </View>
              }
            />
          </View>
        </View>

        {/* ── special plants (barcode) ── */}
        {specials.length > 0 ? (
          <View style={styles.specialSection}>
            <View style={styles.specialHead}>
              <Ionicons name="barcode-outline" size={16} color={C.NAVY} />
              <Text style={styles.specialTitle}>Special plants</Text>
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>{specials.length}</Text>
              </View>
            </View>

            {specials.map((sp) => (
              <View key={sp.key} style={styles.specialCard}>
                <View style={styles.specialIcon}>
                  <Ionicons name="pricetag" size={16} color={C.NAVY} />
                </View>

                <View style={styles.fill}>
                  <Text style={styles.plantName} numberOfLines={1}>
                    {sp.plantName}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaTag}>
                      <Text style={styles.metaTagText}>{sp.barcodeId}</Text>
                    </View>
                    <View style={styles.metaTag}>
                      <Text style={styles.metaTagText}>Qty 1</Text>
                    </View>
                    {sp.unitName ? (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaTagText}>{sp.unitName}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Text style={styles.priceText}>{formatAmount(sp.price)}</Text>

                {canEditTotals ? (
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.deleteBtn,
                      hovered && styles.deleteBtnHover,
                      pressed && styles.deleteBtnPressed,
                    ]}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove special plant ${sp.barcodeId}`}
                    onPress={() => removeSpecial(sp.key)}
                  >
                    <Ionicons name="trash-outline" size={16} color={C.RED} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── audit history ── */}
        {renderAudit()}

        {error ? (
          <View style={styles.banner}>
            <Ionicons name="alert-circle-outline" size={17} color={C.ALERT} />
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : notice ? (
          <View style={[styles.banner, styles.bannerOk]}>
            <Ionicons name="checkmark-circle" size={17} color={C.GREEN_DEEP} />
            <Text style={styles.bannerOkText}>{notice}</Text>
          </View>
        ) : null}

        {/* ── totals + actions ── */}
        <View style={styles.footerDock}>
          {canEditTotals ? (
            <View style={styles.adjustBar}>
              {transportEntered > 0 ? (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.adjustChip,
                    (hovered || pressed) && styles.adjustChipHover,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit transport cost"
                  onPress={() => setTransportOpen(true)}
                >
                  <Ionicons name="car-outline" size={15} color={C.NAVY} />
                  <Text style={styles.adjustChipText}>
                    Transport {formatAmount(transportEntered)}
                  </Text>
                  <Ionicons name="create-outline" size={14} color={C.MUTED} />
                </Pressable>
              ) : (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.adjustAddBtn,
                    (hovered || pressed) && styles.adjustAddBtnHover,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add transport cost"
                  onPress={() => setTransportOpen(true)}
                >
                  <Ionicons name="car-outline" size={15} color={C.NAVY} />
                  <Text style={styles.adjustAddText}>Add transport cost</Text>
                  <Ionicons name="add" size={16} color={C.NAVY} />
                </Pressable>
              )}

              {discountEntered > 0 ? (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.adjustChip,
                    (hovered || pressed) && styles.adjustChipHover,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit additional discount"
                  onPress={() => setDiscountOpen(true)}
                >
                  <Ionicons name="pricetag-outline" size={15} color={C.NAVY} />
                  <Text style={styles.adjustChipText}>
                    Discount −{formatAmount(discountEntered)}
                  </Text>
                  <Ionicons name="create-outline" size={14} color={C.MUTED} />
                </Pressable>
              ) : (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.adjustAddBtn,
                    (hovered || pressed) && styles.adjustAddBtnHover,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add discount"
                  onPress={() => setDiscountOpen(true)}
                >
                  <Ionicons name="pricetag-outline" size={15} color={C.NAVY} />
                  <Text style={styles.adjustAddText}>Add discount</Text>
                  <Ionicons name="add" size={16} color={C.NAVY} />
                </Pressable>
              )}

              {specials.length > 0 ? (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.adjustChip,
                    (hovered || pressed) && styles.adjustChipHover,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add another special plant"
                  onPress={() => setSpecialOpen(true)}
                >
                  <Ionicons name="barcode-outline" size={15} color={C.NAVY} />
                  <Text style={styles.adjustChipText}>
                    Special plants · {specials.length}
                  </Text>
                  <Ionicons name="add" size={16} color={C.NAVY} />
                </Pressable>
              ) : (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.adjustAddBtn,
                    (hovered || pressed) && styles.adjustAddBtnHover,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add special plant"
                  onPress={() => setSpecialOpen(true)}
                >
                  <Ionicons name="barcode-outline" size={15} color={C.NAVY} />
                  <Text style={styles.adjustAddText}>Add special plant</Text>
                  <Ionicons name="add" size={16} color={C.NAVY} />
                </Pressable>
              )}
            </View>
          ) : transportEntered > 0 || discountEntered > 0 ? (
            <View style={styles.moneyReadBar}>
              {transportEntered > 0 ? (
                <View style={styles.moneyReadItem}>
                  <Ionicons name="car-outline" size={14} color={C.NAVY} />
                  <Text style={styles.moneyReadText}>
                    Transport {formatAmount(transportEntered)}
                  </Text>
                </View>
              ) : null}
              {discountEntered > 0 ? (
                <View style={styles.moneyReadItem}>
                  <Ionicons name="pricetag-outline" size={14} color={C.NAVY} />
                  <Text style={styles.moneyReadText}>
                    Discount {formatAmount(discountEntered)}
                    {discountRemark ? ` — ${discountRemark}` : ""}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <View style={styles.metricStrip}>
              <View style={styles.metricRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Plant types</Text>
                  <Text style={styles.metricValue}>
                    {formatNumber(totals.rows)}
                  </Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Quantity</Text>
                  <Text style={styles.metricValue}>
                    {formatNumber(totals.quantity)}
                  </Text>
                  <Text style={styles.metricUnit}>plants</Text>
                </View>

                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Packing</Text>
                  <Text style={[styles.metricValue, styles.metricWarm]}>
                    {formatAmount(totals.packing)}
                  </Text>
                </View>

                {totals.special > 0 ? (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Special plants</Text>
                    <Text style={[styles.metricValue, styles.metricWarm]}>
                      {formatAmount(totals.special)}
                    </Text>
                    <Text style={styles.metricUnit}>
                      {formatNumber(totals.specialRows)} item
                      {totals.specialRows === 1 ? "" : "s"}
                    </Text>
                  </View>
                ) : null}

                {totals.transport > 0 ? (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Transport</Text>
                    <Text style={[styles.metricValue, styles.metricWarm]}>
                      {formatAmount(totals.transport)}
                    </Text>
                  </View>
                ) : null}

                {totals.discount > 0 ? (
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Discount</Text>
                    <Text style={[styles.metricValue, styles.metricDiscount]}>
                      −{formatAmount(totals.discount)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.metricGrand}>
                <Text style={styles.metricGrandLabel}>Grand total</Text>
                <Text style={styles.metricGrandValue}>
                  {formatAmount(totals.grand)}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              {canEditLines || canEditTotals || dirty ? (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.ghostButton,
                    (hovered || pressed) && canSave && styles.ghostButtonHover,
                    !canSave && styles.ghostButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!canSave}
                >
                  {saving ? (
                    <ActivityIndicator color={C.NAVY} />
                  ) : (
                    <Ionicons
                      name="save-outline"
                      size={18}
                      color={canSave ? C.NAVY : "#9CA9B8"}
                    />
                  )}
                  <Text
                    style={[
                      styles.ghostTitle,
                      !canSave && styles.ghostTitleDisabled,
                    ]}
                  >
                    {saving ? "SAVING…" : "SAVE CHANGES"}
                  </Text>
                </Pressable>
              ) : null}

              {isDraft ? (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.primaryButton,
                    (hovered || pressed) &&
                      !working &&
                      !dirty &&
                      styles.primaryButtonHover,
                    (working || dirty) && styles.primaryButtonDisabled,
                  ]}
                  onPress={runMove}
                  disabled={working || dirty}
                >
                  {busy === "shade" ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                  )}
                  <Text style={styles.primaryTitle}>
                    {busy === "shade" ? "MOVING…" : "MOVE TO LOADING SHADE"}
                  </Text>
                </Pressable>
              ) : null}

              {showChecks ? (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.primaryButton,
                    styles.invoiceButton,
                    (hovered || pressed) &&
                      allChecked &&
                      !dirty &&
                      styles.invoiceButtonHover,
                    (!allChecked || working || dirty) &&
                      styles.primaryButtonDisabled,
                  ]}
                  onPress={runInvoice}
                  disabled={!allChecked || working || dirty}
                >
                  {busy === "invoice" ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="receipt-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                  )}
                  <Text style={styles.primaryTitle}>
                    {busy === "invoice" ? "GENERATING…" : "GENERATE INVOICE"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {saveHint ? <Text style={styles.saveHint}>{saveHint}</Text> : null}
        </View>
      </View>

      {renderPicker()}

      {transportOpen ? (
        <TransportModal
          styles={styles}
          initialTransport={transport}
          onApply={applyTransport}
          onClose={() => setTransportOpen(false)}
        />
      ) : null}

      {discountOpen ? (
        <DiscountModal
          styles={styles}
          subtotal={totals.subtotal}
          transport={transport}
          initialDiscount={discount}
          initialRemark={discountRemark}
          onApply={applyDiscount}
          onClose={() => setDiscountOpen(false)}
        />
      ) : null}

      {specialOpen ? (
        <SpecialPlantModal
          styles={styles}
          onAdd={addSpecialByBarcode}
          onClose={() => setSpecialOpen(false)}
        />
      ) : null}

      {pendingAction ? (
        <ReasonModal
          styles={styles}
          request={pendingAction.request}
          busy={saving}
          onSubmit={submitPendingAction}
          onClose={() => setPendingAction(null)}
        />
      ) : null}

      <PdfShareSheet
        file={pdf?.file}
        title={pdf?.title}
        subtitle={quotationLine}
        message={`${
          pdf?.kind === "invoice" ? "Invoice" : "Loading slip"
        } for ${quotationLine}`}
        onClose={() => setPdf(null)}
        onError={setError}
      />
    </KeyboardAvoidingView>
  );
}
