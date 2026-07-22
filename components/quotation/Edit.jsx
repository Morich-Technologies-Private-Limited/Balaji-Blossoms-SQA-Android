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

import { fetchPackingList } from "../../api/fetchPacking";
import { searchPlants } from "../../api/plantApi";
import { updateQuotationPlants } from "../../api/updateQuotation";

import { getCurrentUser } from "../../utility/secureStorage";
import makeStyles from "./Edit.styles";

const LEVEL_META = {
  DRAFT: { label: "Draft", tint: "#E8622C" },
  DELIVERY_SHADE: { label: "Delivery shade", tint: "#0F4776" },
  INVOICE_GENERATED: { label: "Invoiced", tint: "#16A34A" },
};

const SEARCH_DEBOUNCE = 350;
const NO_PACKING = { packingId: null, packingName: "No packing", price: 0 };

/* Breakpoints measured on the table container.
   Columns are dropped in reverse order of importance as space runs out, and
   their values move into the plant cell or the quantity hint. */
const BP_CALC = 1120; // dedicated seedling maths column
const BP_PRICE = 900; // unit price column
const BP_SNO = 820; // serial number column
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

let lineSeq = 0;
const nextKey = () => `line-${(lineSeq += 1)}`;

const packingForSize = (size, packings) =>
  packings.find((packing) => norm(packing.size) === norm(size)) || null;

const packingLabel = (packing) =>
  packing?.packingName || packing?.size || NO_PACKING.packingName;

const priceOf = (source) =>
  toMoney(source?.price ?? source?.plantPrice ?? source?.unitPrice ?? 0);

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

const lineFromReservation = (reservation, isDraft) => {
  const seedling = isSeedling(reservation.plantType);

  const quantity = isDraft
    ? seedling
      ? reservation.trayReserved
      : reservation.quantityReserved
    : seedling
      ? reservation.trayDelivered
      : reservation.quantityDelivered;

  return {
    key: nextKey(),
    plantId: reservation.plantId,
    plantName: reservation.plantName,
    plantSubtitle: subtitleOf(reservation, seedling),
    size: reservation.size,
    plantType: reservation.plantType,
    seedling,
    price: priceOf(reservation),
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
    packingName: reservation.packingName || NO_PACKING.packingName,
    packingCharge: String(reservation.packingCharge ?? 0),
    packingManual: false,
    selectedByCustomer: reservation.selectedByCustomer ?? true,
    isNew: false,
  };
};

/* ── row ───────────────────────────────────────────────────────────── */

const TableRow = memo(function TableRow({ item, index, columns, styles }) {
  return (
    <View style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
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
  );
});

