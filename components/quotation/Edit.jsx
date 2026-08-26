import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { downloadQuotationPdf } from "../../api/downloadPdfApis.js";
import { fetchPackingList } from "../../api/fetchPacking";
import { getQuotation } from "../../api/fetchQuotation";
import { getApplicableOffer } from "../../api/getOffer";
import { getQuotationAccess } from "../../api/getQuotationAccess";
import { getSpecialPlantByBarcodeId } from "../../api/getSpecialPlant";
import { searchPlants } from "../../api/plantApi";
import {
  convertToInvoice,
  moveToLoadingShade,
} from "../../api/quotationActions.js";
import { updateQuotationPlants } from "../../api/updateQuotation";

import PdfShareSheet from "../../utility/PdfShareSheet";
import { getCurrentRole, getCurrentUser } from "../../utility/secureStorage";
import makeStyles from "./Edit.styles";

const LEVEL_META = {
  DRAFT: { label: "Draft", tint: "#E8622C" },
  DELIVERY_SHADE: { label: "Loading shade", tint: "#0F4776" },
  INVOICE_GENERATED: { label: "Invoiced", tint: "#16A34A" },
};

const SEARCH_DEBOUNCE = 350;
const NO_PACKING = { packingId: null, packingName: "No packing", price: 0 };
/* Sentinel packing option: user types their own packing name + charge. */
const CUSTOM_PACKING = {
  packingId: "__custom__",
  packingName: "Custom",
  price: 0,
};

/* Selected-by-customer is a two-value dropdown. New rows default to NO. */
const CHOICE_OPTIONS = [
  { value: false, label: "No", hint: "Added by the nursery" },
  { value: true, label: "Yes", hint: "The customer asked for it" },
];

/* Advance payments are collected as CASH, UPI or CHEQUE. */
const TRANSACTION_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "DD", label: "DD" },
];

const transactionModeLabel = (value) =>
  TRANSACTION_MODES.find((option) => option.value === value)?.label ||
  value ||
  "";

/* Offered in the reason popups as one-tap fills. */
const REASON_PRESETS = [
  "Plant variety not available",
  "Changes made on customer request",
  "Quantity not sufficient",
];

/* Breakpoints measured on the table container.
   Columns are dropped in reverse order of importance as space runs out, and
   their values move into the plant cell or the quantity hint. */
const BP_CALC = 1180; // dedicated seedling maths column
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

/** True when two values fall on the same calendar day (local time). A missing
    value is never the same day as anything. */
const isSameDay = (a, b) => {
  if (a == null || b == null) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

/** True when the value is today (local time). */
const isToday = (value) => isSameDay(value, new Date());

let lineSeq = 0;
const nextKey = () => `line-${(lineSeq += 1)}`;

const packingForSize = (size, packings) =>
  packings.find((packing) => norm(packing.size) === norm(size)) || null;

const packingLabel = (packing) =>
  packing?.packingName || packing?.size || NO_PACKING.packingName;

/** Is this line using a custom (hand-typed) packing name? A packing is custom
    when its name is not "No packing" and doesn't match any catalogue option. */
const isCustomPacking = (line, packings) => {
  if (line.packingCustom) return true;
  const name = norm(line.packingName);
  if (!name || name === norm(NO_PACKING.packingName)) return false;
  const known = [NO_PACKING, ...packings].some(
    (p) => norm(packingLabel(p)) === name,
  );
  return !known;
};

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
    An absent value means YES — rows are the customer's pick until somebody
    says otherwise. */
const chosenByCustomer = (source) =>
  source?.selectedByCustomer ?? source?.isSelectedByCustomer ?? true;

const subtitleOf = (source, seedling) =>
  source?.botanicalName ||
  source?.scientificName ||
  source?.variety ||
  (seedling ? "Sold by tray" : "Single plant");

/** Plant title with its size appended for display, e.g. "Rose · 6 inch". Size
    is folded into the name in the table/card so it no longer needs its own tag. */
const plantTitleWithSize = (line) =>
  line.size ? `${line.plantName} · ${line.size}` : line.plantName;

/** How many plants a line comes to — trays × tray size for a seedling. This is
    a head count for display (the seedling maths column, the quantity hint, the
    quantity metric); it is never what the line is billed on. */
const derivedQuantity = (line) => {
  const entered = toCount(line.quantity);
  const traySize = toCount(line.traySize);
  return line.seedling && traySize > 0 ? entered * traySize : entered;
};

/** What a line is billed on. A seedling is priced per tray, so its billable
    count is the tray count as entered — trayReserved in Draft, trayDelivered
    once past it — and never the plants-per-tray total. Everything else is
    priced per plant, where the two are the same number. */
const billableQuantity = (line) => toCount(line.quantity);

/** line.price is already the after-discount unit price (see priceOf). */
const lineAmount = (line) => billableQuantity(line) * toMoney(line.price);

const linePacking = (line) =>
  toCount(line.quantity) * toMoney(line.packingCharge);

const unitWord = (line) => (line.seedling ? "trays" : "plants");

/** What one unit of price buys — a seedling is priced per tray, not per plant. */
const priceUnitWord = (line) => (line.seedling ? "tray" : "plant");

/* ── per-row change detection ────────────────────────────────────────
   Each row remembers the values it was last saved with (the `base*` fields).
   These helpers say what moved, and are also what the reason popups list.

   Each field also carries its own reason (line.fieldReasons[field]), gathered
   inline the moment that field is edited and blurred — no longer at save. */

const FIELD_META = {
  quantity: { label: "Quantity", icon: "swap-horizontal" },
  unit: { label: "Unit", icon: "business-outline" },
  packing: { label: "Packing", icon: "cube-outline" },
  choice: { label: "Selected by customer", icon: "person-outline" },
};

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

/** Whether a specific field on a line differs from its saved baseline.
    New rows have no baseline for a field-level compare (the whole row is new),
    so per-field reasoning never fires for them. */
const fieldChanged = (line, field) => {
  if (line.isNew) return false;
  switch (field) {
    case "quantity":
      return toCount(line.quantity) !== toCount(line.baseQuantity);
    case "unit":
      return (line.unitId ?? null) !== (line.baseUnitId ?? null);
    case "packing":
      return (
        line.packingName !== line.basePackingName ||
        toMoney(line.packingCharge) !== toMoney(line.basePackingCharge)
      );
    case "choice":
      return !!line.selectedByCustomer !== !!line.baseSelectedByCustomer;
    default:
      return false;
  }
};

/** Human before/after for a field, used by the per-field reason popup. */
const fieldDelta = (line, field) => {
  switch (field) {
    case "quantity":
      return {
        from: `${formatNumber(toCount(line.baseQuantity))} ${unitWord(line)}`,
        to: `${formatNumber(toCount(line.quantity))} ${unitWord(line)}`,
      };
    case "unit":
      return {
        from: line.baseUnitName || "previous unit",
        to: line.unitName || "—",
      };
    case "packing":
      return {
        from: `${line.basePackingName} (${formatAmount(line.basePackingCharge)})`,
        to: `${line.packingName} (${formatAmount(line.packingCharge)})`,
      };
    case "choice":
      return {
        from: line.baseSelectedByCustomer ? "Yes" : "No",
        to: line.selectedByCustomer ? "Yes" : "No",
      };
    default:
      return { from: "", to: "" };
  }
};

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

/** The whole saveable document: the lines, the special plants, plus the
    quotation-level money fields. Used for change tracking so a discount, a
    transport edit, an advance payment, or a scanned special plant alone still
    counts as dirty.

    `advance` / `advanceMode` describe only the acting user's own row in the
    advance ledger — every collector's row is tracked and saved separately,
    so nobody's edit can be a no-op that silently drops someone else's row. */
const stateSignatureOf = (
  lines,
  discount,
  remark,
  transport,
  advance,
  advanceMode,
  specials,
) =>
  `${signatureOf(lines)}|${toMoney(discount)}|${String(
    remark ?? "",
  ).trim()}|${toMoney(transport)}|${toMoney(advance)}|${advanceMode || ""}|${(
    specials || []
  )
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
    /* Billed at the discounted price when there is one; the list price is kept
       alongside so the price cell can strike it through. */
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
    packingId: reservation.packingId ?? null,
    packingName,
    packingCharge,
    packingManual: false,
    packingCustom: false,
    selectedByCustomer: chosen,
    /* the saved baseline this row is compared against */
    baseQuantity: String(quantity ?? 0),
    basePackingName: packingName,
    basePackingCharge: packingCharge,
    baseSelectedByCustomer: chosen,
    baseUnitId: reservation.unitId ?? null,
    baseUnitName: reservation.unitName ?? null,
    /* per-field reasons, gathered inline as each field is edited */
    fieldReasons: {},
    checked: false,
    isNew: false,
  };
};

/** Fold a freshly saved row back into its baseline: same values, nothing dirty,
    and the collected per-field reasons cleared. */
const settleLine = (line) => ({
  ...line,
  baseQuantity: String(toCount(line.quantity)),
  basePackingName: line.packingName,
  basePackingCharge: line.packingCharge,
  baseSelectedByCustomer: !!line.selectedByCustomer,
  baseUnitId: line.unitId ?? null,
  baseUnitName: line.unitName ?? null,
  fieldReasons: {},
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
  const dirty = !item.isSpecial && lineChanged(item);

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

/* ── advance payment modal ───────────────────────────────────────────
   The advance is a ledger, one row per collector, and this modal only ever
   edits the row belonging to the person currently signed in — nobody can
   touch a colleague's collection. `otherTotal` is what everyone else has
   already collected, shown for context and folded into the grand-total cap. */
function AdvanceModal({
  styles,
  grand,
  otherTotal,
  entries,
  initialAdvance,
  initialMode,
  collectorName,
  onApply,
  onClose,
}) {
  const C = styles.colors;
  const [advance, setAdvance] = useState(initialAdvance);
  const [mode, setMode] = useState(initialMode || "CASH");

  const value = toMoney(advance);
  const combined = otherTotal + value;
  const overTotal = combined > grand;
  const remaining = Math.max(0, grand - combined);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Advance payment</Text>
            <Text style={styles.sheetSubtitle}>
              Your collection as {collectorName || "the signed-in user"}
            </Text>
          </View>

          <View style={styles.adjustBody}>
            {entries && entries.length > 0 ? (
              <View style={styles.adjustField}>
                <View style={styles.moneyHead}>
                  <Ionicons name="people-outline" size={15} color={C.MUTED} />
                  <Text style={styles.moneyLabel}>Advance ledger</Text>
                </View>
                <View style={styles.advanceTable}>
                  <View
                    style={[styles.advanceTableRow, styles.advanceTableRowHead]}
                  >
                    <Text
                      style={[
                        styles.advanceTableHeadText,
                        styles.advanceTableCellName,
                      ]}
                    >
                      Name
                    </Text>
                    <Text
                      style={[
                        styles.advanceTableHeadText,
                        styles.advanceTableCellAmount,
                      ]}
                    >
                      Amount
                    </Text>
                    <Text
                      style={[
                        styles.advanceTableHeadText,
                        styles.advanceTableCellDate,
                      ]}
                    >
                      Collection date
                    </Text>
                    <Text
                      style={[
                        styles.advanceTableHeadText,
                        styles.advanceTableCellMode,
                      ]}
                    >
                      Mode
                    </Text>
                  </View>
                  {entries.map((row) => (
                    <View key={row.key} style={styles.advanceTableRow}>
                      <Text
                        style={[
                          styles.advanceTableCellText,
                          styles.advanceTableCellName,
                        ]}
                        numberOfLines={1}
                      >
                        {row.name}
                      </Text>
                      <Text
                        style={[
                          styles.advanceTableCellText,
                          styles.advanceTableCellAmount,
                        ]}
                        numberOfLines={1}
                      >
                        {formatAmount(row.amount)}
                      </Text>
                      <Text
                        style={[
                          styles.advanceTableCellText,
                          styles.advanceTableCellDate,
                          !row.date && styles.advanceTableCellMuted,
                        ]}
                        numberOfLines={1}
                      >
                        {row.date ? formatDate(row.date) : "—"}
                      </Text>
                      <Text
                        style={[
                          styles.advanceTableCellText,
                          styles.advanceTableCellMode,
                          !row.mode && styles.advanceTableCellMuted,
                        ]}
                        numberOfLines={1}
                      >
                        {row.mode || "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.adjustField}>
              <View style={styles.moneyHead}>
                <Ionicons name="wallet-outline" size={15} color={C.NAVY} />
                <Text style={styles.moneyLabel}>Advance amount</Text>
              </View>
              <View
                style={[styles.chargeBoxLg, overTotal && styles.qtyBoxWarn]}
              >
                <Text style={styles.chargePrefixLg}>₹</Text>
                <TextInput
                  style={styles.chargeInputLg}
                  value={advance}
                  onChangeText={(v) => setAdvance(v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  autoFocus
                  placeholder="0"
                  placeholderTextColor={C.FAINT}
                />
                <Text style={styles.chargeSuffixLg}>received</Text>
              </View>

              {overTotal ? (
                <Text style={styles.adjustError}>
                  The combined advance is more than the grand total (
                  {formatAmount(grand)}).
                </Text>
              ) : (
                <View style={styles.moneyReadItem}>
                  <Ionicons name="cash-outline" size={15} color={C.GREEN} />
                  <Text style={styles.moneyReadText}>
                    Remaining {formatAmount(remaining)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.adjustField}>
              <View style={styles.moneyHead}>
                <Ionicons name="card-outline" size={15} color={C.NAVY} />
                <Text style={styles.moneyLabel}>Collected via</Text>
              </View>
              <View style={styles.reasonChipRow}>
                {TRANSACTION_MODES.map((option) => {
                  const active = option.value === mode;
                  return (
                    <Pressable
                      key={option.value}
                      style={({ hovered, pressed }) => [
                        styles.reasonChip,
                        active && styles.reasonChipActive,
                        (hovered || pressed) &&
                          !active &&
                          styles.reasonChipHover,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setMode(option.value)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          active && styles.reasonChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
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
                (hovered || pressed) && !overTotal && styles.primaryButtonHover,
                overTotal && styles.primaryButtonDisabled,
              ]}
              onPress={() => onApply(value > 0 ? String(value) : "", mode)}
              disabled={overTotal}
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

/* ── per-field reason modal ──────────────────────────────────────────
   Opens the instant a single field is edited and the user clicks away. It
   shows exactly one change (the field that just moved), takes one reason, and
   hands it back so it can be stored on the line. Cancel reverts the field.

   `request` is { plantName, field, from, to, existing }. */
function FieldReasonModal({ styles, request, onSubmit, onCancel }) {
  const C = styles.colors;
  const meta = FIELD_META[request?.field] || {
    label: "Field",
    icon: "create-outline",
  };
  const [reason, setReason] = useState(request?.existing || "");
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const missing = trimmed.length === 0;
  const tooShort = !missing && trimmed.length < 3;
  const invalid = missing || tooShort;

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    onSubmit(trimmed);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.reasonKav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.sheetBackdrop} onPress={onCancel}>
          <Pressable style={styles.reasonSheet} onPress={() => {}}>
            <View style={styles.reasonHeader}>
              <View style={styles.reasonHeaderIcon}>
                <Ionicons name="create-outline" size={20} color={C.ALERT} />
              </View>
              <View style={styles.reasonHeaderText}>
                <Text style={styles.reasonTitle}>Reason Required</Text>
                <Text style={styles.reasonSubtitle}>
                  {request?.plantName} · {meta.label} changed. Past draft, every
                  change is recorded.
                </Text>
              </View>
            </View>

            <ScrollView
              style={styles.reasonScrollArea}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.reasonBody}>
                <View style={styles.reasonBlock}>
                  <View style={styles.reasonBlockHead}>
                    <Ionicons name="leaf-outline" size={15} color={C.NAVY} />
                    <Text style={styles.reasonBlockLabel}>
                      {request?.plantName}
                    </Text>
                  </View>

                  <View style={styles.changeList}>
                    <View style={[styles.changeRow, styles.changeRowLast]}>
                      <View style={[styles.changeIcon, styles.changeIconEdit]}>
                        <Ionicons name={meta.icon} size={13} color={C.ALERT} />
                      </View>
                      <View style={styles.changeBody}>
                        <Text style={styles.changeTitle}>
                          {meta.label} changed
                        </Text>
                        {request?.from != null && request?.to != null ? (
                          <View style={styles.changeFromTo}>
                            <Text style={styles.changeFrom}>
                              {request.from}
                            </Text>
                            <Ionicons
                              name="arrow-forward"
                              size={12}
                              color={C.MUTED}
                            />
                            <Text style={styles.changeTo}>{request.to}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <TextInput
                    style={[
                      styles.reasonInputCompact,
                      touched && invalid && styles.reasonInputLgError,
                    ]}
                    value={reason}
                    onChangeText={setReason}
                    onBlur={() => setTouched(true)}
                    placeholder={`Why did ${meta.label.toLowerCase()} change?`}
                    placeholderTextColor={C.FAINT}
                    multiline
                    autoFocus
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
                    <Text style={styles.reasonCounter}>
                      {trimmed.length}/300
                    </Text>
                  </View>
                </View>

                <View style={styles.reasonChipRow}>
                  {REASON_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      style={({ hovered, pressed }) => [
                        styles.reasonChip,
                        (hovered || pressed) && styles.reasonChipHover,
                      ]}
                      onPress={() => setReason(preset)}
                    >
                      <Text style={styles.reasonChipText}>{preset}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.reasonActions}>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.reasonCancelBtn,
                  (hovered || pressed) && styles.ghostButtonHover,
                ]}
                onPress={onCancel}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>

              <Pressable
                style={({ hovered, pressed }) => [
                  styles.reasonApplyBtn,
                  (hovered || pressed) && !invalid && styles.primaryButtonHover,
                  invalid && styles.primaryButtonDisabled,
                ]}
                onPress={submit}
                disabled={invalid}
              >
                <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                <Text style={styles.modalApplyText}>SAVE REASON</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── delete reason modal ─────────────────────────────────────────────
   A gate in front of a delete past Draft: it summarises the row being removed,
   takes a single reason, and hands it back so the caller can run the delete +
   save. Quantity/unit/packing/choice edits no longer come through here — those
   are reasoned inline per field. */
function DeleteReasonModal({
  styles,
  request,
  busy,
  error,
  onSubmit,
  onClose,
}) {
  const C = styles.colors;
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const missing = trimmed.length === 0;
  const tooShort = !missing && trimmed.length < 3;
  const invalid = missing || tooShort;

  const submit = () => {
    setTouched(true);
    if (invalid || busy) return;
    onSubmit(trimmed);
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={busy ? () => {} : onClose}
    >
      <KeyboardAvoidingView
        style={styles.reasonKav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={busy ? undefined : onClose}
        >
          <Pressable style={styles.reasonSheet} onPress={() => {}}>
            <View style={styles.reasonHeader}>
              <View style={styles.reasonHeaderIcon}>
                <Ionicons name="trash-outline" size={20} color={C.ALERT} />
              </View>
              <View style={styles.reasonHeaderText}>
                <Text style={styles.reasonTitle}>Reason Required</Text>
                <Text style={styles.reasonSubtitle}>{request?.summary}</Text>
              </View>
            </View>

            <ScrollView
              style={styles.reasonScrollArea}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.reasonBody}>
                <View style={styles.reasonBlock}>
                  <View style={styles.reasonBlockHead}>
                    <Ionicons name="leaf-outline" size={15} color={C.NAVY} />
                    <Text style={styles.reasonBlockLabel}>
                      {request?.title}
                    </Text>
                  </View>

                  <View style={styles.changeList}>
                    <View style={[styles.changeRow, styles.changeRowLast]}>
                      <View
                        style={[styles.changeIcon, styles.changeIconRemove]}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={13}
                          color={C.RED}
                        />
                      </View>
                      <View style={styles.changeBody}>
                        <Text style={styles.changeTitle}>Deleted</Text>
                        {request?.detail ? (
                          <Text style={styles.changeDetail}>
                            {request.detail}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <TextInput
                    style={[
                      styles.reasonInputCompact,
                      touched && invalid && styles.reasonInputLgError,
                    ]}
                    value={reason}
                    onChangeText={setReason}
                    onBlur={() => setTouched(true)}
                    placeholder="Why is this plant being removed?"
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
                    <Text style={styles.reasonCounter}>
                      {trimmed.length}/300
                    </Text>
                  </View>
                </View>

                <View style={styles.reasonChipRow}>
                  {REASON_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      style={({ hovered, pressed }) => [
                        styles.reasonChip,
                        (hovered || pressed) && styles.reasonChipHover,
                      ]}
                      onPress={() => setReason(preset)}
                      disabled={busy}
                    >
                      <Text style={styles.reasonChipText}>{preset}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            {error ? (
              <View style={styles.banner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={C.ALERT}
                />
                <Text style={styles.bannerText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.reasonActions}>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.reasonCancelBtn,
                  (hovered || pressed) && styles.ghostButtonHover,
                ]}
                onPress={onClose}
                disabled={busy}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </Pressable>

              <Pressable
                style={({ hovered, pressed }) => [
                  styles.reasonApplyBtn,
                  (hovered || pressed) && !invalid && styles.primaryButtonHover,
                  (invalid || busy) && styles.primaryButtonDisabled,
                ]}
                onPress={submit}
                disabled={invalid || busy}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
                )}
                <Text style={styles.modalApplyText}>
                  {busy ? "SAVING…" : "DELETE & SAVE"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── close confirmation ──────────────────────────────────────────────
   Gates the back / close buttons whenever there are unsaved changes, so
   nothing is discarded by accident. */
function CloseConfirmModal({
  styles,
  busy,
  error,
  onSave,
  onDiscard,
  onCancel,
}) {
  const C = styles.colors;

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={busy ? () => {} : onCancel}
    >
      <Pressable
        style={styles.sheetBackdrop}
        onPress={busy ? undefined : onCancel}
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Unsaved changes</Text>
            <Text style={styles.sheetSubtitle}>
              This quotation has changes that haven&apos;t been saved yet.
            </Text>
          </View>

          {error ? (
            <View style={styles.banner}>
              <Ionicons name="alert-circle-outline" size={17} color={C.ALERT} />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.confirmActions}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.confirmPrimaryBtn,
                (hovered || pressed) && !busy && styles.primaryButtonHover,
                busy && styles.primaryButtonDisabled,
              ]}
              onPress={onSave}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="save-outline" size={17} color="#FFFFFF" />
              )}
              <Text style={styles.confirmPrimaryText}>
                {busy ? "SAVING…" : "SAVE & CLOSE"}
              </Text>
            </Pressable>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.confirmDangerBtn,
                (hovered || pressed) && !busy && styles.confirmDangerBtnHover,
              ]}
              onPress={onDiscard}
              disabled={busy}
            >
              <Text style={styles.confirmDangerText}>DISCARD CHANGES</Text>
            </Pressable>

            <Pressable
              style={styles.confirmGhostBtn}
              onPress={onCancel}
              disabled={busy}
            >
              <Text style={styles.confirmGhostText}>Keep editing</Text>
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
 * Access: on open the screen calls /check/access. Anything other than an
 * explicit EDIT grant — including a failed lookup — defaults to READ, which is
 * fully read-only (same surface as an invoiced quotation). At DELIVERY_SHADE
 * the grant is not enough on its own: only a DELIVERY_MANAGER or an ADMIN can
 * edit there, everyone else is read-only.
 *
 * Level drives the editable surface. In Draft the grid is fully editable and
 * nothing is audited. Once the quotation leaves Draft every change is history:
 * editing a field and clicking away opens a per-field reason popup then and
 * there (Cancel reverts the field), and each reason rides along on its own row
 * at save. Deletes past Draft are gated by their own reason modal. Once
 * invoiced — or when access is READ — the screen is read-only.
 *
 * `selectedByCustomer` is a Yes / No dropdown. New rows default to Yes.
 *
 * Saving is deliberately inert: SAVE CHANGES, MOVE TO LOADING SHADE and
 * GENERATE INVOICE all call `updateQuotationPlants` and stop. The modal never
 * closes on save — the response is folded back into the screen by `rehydrate`.
 *
 * Layout contract: the grid never scrolls sideways. Under 760px each row
 * becomes an editable card.
 */
function EditInner({ quotation, onClose, onSaved }) {
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

  /* Access control. Starts READ so the screen is locked until the check
     resolves; only an explicit EDIT grant unlocks editing. `accessResolved`
     avoids a flash of an editable grid before the answer lands.

     A SALES-role user gets EDIT on every quotation, not just their own — the
     sales team works each other's quotations (add/remove plants, quantities,
     move to shade, add their own advance payment). That does not extend to
     someone else's already-collected advance row: that lock is keyed to the
     collecting user's email, not the access level, so it holds regardless
     of role. */
  const [access, setAccess] = useState("READ");
  const [accessResolved, setAccessResolved] = useState(false);
  const [role, setRole] = useState(null);

  const isDraft = level === "DRAFT";
  const isDelivery = level === "DELIVERY_SHADE";
  const isInvoiced = level === "INVOICE_GENERATED";

  /* Loading shade belongs to the delivery team: once a quotation is at
     DELIVERY_SHADE only a DELIVERY_MANAGER or an ADMIN may edit it, whatever
     the access grant says. Everybody else — SALES included — drops to the
     read-only surface until it moves on. */
  const deliveryRole = role === "DELIVERY_MANAGER" || role === "ADMIN";
  const lockedToDeliveryRole = isDelivery && !deliveryRole;
  const canEdit =
    (access === "EDIT" || role === "SALES") && !lockedToDeliveryRole;

  /* Editing needs BOTH an EDIT grant and a non-invoiced level. READ collapses
     the whole screen to the same read-only surface as an invoice. */
  const canEditLines = canEdit && !isInvoiced; // quantities, units, packing, add/remove
  const canEditTotals = canEdit && !isInvoiced; // discount, transport, specials
  const showChecks = canEdit && isDelivery; // tick boxes live in the action column
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
  /* The advance is a ledger, one row per collector (emailId, collectorName,
     amount, collectionDate, transactionMode). `advance` / `advanceMode` hold
     only the signed-in user's own draft row — which row that is depends on
     `userId`, resolved asynchronously in the bootstrap effect below, so both
     start empty and are hydrated (along with the baseline) once it resolves. */
  const [advanceLedger, setAdvanceLedger] = useState(
    () => quotation?.advancePaymentList || [],
  );
  const [advance, setAdvance] = useState("");
  const [advanceMode, setAdvanceMode] = useState("CASH");
  const [transportOpen, setTransportOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  /* The totals (plant types / quantity / packing / grand total / …) can be
     tucked away to save space; the action buttons stay put either way since
     they're how the screen is actually operated. */
  const [summaryOpen, setSummaryOpen] = useState(true);

  /* Audit history, refreshed from every save response. Kept in state because
     the save response still carries it, but it is not rendered on this screen. */
  const [auditTrail, setAuditTrail] = useState(() =>
    (quotation?.invoiceUpdateDetailList || []).map(auditFromRecord),
  );

  /* Corrected once the signed-in user's own advance row is known — see the
     bootstrap effect. Until then `advance`/`advanceMode` are still at their
     empty defaults, so this matches and nothing reads as falsely dirty. */
  const baselineRef = useRef(
    stateSignatureOf(
      initialLines,
      quotation?.additionalDiscount,
      quotation?.additionalDiscountRemark,
      quotation?.transportationCost,
      "",
      "CASH",
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
  const [userName, setUserName] = useState(null);
  const [pdf, setPdf] = useState(null);

  /* My own row in the advance ledger, and what everyone else has collected.
     A row is only editable by the collector it belongs to, and only while
     it's still same-day editable — never collected yet, or collected earlier
     today. A row collected on an earlier day is locked, mirroring the
     backend's rule. */
  const myAdvanceEntry = useMemo(
    () =>
      advanceLedger.find((row) => norm(row?.emailId) === norm(userId)) || null,
    [advanceLedger, userId],
  );
  const otherAdvanceTotal = useMemo(
    () =>
      advanceLedger
        .filter((row) => norm(row?.emailId) !== norm(userId))
        .reduce((sum, row) => sum + toMoney(row?.amount), 0),
    [advanceLedger, userId],
  );
  const advanceUnlocked =
    !myAdvanceEntry || isSameDay(myAdvanceEntry.collectionDate, new Date());
  const canEditAdvance = canEditTotals && isDraft && advanceUnlocked;

  /* One line per collector, for "who collected what" display. */
  const advanceBreakdown = useMemo(
    () =>
      advanceLedger
        .filter((row) => toMoney(row?.amount) > 0)
        .map((row, index) => {
          const mine = norm(row?.emailId) === norm(userId);
          return {
            key: row?.emailId || `advance-row-${index}`,
            mine,
            name: mine
              ? "You"
              : row?.collectorName || row?.emailId || "Unknown",
            amount: toMoney(row?.amount),
            date: row?.collectionDate || null,
            mode: transactionModeLabel(row?.transactionMode),
          };
        }),
    [advanceLedger, userId],
  );

  /* The delete reason modal is a gate in front of a pending delete. */
  const [pendingDelete, setPendingDelete] = useState(null);

  /* Gates the back / close buttons: shown instead of closing immediately
     whenever there are unsaved changes, so a save or a discard is explicit. */
  const [confirmClose, setConfirmClose] = useState(false);

  /* The per-field reason popup. `fieldReasonRequest` describes the single field
     that just changed and is awaiting a reason. */
  const [fieldReasonRequest, setFieldReasonRequest] = useState(null);

  const searchTimer = useRef(null);
  const searchRef = useRef(null);
  const bodyScrollRef = useRef(null);

  /* ── access check ─────────────────────────────────────────────────
     Runs once on open. Any non-EDIT answer (including an error or a missing
     payload) leaves access at READ, so the safe default is read-only — the
     SALES-role override in `canEdit` above still applies on top of this. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const id = quotation?.quotationId;
      const [response, currentRole] = await Promise.all([
        id == null ? Promise.resolve(null) : getQuotationAccess(id),
        getCurrentRole(),
      ]);
      if (!alive) return;
      setRole(currentRole || null);
      const granted =
        response?.status === "SUCCESS" ? response.payload?.accessLevel : null;
      setAccess(granted === "EDIT" ? "EDIT" : "READ");
      setAccessResolved(true);
    })();
    return () => {
      alive = false;
    };
  }, [quotation?.quotationId]);

  /* ── bootstrap ───────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [user, packingResponse] = await Promise.all([
        getCurrentUser(),
        fetchPackingList(),
      ]);
      if (!alive) return;
      const email = user?.emailId || null;
      setUserId(email);
      setUserName(user?.name || null);
      if (packingResponse?.status === "SUCCESS") {
        setPackings(packingResponse.payload || []);
      }

      /* Now that the signed-in user is known, pull their own row (if any)
         out of the advance ledger and correct the baseline to match, so the
         screen doesn't read as dirty before anything has actually changed. */
      const mine = (quotation?.advancePaymentList || []).find(
        (row) => norm(row?.emailId) === norm(email),
      );
      const mineAmount = toMoney(mine?.amount);
      const mineText = mineAmount > 0 ? String(mineAmount) : "";
      const mineMode = mine?.transactionMode || "CASH";
      setAdvance(mineText);
      setAdvanceMode(mineMode);
      baselineRef.current = stateSignatureOf(
        initialLines,
        quotation?.additionalDiscount,
        quotation?.additionalDiscountRemark,
        quotation?.transportationCost,
        mineText,
        mineMode,
        initialSpecials,
      );
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* ── per-field reason handling ───────────────────────────────────────
     `commitFieldEdit` is called from a field's onBlur. Past Draft, if the
     field differs from its saved baseline and the row isn't new, it opens the
     per-field reason popup pre-filled with any reason already recorded for that
     field. In Draft it does nothing — Draft is never audited. */
  const commitFieldEdit = useCallback(
    (key, field) => {
      if (!auditActive) return;
      setLines((prev) => {
        const line = prev.find((l) => l.key === key);
        if (!line || line.isNew) return prev;
        if (!fieldChanged(line, field)) {
          /* Field returned to its baseline value — drop any stashed reason. */
          if (line.fieldReasons?.[field]) {
            const nextReasons = { ...line.fieldReasons };
            delete nextReasons[field];
            return prev.map((l) =>
              l.key === key ? { ...l, fieldReasons: nextReasons } : l,
            );
          }
          return prev;
        }
        const delta = fieldDelta(line, field);
        setFieldReasonRequest({
          key,
          field,
          plantName: line.plantName,
          from: delta.from,
          to: delta.to,
          existing: line.fieldReasons?.[field] || "",
          /* Snapshot the baseline value so Cancel can revert precisely. */
          snapshot: {
            quantity: line.baseQuantity,
            unitId: line.baseUnitId,
            unitName: line.baseUnitName,
            packingName: line.basePackingName,
            packingCharge: line.basePackingCharge,
            packingId: line.packingId,
            packingCustom: line.packingCustom,
            packingManual: line.packingManual,
            selectedByCustomer: line.baseSelectedByCustomer,
          },
        });
        return prev;
      });
    },
    [auditActive],
  );

  /* Reason accepted: stash it on the line under its field and close the popup. */
  const acceptFieldReason = useCallback(
    (reason) => {
      const req = fieldReasonRequest;
      if (!req) return;
      setLines((prev) =>
        prev.map((line) =>
          line.key === req.key
            ? {
                ...line,
                fieldReasons: { ...line.fieldReasons, [req.field]: reason },
              }
            : line,
        ),
      );
      setFieldReasonRequest(null);
    },
    [fieldReasonRequest],
  );

  /* Reason cancelled: revert the just-edited field to its baseline snapshot and
     clear any reason recorded for it. */
  const cancelFieldReason = useCallback(() => {
    const req = fieldReasonRequest;
    if (!req) {
      setFieldReasonRequest(null);
      return;
    }
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== req.key) return line;
        const nextReasons = { ...line.fieldReasons };
        delete nextReasons[req.field];
        const snap = req.snapshot || {};
        switch (req.field) {
          case "quantity":
            return {
              ...line,
              quantity: snap.quantity,
              fieldReasons: nextReasons,
            };
          case "unit":
            return {
              ...line,
              unitId: snap.unitId ?? null,
              unitName: snap.unitName ?? null,
              fieldReasons: nextReasons,
            };
          case "packing":
            return {
              ...line,
              packingName: snap.packingName,
              packingCharge: snap.packingCharge,
              packingId: snap.packingId ?? null,
              packingCustom: !!snap.packingCustom,
              packingManual: !!snap.packingManual,
              fieldReasons: nextReasons,
            };
          case "choice":
            return {
              ...line,
              selectedByCustomer: !!snap.selectedByCustomer,
              fieldReasons: nextReasons,
            };
          default:
            return { ...line, fieldReasons: nextReasons };
        }
      }),
    );
    setFieldReasonRequest(null);
  }, [fieldReasonRequest]);

  const addPlant = useCallback(
    (plant) => {
      const inventory = plant.inventoryList || [];
      const preferred =
        inventory.find((row) => row.unitId === quotation?.unitId) ||
        inventory.find((row) => (row.quantity || 0) > 0) ||
        inventory[0] ||
        null;

      /* Checked against the live `lines` state (not `prev` inside the updater
         below) so the caller can know, synchronously, whether this tap grew
         the list or just bumped an existing row's quantity — that's what
         decides whether there's anything new at the bottom to scroll to. */
      const existing = lines.find(
        (line) =>
          line.plantId === plant.plantId &&
          line.unitId === (preferred?.unitId ?? null),
      );

      setLines((prev) => {
        if (existing) {
          return prev.map((line) =>
            line.key === existing.key
              ? { ...line, quantity: String(toCount(line.quantity) + 1) }
              : line,
          );
        }

        const seedling = isSeedling(plant.plantType);
        /* New rows always start at "No packing" — the operator picks one
           explicitly via the "Add packing" button rather than having a size
           match silently pre-selected for them. */
        const packingName = NO_PACKING.packingName;
        const packingCharge = String(NO_PACKING.price);

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
            packingId: null,
            packingName,
            packingCharge,
            packingManual: false,
            packingCustom: false,
            /* new rows are the customer's pick until told otherwise */
            selectedByCustomer: true,
            baseQuantity: "0",
            basePackingName: packingName,
            basePackingCharge: packingCharge,
            baseSelectedByCustomer: true,
            baseUnitId: preferred?.unitId ?? null,
            baseUnitName: preferred?.unitName ?? null,
            fieldReasons: {},
            checked: false,
            isNew: true,
          },
        ];
      });

      setTerm("");
      setResults([]);

      /* A brand-new row lands at the bottom of the list — on the mobile card
         layout, scroll it into view so the operator sees what they just
         added instead of having to hunt for it. The delay gives the new
         card a chance to actually lay out before we scroll to it. */
      if (!existing && isCardMode) {
        setTimeout(() => {
          bodyScrollRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    },
    [quotation?.unitId, lines, isCardMode],
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

  const chooseUnit = useCallback(
    (line, inventory) => {
      updateLine(line.key, {
        unitId: inventory.unitId,
        unitName: inventory.unitName,
        traySize: inventory.traySize ?? line.traySize,
        available: inventory.quantity ?? null,
      });
      setPicker(null);
      /* A picker selection is an immediate, discrete edit — reason it now. */
      setTimeout(() => commitFieldEdit(line.key, "unit"), 0);
    },
    [updateLine, commitFieldEdit],
  );

  const choosePacking = useCallback(
    (line, packing) => {
      /* Custom: the operator only enters an amount — the name is fixed to
         "Custom packing" so nothing else needs typing. */
      if (packing.packingId === CUSTOM_PACKING.packingId) {
        updateLine(line.key, {
          packingId: null,
          packingName: "Custom packing",
          packingCustom: true,
          packingManual: true,
        });
        setPicker(null);
        /* Custom leaves the charge to be typed; the charge input's own blur
           will fire the packing reason once the amount is set. */
        return;
      }

      updateLine(line.key, {
        packingId: packing.packingId ?? null,
        packingName: packingLabel(packing),
        packingCharge: String(packing.price ?? 0),
        packingManual: false,
        packingCustom: false,
      });
      setPicker(null);
      setTimeout(() => commitFieldEdit(line.key, "packing"), 0);
    },
    [updateLine, commitFieldEdit],
  );

  const chooseChoice = useCallback(
    (line, option) => {
      updateLine(line.key, { selectedByCustomer: option.value });
      setPicker(null);
      setTimeout(() => commitFieldEdit(line.key, "choice"), 0);
    },
    [updateLine, commitFieldEdit],
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
    const grand = beforeDiscount - discountValue;
    const advanceValue = Math.min(otherAdvanceTotal + toMoney(advance), grand);

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
      grand,
      advance: advanceValue,
      remaining: Math.max(0, grand - advanceValue),
    };
  }, [lines, specials, discount, transport, advance, otherAdvanceTotal]);

  /* ── change tracking ─────────────────────────────────────────────── */
  const dirty = useMemo(
    () =>
      stateSignatureOf(
        lines,
        discount,
        discountRemark,
        transport,
        advance,
        advanceMode,
        specials,
      ) !== baselineRef.current,
    [
      lines,
      discount,
      discountRemark,
      transport,
      advance,
      advanceMode,
      specials,
    ],
  );

  const changedLines = useMemo(() => lines.filter(lineChanged), [lines]);

  const incomplete = lines.some(
    (line) => !line.unitId || toCount(line.quantity) <= 0,
  );

  /* Past Draft, every changed field must carry a reason before saving. New
     rows are exempt (they need no per-field reason). */
  const missingFieldReason = useMemo(() => {
    if (!auditActive) return false;
    return lines.some((line) => {
      if (line.isNew) return false;
      return ["quantity", "unit", "packing", "choice"].some(
        (field) =>
          fieldChanged(line, field) &&
          !String(line.fieldReasons?.[field] || "").trim(),
      );
    });
  }, [auditActive, lines]);

  const discountEntered = toMoney(discount);
  const transportEntered = toMoney(transport);
  /* The combined advance across every collector, capped at the grand total —
     what the operator actually sees as "advance received". */
  const advanceEntered = totals.advance;
  const discountRemarkMissing = discountEntered > 0 && !discountRemark.trim();
  const discountOverTotal = discountEntered > totals.beforeDiscount;

  const checkableLines = lines.filter((line) => !line.isNew);
  const checkedCount = checkableLines.filter((line) => line.checked).length;
  const allChecked =
    checkableLines.length > 0 && checkedCount === checkableLines.length;

  const working = saving || busy !== null;

  const blockingReason = lockedToDeliveryRole
    ? "Only a delivery manager or an admin can edit a quotation in the loading shade."
    : !canEdit
      ? "You have read-only access to this quotation."
      : !userId
        ? "Signed-in user not found. Sign in again to save."
        : incomplete
          ? "Every row needs a unit and a quantity above zero."
          : missingFieldReason
            ? "Add a reason for every changed field before saving."
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

  const applyAdvance = useCallback((value, mode) => {
    setAdvance(value);
    setAdvanceMode(mode);
    setAdvanceOpen(false);
  }, []);

  /* ── rehydrate from a save response ────────────────────────────────── */
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

      const nextLedger = payload.advancePaymentList || [];
      const mine = nextLedger.find(
        (row) => norm(row?.emailId) === norm(userId),
      );
      const nextAdvance = toMoney(mine?.amount);
      const nextAdvanceText = nextAdvance > 0 ? String(nextAdvance) : "";
      const nextAdvanceMode = mine?.transactionMode || "CASH";

      setDiscount(nextDiscountText);
      setDiscountRemark(nextRemark);
      setTransport(nextTransportText);
      setAdvanceLedger(nextLedger);
      setAdvance(nextAdvanceText);
      setAdvanceMode(nextAdvanceMode);

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
        nextAdvanceText,
        nextAdvanceMode,
        nextSpecials,
      );
    },
    [level, userId],
  );

  /* ── save ────────────────────────────────────────────────────────────
     The only write this screen performs. It never chains into another call.

     Per-field reasons now live on each line (line.fieldReasons). At save, each
     changed field's reason is joined into a single per-row reason string sent
     with that row. Draft is never audited, so no reasons are attached there. */
  const persist = useCallback(
    async ({ deleteReason } = {}) => {
      if (blockingReason) {
        setError(blockingReason);
        return null;
      }

      setError(null);
      setNotice(null);
      setSaving(true);

      const discountAmount = toMoney(discount);
      const transportAmount = toMoney(transport);
      const advanceAmount = toMoney(advance);

      const reasonForLine = (line) => {
        if (!auditActive || line.isNew) return null;
        const parts = ["quantity", "unit", "packing", "choice"]
          .filter((field) => fieldChanged(line, field))
          .map((field) => {
            const r = String(line.fieldReasons?.[field] || "").trim();
            return r ? `${FIELD_META[field].label}: ${r}` : null;
          })
          .filter(Boolean);
        return parts.length > 0 ? parts.join(" · ") : null;
      };

      const body = {
        plantList: lines.map((line) => ({
          plantId: line.plantId,
          // Unchanged contract: seedlings still send the tray count.
          quantityReserved: toCount(line.quantity),
          unitId: line.unitId,
          unitName: line.unitName,
          packingId: line.packingId ?? null,
          packingName: line.packingName,
          packingCharge: toMoney(line.packingCharge),
          selectedByCustomer: line.selectedByCustomer,
          reason: lineChanged(line) ? reasonForLine(line) : null,
        })),
        specialPlantList: specials.map((special) => ({
          barcodeId: special.barcodeId,
        })),
        additionalDiscount: discountAmount,
        additionalDiscountRemark:
          discountAmount > 0 ? discountRemark.trim() : null,
        transportationCost: transportAmount,
        /* The flat advanceAmount field is gone — the backend only reads the
           ledger now. Only the signed-in user's own row is ever sent, so a
           save can never touch a colleague's collected advance; resending an
           unchanged amount is a no-op on the server. */
        advanceTransactionList: userId
          ? [
              {
                emailId: userId,
                collectorName: userName || userId,
                amount: advanceAmount,
                transactionMode: advanceMode,
              },
            ]
          : [],
        /* Delete reasons aren't tied to a surviving row, so they ride along at
           the document level when a removal triggered this save. */
        deleteReason: deleteReason || null,
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
          setAdvanceLedger((prev) => {
            const others = prev.filter(
              (row) => norm(row?.emailId) !== norm(userId),
            );
            if (advanceAmount <= 0) return others;
            return [
              ...others,
              {
                emailId: userId,
                collectorName: userName || userId,
                amount: advanceAmount,
                collectionDate: new Date().toISOString(),
                transactionMode: advanceMode,
              },
            ];
          });
          baselineRef.current = stateSignatureOf(
            lines.map(settleLine),
            discount,
            discountRemark,
            transport,
            advance,
            advanceMode,
            specials,
          );
        }

        setNotice(response.message || "Quotation saved.");
        onSaved?.(payload ?? true, { source: "save", keepOpen: true });
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
      userName,
      onSaved,
      discount,
      discountRemark,
      transport,
      advance,
      advanceMode,
      auditActive,
      rehydrate,
    ],
  );

  /* Save Changes. All per-field reasons are already gathered inline, so this
     just validates and writes — no summary modal in the way. */
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

    persist();
  }, [working, blockingReason, dirty, persist]);

  /* Back / close. Unsaved changes are never discarded silently — gate the
     actual close behind a confirmation that lets the operator save first. */
  const requestClose = useCallback(() => {
    if (working) return;
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    onClose?.();
  }, [working, dirty, onClose]);

  const discardAndClose = useCallback(() => {
    setConfirmClose(false);
    onClose?.();
  }, [onClose]);

  const saveAndClose = useCallback(async () => {
    const result = await persist();
    if (result) {
      setConfirmClose(false);
      onClose?.();
    }
  }, [persist, onClose]);

  /* Delete. Allowed in Draft and Delivery shade; past Draft it is reasoned via
     the delete reason modal. */
  const requestDelete = useCallback(
    (line) => {
      if (working) return;

      /* Draft, or a row added in this session (never saved): just drop it. */
      if (!auditActive || line.isNew) {
        dropLine(line.key);
        return;
      }

      setPendingDelete({
        lineKey: line.key,
        request: {
          summary: `${line.plantName} will be removed from this quotation and the removal recorded.`,
          title: line.plantName,
          detail: `${formatNumber(toCount(line.quantity))} ${unitWord(
            line,
          )} · ${line.unitName || "no unit"} · ${formatAmount(
            lineAmount(line),
          )}`,
        },
      });
    },
    [working, auditActive, dropLine],
  );

  /* The delete reason modal hands its reason back here. The row is dropped, the
     resulting document is saved, and the modal closes only if the save
     succeeds. `pendingDeleteReason` stages the save so it runs against the new
     line list once state has committed. */
  const [pendingDeleteReason, setPendingDeleteReason] = useState(null);

  const submitDelete = useCallback(
    (reason) => {
      const action = pendingDelete;
      if (!action) return;
      setLines((prev) => prev.filter((line) => line.key !== action.lineKey));
      setTimeout(() => {
        setPendingDeleteReason({ reason });
      }, 0);
    },
    [pendingDelete],
  );

  useEffect(() => {
    if (!pendingDeleteReason) return;
    const { reason } = pendingDeleteReason;
    setPendingDeleteReason(null);
    (async () => {
      const result = await persist({ deleteReason: reason });
      if (result) setPendingDelete(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeleteReason]);

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

  /* ── move / invoice ────────────────────────────────────────────────── */
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

    setLevel("DELIVERY_SHADE");
    onSaved?.({}, { source: "move", keepOpen: true });
    setNotice("Moved to the loading shade.");
    setPdf({
      kind: "shade",
      title: "Moved to loading shade",
      file: response.payload,
    });
    setBusy(null);
  }, [working, dirty, handleSave, quotation, userId, onSaved]);

  const runInvoice = useCallback(async () => {
    if (working) return;

    if (dirty) {
      handleSave();
      return;
    }

    setError(null);
    setNotice(null);
    setBusy("invoice");

    const response = await convertToInvoice(quotation.quotationId);

    if (response?.status !== "SUCCESS") {
      setBusy(null);
      setError(response?.message || "Could not generate the invoice.");
      return;
    }

    setLevel("INVOICE_GENERATED");
    onSaved?.({}, { source: "invoice", keepOpen: true });
    setNotice("Invoice generated.");
    setPdf({ kind: "invoice", title: "Invoice", file: response.payload });
    setBusy(null);
  }, [working, dirty, handleSave, quotation, onSaved]);

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

  /* A row is editable when there's an EDIT grant AND the quotation is not yet
     invoiced, or when it was just added here. */
  const lineEditable = useCallback(
    (line) => canEditLines || (canEdit && !!line.isNew),
    [canEditLines, canEdit],
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
      if (line.isSpecial) {
        return (
          <View style={styles.alignRight}>
            <Text style={styles.priceText}>{formatAmount(line.price)}</Text>
          </View>
        );
      }
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
      if (line.isSpecial || !lineEditable(line)) {
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
      if (line.isSpecial) {
        return (
          <View style={styles.cellFill}>
            <View style={styles.readQty}>
              <Text style={styles.readQtyValue}>1</Text>
              <Text style={styles.readQtyUnit}>plant</Text>
            </View>
          </View>
        );
      }
      const entered = toCount(line.quantity);
      const traySize = toCount(line.traySize);
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
          <View style={[styles.qtyBox, moved && styles.qtyBoxDirty]}>
            <TextInput
              style={styles.qtyInput}
              value={line.quantity}
              onChangeText={(value) =>
                updateLine(line.key, { quantity: value.replace(/[^0-9]/g, "") })
              }
              onBlur={() => commitFieldEdit(line.key, "quantity")}
              keyboardType="number-pad"
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={C.FAINT}
            />
          </View>

          {/* Below the box, not inline beside the input — inline was wide
             enough to spill past this column into the next field on narrow
             cards. */}
          <Text style={styles.qtyUnit} numberOfLines={1}>
            {line.seedling ? "Trays" : "Plants"}
          </Text>

          {derived}

          {moved ? (
            <Text style={styles.qtyHintMoved} numberOfLines={1}>
              Was {formatNumber(toCount(line.baseQuantity))}
            </Text>
          ) : line.reserved != null && !isDraft ? (
            <Text style={styles.qtyHint} numberOfLines={1}>
              Reserved {formatNumber(line.reserved)}
            </Text>
          ) : null}
        </View>
      );
    },
    [styles, C, isDraft, lineEditable, updateLine, commitFieldEdit],
  );

  const packingField = useCallback(
    (line) => {
      if (line.isSpecial) {
        return (
          <View style={styles.packStack}>
            <Text style={styles.readValue} numberOfLines={1}>
              Not applicable
            </Text>
            <Text style={styles.readSub} numberOfLines={1}>
              Special plant
            </Text>
          </View>
        );
      }
      if (!lineEditable(line)) {
        return (
          <View style={styles.packStack}>
            <Text style={styles.readValue} numberOfLines={1}>
              {line.packingName || "No packing"}
            </Text>
            <Text style={styles.readSub} numberOfLines={1}>
              {formatAmount(line.packingCharge)}{" "}
              {line.seedling ? "/ tray" : "/ plant"}
            </Text>
          </View>
        );
      }

      const custom = isCustomPacking(line, packings);

      /* Default state: no packing chosen yet. Keep the dropdown out of the
         way and offer a single "Add packing" button instead. Tapping it
         auto-maps the packing that matches this plant's size, the same way a
         freshly-added plant used to be pre-filled — the dropdown then appears
         so the operator can change it if the auto-mapped guess is wrong. With
         no size match there's nothing to auto-fill, so it just opens the
         picker instead. */
      const isNoPacking =
        !custom && norm(line.packingName) === norm(NO_PACKING.packingName);

      if (isNoPacking) {
        return (
          <View style={styles.packStack}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.addPackingBtn,
                (hovered || pressed) && styles.addPackingBtnHover,
              ]}
              onPress={() => {
                const matched = packingForSize(line.size, packings);
                if (!matched) {
                  openPackingPicker(line.key);
                  return;
                }
                updateLine(line.key, {
                  packingId: matched.packingId ?? null,
                  packingName: packingLabel(matched),
                  packingCharge: String(matched.price ?? 0),
                  packingManual: false,
                  packingCustom: false,
                });
                setTimeout(() => commitFieldEdit(line.key, "packing"), 0);
              }}
            >
              <Ionicons name="add" size={14} color={C.NAVY} />
              <Text style={styles.addPackingText} numberOfLines={1}>
                Add packing
              </Text>
            </Pressable>
          </View>
        );
      }

      const selectLabel = custom
        ? "Custom"
        : line.packingName || NO_PACKING.packingName;

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
              {selectLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={C.MUTED} />
          </Pressable>

          {line.packingManual ? (
            <View style={[styles.chargeBox, styles.chargeBoxManual]}>
              <Text style={[styles.chargePrefix, styles.chargeManualText]}>
                ₹
              </Text>
              <TextInput
                style={[styles.chargeInput, styles.chargeManualText]}
                value={line.packingCharge}
                onChangeText={(value) =>
                  updateLine(line.key, {
                    packingCharge: value.replace(/[^0-9.]/g, ""),
                  })
                }
                onBlur={() => commitFieldEdit(line.key, "packing")}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor={C.FAINT}
              />
              <Text style={styles.chargeSuffix}>
                {line.seedling ? "/ tray" : "/ plant"}
              </Text>
            </View>
          ) : (
            /* A catalogue packing's rate is fixed — shown as a plain label,
               not an editable field. */
            <View style={styles.chargeLabelRow}>
              <Text style={styles.chargeLabelValue} numberOfLines={1}>
                {formatAmount(line.packingCharge)}
              </Text>
              <Text style={styles.chargeSuffix}>
                {line.seedling ? "/ tray" : "/ plant"}
              </Text>
            </View>
          )}
        </View>
      );
    },
    [
      styles,
      C,
      lineEditable,
      openPackingPicker,
      updateLine,
      packings,
      commitFieldEdit,
    ],
  );

  /* Selected by customer: an inline Yes / No radio pair. Read-only lines show
     the same radio look with the inactive dot dimmed and presses disabled. */
  const choiceField = useCallback(
    (line, { stacked } = {}) => {
      if (line.isSpecial) {
        return <Text style={styles.dashText}>—</Text>;
      }

      const on = !!line.selectedByCustomer;
      const editable = lineEditable(line);

      return (
        <View style={stacked ? styles.radioColumn : styles.radioRow}>
          {CHOICE_OPTIONS.map((option) => {
            const active = option.value === on;
            const dot = (
              <View style={[styles.radioDot, active && styles.radioDotOn]}>
                {active ? <View style={styles.radioDotInner} /> : null}
              </View>
            );
            const label = (
              <Text
                style={[styles.radioLabel, active && styles.radioLabelOn]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            );

            if (!editable) {
              return (
                <View key={option.label} style={styles.radioItem}>
                  {dot}
                  {label}
                </View>
              );
            }

            return (
              <Pressable
                key={option.label}
                style={({ hovered, pressed }) => [
                  styles.radioItem,
                  (hovered || pressed) && styles.radioItemHover,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${line.plantName} selected by customer: ${option.label}`}
                onPress={() => chooseChoice(line, option)}
              >
                {dot}
                {label}
              </Pressable>
            );
          })}
        </View>
      );
    },
    [styles, lineEditable, chooseChoice],
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

  const actionField = useCallback(
    (line) => {
      if (line.isSpecial) {
        if (!canEditTotals) return <Text style={styles.dashText}>—</Text>;
        return (
          <Pressable
            style={({ hovered, pressed }) => [
              styles.deleteBtn,
              hovered && styles.deleteBtnHover,
              pressed && styles.deleteBtnPressed,
            ]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Remove special plant ${line.barcodeId}`}
            onPress={() => removeSpecial(line.key)}
          >
            <Ionicons name="trash-outline" size={16} color={C.RED} />
          </Pressable>
        );
      }
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
    [
      showChecks,
      canEditLines,
      canEditTotals,
      checkBox,
      toggleCheck,
      deleteButton,
      removeSpecial,
      styles,
      C,
    ],
  );

  /* ── columns ─────────────────────────────────────────────────────── */
  const columns = useMemo(() => {
    if (isCardMode) return [];

    const inner = space - styles.gutter * 2 - 2; // shell border
    const dense = space < 1000;
    const showCalc = space >= BP_CALC;
    const showPrice = space >= BP_PRICE;
    const showSno = space >= BP_SNO;

    const w = {
      sno: 40,
      price: dense ? 84 : 96,
      unit: dense ? 132 : 150,
      qty: dense ? 138 : 156,
      calc: 172,
      packing: dense ? 150 : 168,
      /* single stacked column — narrower than a side-by-side radio pair */
      choice: dense ? 66 : 74,
      amount: dense ? 104 : 118,
      action: showChecks && canEditLines ? 80 : 56,
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
              {line.isSpecial ? line.plantName : plantTitleWithSize(line)}
            </Text>
            <Text style={styles.plantSub} numberOfLines={1}>
              {line.isSpecial
                ? line.barcodeId || "Special plant"
                : line.plantSubtitle}
            </Text>
            <View style={styles.metaRow}>
              {line.isSpecial ? (
                <View style={styles.specialTag}>
                  <Ionicons name="pricetag" size={9} color={C.NAVY} />
                  <Text style={styles.specialTagText}>SPECIAL</Text>
                </View>
              ) : null}
              {!line.isSpecial && !showPrice ? (
                <View style={styles.metaTag}>
                  <Text style={styles.metaTagText}>
                    {formatAmount(effectivePriceOf(line))} /{" "}
                    {priceUnitWord(line)}
                  </Text>
                </View>
              ) : null}
              {!line.isSpecial && lineChanged(line) ? (
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
        sublabel: "per tray or plant",
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
      {
        key: "choice",
        label: "Selected by",
        sublabel: "customer",
        size: w.choice,
        align: "center",
        /* Stacked into one narrow column here so the table never needs to
           scroll sideways to fit it; the card layout keeps the roomier
           side-by-side radios (see renderCard). */
        render: (line) => choiceField(line, { stacked: true }),
      },
      {
        key: "amount",
        label: "Amount",
        size: w.amount,
        align: "right",
        render: (line) => (
          <Text style={styles.amountText} numberOfLines={1}>
            {formatAmount(line.isSpecial ? line.price : lineAmount(line))}
          </Text>
        ),
      },
      {
        key: "action",
        label: showChecks ? "Check" : "",
        size: w.action,
        align: "center",
        renderHead: null,
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
    priceBlock,
    unitSelect,
    qtyField,
    packingField,
    choiceField,
    actionField,
  ]);

  const renderRow = useCallback(
    (item, index) => (
      <TableRow
        key={item.key}
        item={item}
        index={index}
        columns={columns}
        styles={styles}
      />
    ),
    [columns, styles],
  );

  const tableRows = useMemo(
    () => [...lines, ...specials.map((sp) => ({ ...sp, isSpecial: true }))],
    [lines, specials],
  );

  /* ── card row (narrow screens) ───────────────────────────────────── */
  const renderCard = useCallback(
    (item, index) => (
      <View
        key={item.key}
        style={[
          styles.lineCard,
          item.isSpecial && styles.lineCardSpecial,
          !item.isSpecial && item.checked && styles.lineCardChecked,
          !item.isSpecial && lineChanged(item) && styles.lineCardDirty,
        ]}
      >
        <View style={styles.lineCardTop}>
          <View
            style={[
              styles.lineIndex,
              item.isSpecial && styles.lineIndexSpecial,
            ]}
          >
            {item.isSpecial ? (
              <Ionicons name="pricetag" size={13} color={C.NAVY} />
            ) : (
              <Text style={styles.lineIndexText}>{index + 1}</Text>
            )}
          </View>

          <View style={styles.fill}>
            {/* Name, subtitle, price and any tag all flow in one row to keep
               each card compact — several cards should fit on one screen. */}
            <View style={styles.cardHeaderRow}>
              <Text
                style={[styles.plantName, styles.plantNameInline]}
                numberOfLines={1}
              >
                {item.isSpecial ? item.plantName : plantTitleWithSize(item)}
              </Text>
              <Text style={styles.plantSubInline} numberOfLines={1}>
                {item.isSpecial
                  ? item.barcodeId || "Special plant"
                  : item.plantSubtitle}
              </Text>
              {item.isSpecial ? (
                <View style={styles.specialTag}>
                  <Ionicons name="pricetag" size={9} color={C.NAVY} />
                  <Text style={styles.specialTagText}>SPECIAL</Text>
                </View>
              ) : null}
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>
                  {formatAmount(
                    item.isSpecial ? item.price : effectivePriceOf(item),
                  )}{" "}
                  / {item.isSpecial ? "plant" : priceUnitWord(item)}
                </Text>
              </View>
              {!item.isSpecial && lineChanged(item) ? (
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
              {/* Line total sits at the end of the header row, after every
                 tag, instead of its own footer band lower in the card. */}
              <Text style={styles.cardHeaderAmount} numberOfLines={1}>
                {formatAmount(item.isSpecial ? item.price : lineAmount(item))}
              </Text>
            </View>
          </View>

          {actionField(item)}
        </View>

        {item.isSpecial ? (
          <View style={styles.fieldGrid}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Unit</Text>
              {unitSelect(item)}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Quantity</Text>
              {qtyField(item, { showDerived: false })}
            </View>
          </View>
        ) : (
          <View style={styles.fieldGrid}>
            <View style={styles.fieldQuad}>
              <Text style={styles.fieldLabel}>Unit</Text>
              {unitSelect(item)}
            </View>
            <View style={styles.fieldQuad}>
              <Text style={styles.fieldLabel}>
                {isDraft ? "Reserved qty" : "Delivered qty"}
              </Text>
              {qtyField(item, { showDerived: true })}
            </View>
            <View style={styles.fieldQuad}>
              <Text style={styles.fieldLabel}>Packing</Text>
              {packingField(item)}
            </View>
            <View style={styles.fieldQuadTight}>
              <Text style={styles.fieldLabel}>Customer</Text>
              {choiceField(item, { stacked: true })}
            </View>
          </View>
        )}
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

  const onTableLayout = useCallback((event) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    setAvail((prev) => (Math.abs(prev - measured) > 2 ? measured : prev));
  }, []);

  /* ── picker sheet ────────────────────────────────────────────────── */
  const renderPicker = () => {
    if (!picker || !activeLine) return null;

    const unitMode = picker.type === "unit";
    const packingMode = picker.type === "packing";

    const options = unitMode
      ? activeLine.inventoryList || []
      : [
          NO_PACKING,
          ...packings,
          /* Custom packing (hand-typed charge) is only offered for seedling
             plants — other plant types must use a catalogue packing. */
          ...(activeLine.seedling ? [CUSTOM_PACKING] : []),
        ];

    const title = unitMode ? "Select unit" : "Select packing";

    const activeCustom = packingMode && isCustomPacking(activeLine, packings);

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
              <ScrollView
                style={styles.sheetScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {options.length === 0 ? (
                  <Text style={styles.resultEmpty}>
                    {unitMode
                      ? "This plant is not stocked in any unit."
                      : "No packing options yet."}
                  </Text>
                ) : null}

                {options.map((option) => {
                  const isCustomOption =
                    packingMode &&
                    option.packingId === CUSTOM_PACKING.packingId;

                  const active = unitMode
                    ? option.unitId === activeLine.unitId
                    : isCustomOption
                      ? activeCustom
                      : !activeCustom &&
                        packingLabel(option) === activeLine.packingName;

                  const optionKey = unitMode
                    ? `unit-${option.unitId}`
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
                          : choosePacking(activeLine, option)
                      }
                    >
                      {isCustomOption ? (
                        <View style={styles.optionLead}>
                          <View
                            style={[
                              styles.optionIcon,
                              activeCustom && styles.optionIconCustom,
                            ]}
                          >
                            <Ionicons
                              name="create-outline"
                              size={16}
                              color={activeCustom ? C.ALERT : C.MUTED}
                            />
                          </View>
                          <View style={styles.fill}>
                            <Text
                              style={[
                                styles.optionText,
                                active && styles.optionTextActive,
                              ]}
                            >
                              Custom packing
                            </Text>
                            <Text style={styles.optionMeta}>
                              Type your own name and charge
                            </Text>
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
                      ) : packingMode && !isCustomOption ? (
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

  /* Audit history is not shown on this screen. */
  const renderAudit = () => null;

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

  /* The customer name is what an operator actually needs to spot at a
     glance, so it leads as the header title; "QTN-8 · Edit quotation" moves
     down to the subtitle instead of pushing the name out of view. */
  const modeLabel = canEditLines ? "Edit quotation" : "Check quotation";
  const headerTitle = quotation?.customerName || modeLabel;
  const headerSubtitle = quotation?.customerName
    ? `QTN-${quotation?.quotationId} · ${modeLabel}`
    : `QTN-${quotation?.quotationId}`;

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
        {/* ── header ──
           Two rows: the top row is just [back] [name] [doc] [close], so the
           customer name gets almost the whole header width and is never
           truncated. Everything else — QTN id, status pills, date — sits on
           its own row underneath where it's free to wrap or ellipsize
           without stealing space from the name. */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.iconBtn,
                hovered && styles.iconBtnHover,
                pressed && styles.iconBtnPressed,
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={requestClose}
            >
              <Ionicons name="arrow-back" size={19} color={C.NAVY} />
            </Pressable>

            <Text style={styles.title}>{headerTitle}</Text>

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
          </View>

          <View style={styles.headerMetaRow}>
            <Text style={styles.subtitle} numberOfLines={1}>
              {headerSubtitle}
            </Text>

            <View style={styles.headerMeta}>
              {/* Read-only badge whenever access is not EDIT (and the check
                  has resolved), so the operator knows why the grid is
                  locked. */}
              {accessResolved && !canEdit ? (
                <View
                  style={[
                    styles.levelPill,
                    {
                      backgroundColor: "#94A3B814",
                      borderColor: "#94A3B833",
                    },
                  ]}
                >
                  <Ionicons name="lock-closed" size={12} color="#64748B" />
                  <Text style={[styles.levelPillText, { color: "#64748B" }]}>
                    READ ONLY
                  </Text>
                </View>
              ) : null}

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
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={C.NAVY}
                    />
                    <Text style={styles.dateText}>{quotationDate}</Text>
                  </View>
                </>
              ) : null}
            </View>
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
                  <ScrollView
                    style={styles.resultsScroll}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                  >
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
          </View>
        ) : null}

        {/* ── scrollable body ── */}
        <ScrollView
          ref={bodyScrollRef}
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
            </View>
          ) : null}

          <View style={styles.tableWrap} onLayout={onTableLayout}>
            {tableRows.length === 0 ? (
              <View style={styles.tableShell}>
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
              </View>
            ) : isCardMode ? (
              <View style={styles.cardList}>
                {tableRows.map((item, index) => renderCard(item, index))}
              </View>
            ) : (
              <View style={styles.tableShell}>
                {tableHead}
                <View style={styles.tableBody}>
                  {tableRows.map((item, index) => renderRow(item, index))}
                </View>
              </View>
            )}
          </View>

          {renderAudit()}

          {error ? (
            <View style={styles.banner}>
              <Ionicons name="alert-circle-outline" size={17} color={C.ALERT} />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          ) : notice ? (
            <View style={[styles.banner, styles.bannerOk]}>
              <Ionicons
                name="checkmark-circle"
                size={17}
                color={C.GREEN_DEEP}
              />
              <Text style={styles.bannerOkText}>{notice}</Text>
            </View>
          ) : null}
        </ScrollView>

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
                  <Text style={styles.adjustChipText} numberOfLines={1}>
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
                  <Text style={styles.adjustAddText} numberOfLines={1}>
                    Add transport cost
                  </Text>
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
                  <Text style={styles.adjustChipText} numberOfLines={1}>
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
                  <Text style={styles.adjustAddText} numberOfLines={1}>
                    Add discount
                  </Text>
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
                  <Text style={styles.adjustChipText} numberOfLines={1}>
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
                  <Text style={styles.adjustAddText} numberOfLines={1}>
                    Add special plant
                  </Text>
                  <Ionicons name="add" size={16} color={C.NAVY} />
                </Pressable>
              )}

              {advanceEntered > 0 && !canEditAdvance ? (
                /* Either the quotation has left Draft, or the signed-in
                   user's own row was collected on an earlier day. Show the
                   total, with the date only when it's actually theirs to
                   show, but don't allow an edit. */
                <View style={[styles.adjustChip, styles.adjustChipLocked]}>
                  <Ionicons name="lock-closed" size={13} color={C.MUTED} />
                  <Text style={styles.adjustChipText} numberOfLines={1}>
                    Advance {formatAmount(advanceEntered)}
                    {myAdvanceEntry?.collectionDate
                      ? ` · ${formatDate(myAdvanceEntry.collectionDate)}`
                      : ""}
                  </Text>
                </View>
              ) : advanceEntered > 0 ? (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.adjustChip,
                    (hovered || pressed) && styles.adjustChipHover,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit advance payment"
                  onPress={() => setAdvanceOpen(true)}
                >
                  <Ionicons name="wallet-outline" size={15} color={C.NAVY} />
                  <Text style={styles.adjustChipText} numberOfLines={1}>
                    Advance {formatAmount(advanceEntered)}
                  </Text>
                  <Ionicons name="create-outline" size={14} color={C.MUTED} />
                </Pressable>
              ) : canEditAdvance ? (
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.adjustAddBtn,
                    (hovered || pressed) && styles.adjustAddBtnHover,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add advance payment"
                  onPress={() => setAdvanceOpen(true)}
                >
                  <Ionicons name="wallet-outline" size={15} color={C.NAVY} />
                  <Text style={styles.adjustAddText} numberOfLines={1}>
                    Advance payment
                  </Text>
                  <Ionicons name="add" size={16} color={C.NAVY} />
                </Pressable>
              ) : null}
            </View>
          ) : transportEntered > 0 ||
            discountEntered > 0 ||
            advanceEntered > 0 ? (
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
              {advanceEntered > 0 ? (
                <View style={styles.moneyReadItem}>
                  <Ionicons name="wallet-outline" size={14} color={C.NAVY} />
                  <Text style={styles.moneyReadText}>
                    Advance {formatAmount(advanceEntered)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Who collected the advance — every ledger row, however many
              collectors, so it's always clear whose money is whose. */}
          {advanceBreakdown.length > 0 ? (
            <View style={styles.moneyReadBar}>
              {advanceBreakdown.map((row) => (
                <View key={row.key} style={styles.moneyReadItem}>
                  <Ionicons
                    name="person-circle-outline"
                    size={14}
                    color={C.NAVY}
                  />
                  <Text style={styles.moneyReadText}>
                    {row.name} · {formatAmount(row.amount)}
                    {row.mode ? ` · ${row.mode}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            style={({ hovered, pressed }) => [
              styles.summaryToggle,
              (hovered || pressed) && styles.summaryToggleHover,
            ]}
            accessibilityRole="button"
            accessibilityLabel={summaryOpen ? "Hide summary" : "Show summary"}
            onPress={() => setSummaryOpen((prev) => !prev)}
          >
            <Ionicons
              name={summaryOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color={C.NAVY}
            />
            <Text style={styles.summaryToggleText}>
              {summaryOpen ? "Hide summary" : "Show summary"}
            </Text>
          </Pressable>

          {!isCardMode ? (
            <View style={styles.footerRow}>
              {summaryOpen ? (
                <View style={styles.metricStrip}>
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
                      <Text style={styles.metricLabel}>Special</Text>
                      <Text style={[styles.metricValue, styles.metricWarm]}>
                        {formatAmount(totals.special)}
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

                  {totals.advance > 0 ? (
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Advance</Text>
                      <Text style={[styles.metricValue, styles.metricDiscount]}>
                        {formatAmount(totals.advance)}
                      </Text>
                      <Text style={styles.metricUnit}>received</Text>
                    </View>
                  ) : null}

                  <View style={[styles.metric, styles.metricGrand]}>
                    <Text style={styles.metricGrandLabel}>Grand total</Text>
                    <Text style={styles.metricGrandValue}>
                      {formatAmount(totals.grand)}
                    </Text>
                  </View>

                  {totals.advance > 0 ? (
                    <View style={[styles.metric, styles.metricRemaining]}>
                      <Text style={styles.metricRemainingLabel}>Remaining</Text>
                      <Text style={styles.metricRemainingValue}>
                        {formatAmount(totals.remaining)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.actionRow}>
                {canEditLines || canEditTotals || dirty ? (
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.ghostButton,
                      (hovered || pressed) &&
                        canSave &&
                        styles.ghostButtonHover,
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

                {canEdit && isDraft ? (
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
                      <Ionicons
                        name="arrow-forward"
                        size={19}
                        color="#FFFFFF"
                      />
                    )}
                    <Text style={styles.primaryTitle}>
                      {busy === "shade" ? "PROCESSING..." : "Process"}
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
          ) : (
            (() => {
              /* Portrait: metrics + buttons share one fixed 4-column grid so
                 the footer stays two rows tall instead of stacking every
                 metric and every button on its own row. */
              const gridMetrics = [
                {
                  key: "types",
                  label: "Plant types",
                  value: formatNumber(totals.rows),
                },
                {
                  key: "qty",
                  label: "Quantity",
                  value: formatNumber(totals.quantity),
                  unit: "plants",
                },
                {
                  key: "packing",
                  label: "Packing",
                  value: formatAmount(totals.packing),
                  tone: "warm",
                },
                ...(totals.special > 0
                  ? [
                      {
                        key: "special",
                        label: "Special",
                        value: formatAmount(totals.special),
                        tone: "warm",
                      },
                    ]
                  : []),
                ...(totals.transport > 0
                  ? [
                      {
                        key: "transport",
                        label: "Transport",
                        value: formatAmount(totals.transport),
                        tone: "warm",
                      },
                    ]
                  : []),
                ...(totals.discount > 0
                  ? [
                      {
                        key: "discount",
                        label: "Discount",
                        value: `−${formatAmount(totals.discount)}`,
                        tone: "discount",
                      },
                    ]
                  : []),
                ...(totals.advance > 0
                  ? [
                      {
                        key: "advance",
                        label: "Advance",
                        value: formatAmount(totals.advance),
                        unit: "received",
                        tone: "discount",
                      },
                    ]
                  : []),
                {
                  key: "grand",
                  label: "Grand total",
                  value: formatAmount(totals.grand),
                  tone: "grand",
                },
                ...(totals.advance > 0
                  ? [
                      {
                        key: "remaining",
                        label: "Remaining",
                        value: formatAmount(totals.remaining),
                        tone: "remaining",
                      },
                    ]
                  : []),
              ];

              const gridButtons = [];
              if (canEditLines || canEditTotals || dirty) {
                gridButtons.push({
                  key: "save",
                  kind: "ghost",
                  disabled: !canSave,
                  loading: saving,
                  onPress: handleSave,
                  icon: "save-outline",
                  label: saving ? "SAVING…" : "SAVE",
                });
              }
              if (canEdit && isDraft) {
                gridButtons.push({
                  key: "move",
                  kind: "primary",
                  disabled: working || dirty,
                  loading: busy === "shade",
                  onPress: runMove,
                  icon: "arrow-forward",
                  label: busy === "shade" ? "PROCESSING..." : "Process",
                });
              }
              if (showChecks) {
                gridButtons.push({
                  key: "invoice",
                  kind: "invoice",
                  disabled: !allChecked || working || dirty,
                  loading: busy === "invoice",
                  onPress: runInvoice,
                  icon: "receipt-outline",
                  label: busy === "invoice" ? "GENERATING…" : "INVOICE",
                });
              }

              const gridCells = [
                ...(summaryOpen
                  ? gridMetrics.map((m) => ({ type: "metric", ...m }))
                  : []),
                ...gridButtons.map((b) => ({ type: "button", ...b })),
              ];

              /* Explicit rows of at most 4 cells, each cell sharing its row's
                 width equally (flex: 1). A short trailing row (e.g. just the
                 two buttons) fills the row instead of leaving dead cells, and
                 every cell's height is capped by metricGridCell's minHeight —
                 nothing here can stretch to fill the screen. */
              const gridRows = [];
              for (let i = 0; i < gridCells.length; i += 4) {
                gridRows.push(gridCells.slice(i, i + 4));
              }

              return (
                <View style={styles.metricGridBox}>
                  {gridRows.map((row, ri) => (
                    <View
                      key={ri}
                      style={[
                        styles.metricGridRow,
                        ri > 0 && styles.metricGridRowDivider,
                      ]}
                    >
                      {row.map((cell, ci) => (
                        <View
                          key={cell.key}
                          style={[
                            styles.metricGridCell,
                            ci < row.length - 1 && styles.metricGridCellDivider,
                            cell.type === "button" && { padding: 0 },
                          ]}
                        >
                          {cell.type === "metric" ? (
                            <>
                              <Text
                                style={styles.metricGridLabel}
                                numberOfLines={1}
                              >
                                {cell.label}
                              </Text>
                              <Text
                                style={[
                                  styles.metricGridValue,
                                  cell.tone === "warm" && styles.metricWarm,
                                  cell.tone === "discount" &&
                                    styles.metricDiscount,
                                  cell.tone === "grand" &&
                                    styles.metricGridValueGrand,
                                  cell.tone === "remaining" &&
                                    styles.metricGridValueRemaining,
                                ]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                              >
                                {cell.value}
                              </Text>
                              {cell.unit ? (
                                <Text style={styles.metricGridUnit}>
                                  {cell.unit}
                                </Text>
                              ) : null}
                            </>
                          ) : (
                            <Pressable
                              style={({ hovered, pressed }) => [
                                styles.metricGridBtn,
                                cell.kind === "ghost" &&
                                  styles.metricGridBtnGhost,
                                cell.kind === "primary" &&
                                  styles.metricGridBtnPrimary,
                                cell.kind === "invoice" &&
                                  styles.metricGridBtnInvoice,
                                cell.disabled && styles.metricGridBtnDisabled,
                              ]}
                              onPress={cell.onPress}
                              disabled={cell.disabled}
                            >
                              {cell.loading ? (
                                <ActivityIndicator
                                  color={
                                    cell.kind === "ghost" ? C.NAVY : "#FFFFFF"
                                  }
                                  size="small"
                                />
                              ) : (
                                <Ionicons
                                  name={cell.icon}
                                  size={15}
                                  color={
                                    cell.disabled
                                      ? "#9CA9B8"
                                      : cell.kind === "ghost"
                                        ? C.NAVY
                                        : "#FFFFFF"
                                  }
                                />
                              )}
                              <Text
                                style={[
                                  styles.metricGridBtnLabel,
                                  {
                                    color: cell.disabled
                                      ? "#9CA9B8"
                                      : cell.kind === "ghost"
                                        ? C.NAVY
                                        : "#FFFFFF",
                                  },
                                ]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                              >
                                {cell.label}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })()
          )}

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

      {advanceOpen && canEditAdvance ? (
        <AdvanceModal
          styles={styles}
          grand={totals.grand}
          otherTotal={otherAdvanceTotal}
          entries={advanceBreakdown}
          initialAdvance={advance}
          initialMode={advanceMode}
          collectorName={userName || userId}
          onApply={applyAdvance}
          onClose={() => setAdvanceOpen(false)}
        />
      ) : null}

      {/* Per-field reason: opens on blur of a changed field past Draft. */}
      {fieldReasonRequest ? (
        <FieldReasonModal
          styles={styles}
          request={fieldReasonRequest}
          onSubmit={acceptFieldReason}
          onCancel={cancelFieldReason}
        />
      ) : null}

      {/* Delete reason: gates a removal past Draft. */}
      {pendingDelete ? (
        <DeleteReasonModal
          styles={styles}
          request={pendingDelete.request}
          busy={saving}
          error={error}
          onSubmit={submitDelete}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}

      {/* Back / close with unsaved changes: save or discard, explicitly. */}
      {confirmClose ? (
        <CloseConfirmModal
          styles={styles}
          busy={saving}
          error={error}
          onSave={saveAndClose}
          onDiscard={discardAndClose}
          onCancel={() => setConfirmClose(false)}
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

/**
 * Public wrapper around EditInner.
 *
 * The server stamps `fetchDate` when it hands a quotation over. If that stamp
 * isn't today, the copy we were given may be stale (stock, prices and
 * reservations move daily), so before showing the editor we silently refetch a
 * fresh copy from /find and hand THAT to EditInner. A `key` keyed on the data
 * we render guarantees EditInner fully re-seeds from the fresh quotation
 * instead of holding on to stale initial state.
 *
 * If the quotation is already current, EditInner renders immediately with no
 * network round-trip. A failed refetch falls back to the copy we already have,
 * so the operator is never blocked — worst case they edit the copy they came
 * in with.
 */
export default function Edit({ quotation, onClose, onSaved }) {
  const isStale = quotation?.fetchDate != null && !isToday(quotation.fetchDate);

  /* `data` is the quotation EditInner actually renders. It starts as the prop,
     and is replaced by the fresh copy once a stale refetch resolves. */
  const [data, setData] = useState(quotation);
  const [refreshing, setRefreshing] = useState(isStale);

  useEffect(() => {
    let alive = true;

    /* Not stale — render straight away with what we were given. */
    if (!isStale) {
      setData(quotation);
      setRefreshing(false);
      return;
    }

    const id = quotation?.quotationId;
    if (id == null) {
      setData(quotation);
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    (async () => {
      const response = await getQuotation(id);
      if (!alive) return;
      /* Use the fresh copy on success; fall back to the original otherwise so
         the editor is never blocked by a failed refresh. */
      setData(
        response?.status === "SUCCESS" && response.payload
          ? response.payload
          : quotation,
      );
      setRefreshing(false);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation?.quotationId]);

  if (refreshing || !data) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F1F5F9",
        }}
      >
        <ActivityIndicator size="large" color="#0F4776" />
        <Text style={{ marginTop: 12, color: "#64748B", fontSize: 14 }}>
          Refreshing quotation…
        </Text>
      </View>
    );
  }

  /* Re-seed EditInner whenever the identity or freshness of the data changes. */
  return (
    <EditInner
      key={`${data.quotationId}:${data.fetchDate ?? ""}`}
      quotation={data}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