/**
 * Edit the plants on a quotation.
 *
 * Layout contract: the grid never scrolls sideways. Column widths come from the
 * measured container and the plant column absorbs the remainder, so Amount and
 * Delete are always reachable. Packing type and packing charge share one column
 * because they are one decision; the seedling maths collapses into a hint under
 * the quantity box when there is no room for its own column. Under 760px each
 * row becomes an editable card.
 *
 * The screen holds the complete final state of the quotation and sends it in one
 * call: rows removed here are removed on the server. The request shape is
 * unchanged - for seedlings the tray count is still what goes over the wire, and
 * the derived plant count stays on the client for display and totals only.
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

  const isDraft = quotation?.level === "DRAFT";
  const levelMeta = LEVEL_META[quotation?.level] || {
    label: quotation?.level || "—",
    tint: "#94A3B8",
  };

  const [lines, setLines] = useState(() =>
    (quotation?.plantList || []).map((row) =>
      lineFromReservation(row, isDraft),
    ),
  );
  const [packings, setPackings] = useState([]);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picker, setPicker] = useState(null);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

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

  const updateLine = useCallback((key, patch) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }, []);

  const removeLine = useCallback((key) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
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
            traySize: preferred?.traySize ?? null,
            unitId: preferred?.unitId ?? null,
            unitName: preferred?.unitName ?? null,
            available: preferred?.quantity ?? null,
            inventoryList: inventory,
            quantity: "1",
            reserved: null,
            packingId: packing?.packingId ?? null,
            packingName: packingLabel(packing),
            packingCharge: String(packing?.price ?? 0),
            packingManual: false,
            selectedByCustomer: true,
            isNew: true,
          },
        ];
      });

      setTerm("");
      setResults([]);
    },
    [packings, quotation?.unitId],
  );

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

    return {
      rows: lines.length,
      quantity,
      plantAmount,
      packing,
      grand: plantAmount + packing,
    };
  }, [lines]);

  /* ── save ────────────────────────────────────────────────────────── */
  const reasonMissing = !isDraft && !reason.trim();
  const incomplete = lines.some(
    (line) => !line.unitId || toCount(line.quantity) <= 0,
  );
  const canSave = !saving && !!userId && !reasonMissing && !incomplete;

  const saveHint = incomplete
    ? "Every row needs a unit and a quantity above zero"
    : reasonMissing
      ? "Add a reason for this change"
      : null;

  const handleSave = useCallback(async () => {
    setReasonTouched(true);
    if (!canSave) {
      setError(
        incomplete
          ? "Every row needs a unit and a quantity above zero."
          : reasonMissing
            ? "Add a reason for this change."
            : "Signed-in user not found. Sign in again to save.",
      );
      return;
    }

    setError(null);
    setSaving(true);

    const body = {
      plantList: lines.map((line) => ({
        plantId: line.plantId,
        // Unchanged contract: seedlings still send the tray count, never the
        // client-side plant count.
        quantityReserved: toCount(line.quantity),
        unitId: line.unitId,
        unitName: line.unitName,
        packingName: line.packingName,
        packingCharge: toMoney(line.packingCharge),
        selectedByCustomer: line.selectedByCustomer,
        reason: reason.trim() || null,
      })),
      specialPlantList: (quotation?.specialPlantList || []).map((special) => ({
        barcodeId: special.barcodeId,
      })),
    };

    const response = await updateQuotationPlants(
      quotation.quotationId,
      userId,
      body,
    );

    setSaving(false);

    if (response?.status === "SUCCESS") {
      onSaved?.(response.payload);
      return;
    }

    setError(response?.message || "Could not save the quotation.");
  }, [
    canSave,
    incomplete,
    reasonMissing,
    lines,
    reason,
    quotation,
    userId,
    onSaved,
  ]);

  /* ── shared field renderers ──────────────────────────────────────── */

  const unitSelect = useCallback(
    (line) => (
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
    ),
    [styles, C, openUnitPicker],
  );

  const qtyField = useCallback(
    (line, { showDerived }) => {
      const entered = toCount(line.quantity);
      const traySize = toCount(line.traySize);
      const over =
        line.available != null && !line.seedling && entered > line.available;

      return (
        <View style={styles.cellFill}>
          <View style={[styles.qtyBox, over && styles.qtyBoxWarn]}>
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

          {showDerived && line.seedling && traySize > 0 ? (
            <Text style={styles.derivedHint} numberOfLines={1}>
              = {formatNumber(derivedQuantity(line))} plants ({traySize}/tray)
            </Text>
          ) : null}

          {over ? (
            <Text style={styles.qtyHintWarn} numberOfLines={1}>
              Only {formatNumber(line.available)} in stock
            </Text>
          ) : !isDraft && line.reserved != null ? (
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
    [styles, C, isDraft, updateLine],
  );

  /* Packing type and its charge are one decision, so they share one cell. */
  const packingField = useCallback(
    (line) => (
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
    ),
    [styles, C, openPackingPicker, updateLine],
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
        onPress={() => removeLine(line.key)}
      >
        <Ionicons name="trash-outline" size={16} color={C.RED} />
      </Pressable>
    ),
    [styles, C, removeLine],
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
      amount: dense ? 104 : 118,
      action: 52,
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
                    {formatAmount(line.price)} / plant
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
        render: (line) => (
          <Text style={styles.priceText}>{formatAmount(line.price)}</Text>
        ),
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
        label: "",
        size: w.action,
        align: "center",
        render: deleteButton,
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
    isDraft,
    unitSelect,
    qtyField,
    packingField,
    deleteButton,
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
      <View style={styles.lineCard}>
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
                  {formatAmount(item.price)} / plant
                </Text>
              </View>
            </View>
          </View>

          {deleteButton(item)}
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
        </View>

        <View style={styles.lineFooter}>
          <Text style={styles.lineTotalLabel}>Line amount</Text>
          <Text style={styles.lineTotal}>{formatAmount(lineAmount(item))}</Text>
        </View>
      </View>
    ),
    [styles, isDraft, unitSelect, qtyField, packingField, deleteButton],
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
    const options = unitMode
      ? activeLine.inventoryList || []
      : [NO_PACKING, ...packings];

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
              <Text style={styles.sheetTitle}>
                {unitMode ? "Select unit" : "Select packing"}
              </Text>
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
                    : packingLabel(option) === activeLine.packingName;

                  return (
                    <Pressable
                      key={
                        unitMode
                          ? `unit-${option.unitId}`
                          : `packing-${option.packingId ?? "none"}`
                      }
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

                      {!unitMode ? (
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

  /* ── render ──────────────────────────────────────────────────────── */
  const showResults = term.trim().length >= 2;
  const quotationDate = formatDate(
    quotation?.quotationDate ||
      quotation?.deliveryDate ||
      quotation?.createdDate,
  );

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
          <Text style={styles.headCell} numberOfLines={1}>
            {col.label}
          </Text>
          {col.sublabel ? (
            <Text style={styles.headCellSub} numberOfLines={1}>
              {col.sublabel}
            </Text>
          ) : null}
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
              Edit quotation
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              QTN-{quotation?.quotationId} ·{" "}
              {quotation?.customerName || "Unnamed customer"}
            </Text>
          </View>

          <View style={styles.headerMeta}>
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
                          <Text style={styles.resultPriceLabel}>per plant</Text>
                        </View>

                        <Ionicons name="add-circle" size={22} color={C.GREEN} />
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
                    Search above to add the first one.
                  </Text>
                </View>
              }
            />
          </View>
        </View>

        {/* ── reason ── */}
        {!isDraft ? (
          <View style={styles.reasonWrap}>
            <Text style={styles.sectionLabel}>Reason for change</Text>
            <TextInput
              style={[
                styles.reasonInput,
                reasonTouched && reasonMissing && styles.reasonInputError,
              ]}
              value={reason}
              onChangeText={setReason}
              onBlur={() => setReasonTouched(true)}
              placeholder="Customer increased order"
              placeholderTextColor={C.FAINT}
              multiline
            />
          </View>
        ) : null}

        {error ? (
          <View style={styles.banner}>
            <Ionicons name="alert-circle-outline" size={17} color={C.ALERT} />
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}

        {/* ── totals + save ── */}
        <View style={styles.footerDock}>
          <View style={styles.footerRow}>
            <View style={styles.metricStrip}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Plant types</Text>
                <Text style={styles.metricValue}>
                  {formatNumber(totals.rows)}
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Quantity</Text>
                <Text style={styles.metricValue}>
                  {formatNumber(totals.quantity)}
                </Text>
                <Text style={styles.metricUnit}>plants</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Packing</Text>
                <Text style={[styles.metricValue, styles.metricWarm]}>
                  {formatAmount(totals.packing)}
                </Text>
              </View>

              <View style={[styles.metric, styles.metricGrand]}>
                <Text style={styles.metricLabel}>Grand total</Text>
                <Text style={styles.metricGrandValue}>
                  {formatAmount(totals.grand)}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.saveButton,
                hovered && canSave && styles.saveButtonHover,
                pressed && canSave && styles.saveButtonPressed,
                !canSave && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="save-outline" size={19} color="#FFFFFF" />
              )}
              <Text style={styles.saveTitle}>
                {saving ? "SAVING…" : "SAVE CHANGES"}
              </Text>
            </Pressable>
          </View>

          {saveHint ? <Text style={styles.saveHint}>{saveHint}</Text> : null}
        </View>
      </View>

      {renderPicker()}
    </KeyboardAvoidingView>
  );
}
