import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fetchQuotationChanges } from "../../api/fetchQuotation";
import {
  formatDate,
  isSameDay,
  parseDate,
  startOfDay,
  toApiDate,
} from "../../utility/dates";
import DatePickerSheet from "../common/DatePickerSheet";

/* ── palette (matches QuotationViewList.styles.js) ─────────────────── */
const NAVY = "#0F4776";
const NAVY_TINT = "#EAF1F8";
const RED = "#DC2626";
const RED_TINT = "#FEF2F2";
const AMBER = "#B45309";
const AMBER_TINT = "#FFF7ED";
const SURFACE = "#FFFFFF";
const INPUT_FILL = "#F6F8FB";
const HEAD_FILL = "#F8FAFC";
const BORDER = "#E3E9F1";
const GRID = "#EFF3F8";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const PLACEHOLDER = "#94A3B8";

/* Below this width the plant table becomes stacked rows. */
const BP_TABLE = 700;

const LEVEL_META = {
  DRAFT: { label: "Draft", tint: "#E8622C" },
  DELIVERY_SHADE: { label: "Loading shade", tint: "#0F4776" },
  INVOICE_GENERATED: { label: "Bill Done", tint: "#5B8E2E" },
};

const PRESETS = [
  { key: "today", label: "Today", days: 1 },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
];

const daysAgo = (n) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
};

const formatAmount = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return "—";
  const time = date
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
  return `${formatDate(date)} · ${time}`;
};

const isRemoval = (row) => row?.changeType === "PLANT_REMOVED";

/**
 * The "Cancelled" tab: plant quantity updates and plant deletions on
 * quotations, inside a date range (default: the last seven days, today
 * included). Unchanged plants are never listed — only the updated and
 * deleted ones, each with its reason.
 *
 * Props
 *  - unitId / userId  scope, as in QuotationViewList's `mode`
 *  - search           the list's search box; matches customer, QTN, mobile,
 *                     plant and reason
 *  - onCount(n)       how many quotations are on screen, for the header count
 */
export default function CancelledChanges({ unitId, userId, search, onCount }) {
  const [width, setWidth] = useState(0);
  const tableMode = width >= BP_TABLE;

  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(() => startOfDay(new Date()));
  const [picker, setPicker] = useState(null); // "from" | "to" | null

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const ready = unitId != null || !!userId;

  const load = useCallback(async () => {
    if (!ready) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    const response = await fetchQuotationChanges({
      unitId,
      userId,
      fromDate: toApiDate(from),
      toDate: toApiDate(to),
    });

    if (response?.status === "SUCCESS") {
      setGroups(Array.isArray(response.payload) ? response.payload : []);
    } else {
      setGroups([]);
      setError(response?.message || "Could not load changes.");
    }
    setLoading(false);
    setRefreshing(false);
  }, [ready, unitId, userId, from, to]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = String(search || "")
      .trim()
      .toLowerCase();
    if (!term) return groups;

    return groups
      .map((group) => {
        const headerHit =
          String(group.quotationId).includes(term) ||
          String(group.mobileNo || "").includes(term) ||
          (group.customerName || "").toLowerCase().includes(term);
        if (headerHit) return group;

        const changes = (group.changes || []).filter(
          (row) =>
            (row.plantName || "").toLowerCase().includes(term) ||
            (row.reason || "").toLowerCase().includes(term),
        );
        return changes.length ? { ...group, changes } : null;
      })
      .filter(Boolean);
  }, [groups, search]);

  useEffect(() => {
    onCount?.(visible.length);
  }, [visible.length, onCount]);

  const activePreset = PRESETS.find(
    (p) => isSameDay(to, new Date()) && isSameDay(from, daysAgo(p.days - 1)),
  )?.key;

  const applyPreset = (days) => {
    setFrom(daysAgo(days - 1));
    setTo(startOfDay(new Date()));
  };

  const pickDate = (date) => {
    const day = startOfDay(date);
    if (picker === "from") {
      setFrom(day);
      if (day > to) setTo(day);
    } else {
      setTo(day);
      if (day < from) setFrom(day);
    }
    setPicker(null);
  };

  /* ── pieces ─────────────────────────────────────────────────────────── */

  const levelPill = (level) => {
    const meta = LEVEL_META[level] || { label: level || "—", tint: PLACEHOLDER };
    return (
      <View
        style={[
          s.levelPill,
          { backgroundColor: `${meta.tint}14`, borderColor: `${meta.tint}33` },
        ]}
      >
        <View style={[s.levelDot, { backgroundColor: meta.tint }]} />
        <Text numberOfLines={1} style={[s.levelPillText, { color: meta.tint }]}>
          {String(meta.label).toUpperCase()}
        </Text>
      </View>
    );
  };

  const updatedValue = (row) =>
    isRemoval(row) ? (
      <View style={[s.badge, s.badgeRemoved]}>
        <Ionicons name="trash-outline" size={11} color={RED} />
        <Text style={[s.badgeText, { color: RED }]}>DELETED</Text>
      </View>
    ) : (
      <Text style={s.updatedQty}>{row.updatedQuantity ?? "—"}</Text>
    );

  const reasonText = (row) =>
    row.reason ? (
      <Text style={s.reason}>{row.reason}</Text>
    ) : (
      <Text style={s.reasonEmpty}>No reason recorded</Text>
    );

  const plantCell = (row) => (
    <View style={s.stack}>
      <Text style={s.plantName}>{row.plantName || "—"}</Text>
      <Text style={s.meta}>
        {formatDateTime(row.date)}
        {row.updatedBy ? ` · ${row.updatedBy}` : ""}
      </Text>
    </View>
  );

  const tableHead = (
    <View style={s.tHead}>
      <Text style={[s.th, s.cPlant]}>Plant</Text>
      <Text style={[s.th, s.cPrice, s.right]}>Price</Text>
      <Text style={[s.th, s.cPacking]}>Packing</Text>
      <Text style={[s.th, s.cQty, s.right]}>Previous qty</Text>
      <Text style={[s.th, s.cQty, s.right]}>Updated qty</Text>
      <Text style={[s.th, s.cReason]}>Reason</Text>
    </View>
  );

  const tableRow = (row, index, last) => (
    <View
      key={`${row.date}-${index}`}
      style={[s.tRow, isRemoval(row) && s.tRowRemoved, last && s.tRowLast]}
    >
      <View style={s.cPlant}>{plantCell(row)}</View>
      <Text style={[s.td, s.cPrice, s.right, s.num]}>
        {formatAmount(row.price)}
      </Text>
      <Text style={[s.td, s.cPacking]}>{row.packingName || "—"}</Text>
      <Text style={[s.td, s.cQty, s.right, s.num, s.prevQty]}>
        {row.previousQuantity ?? "—"}
      </Text>
      <View style={[s.cQty, s.alignEnd]}>{updatedValue(row)}</View>
      <View style={s.cReason}>{reasonText(row)}</View>
    </View>
  );

  const stackedRow = (row, index, last) => (
    <View
      key={`${row.date}-${index}`}
      style={[s.sRow, isRemoval(row) && s.tRowRemoved, last && s.tRowLast]}
    >
      <View style={s.sTop}>
        <View style={{ flex: 1 }}>{plantCell(row)}</View>
        {isRemoval(row) ? updatedValue(row) : null}
      </View>

      <View style={s.sGrid}>
        <View style={s.sCell}>
          <Text style={s.label}>Price</Text>
          <Text style={[s.td, s.num]}>{formatAmount(row.price)}</Text>
        </View>
        <View style={s.sCell}>
          <Text style={s.label}>Packing</Text>
          <Text style={s.td}>{row.packingName || "—"}</Text>
        </View>
        <View style={s.sCell}>
          <Text style={s.label}>Previous qty</Text>
          <Text style={[s.td, s.num, s.prevQty]}>
            {row.previousQuantity ?? "—"}
          </Text>
        </View>
        <View style={s.sCell}>
          <Text style={s.label}>Updated qty</Text>
          {isRemoval(row) ? (
            <Text style={[s.td, { color: RED, fontWeight: "800" }]}>
              Deleted
            </Text>
          ) : (
            updatedValue(row)
          )}
        </View>
      </View>

      <View style={s.sReason}>
        <Text style={s.label}>Reason</Text>
        {reasonText(row)}
      </View>
    </View>
  );

  const renderGroup = ({ item }) => {
    const rows = item.changes || [];
    const updated = rows.filter((r) => !isRemoval(r)).length;
    const removed = rows.length - updated;

    return (
      <View style={s.group}>
        <View style={s.groupHead}>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text numberOfLines={1} style={s.customer}>
              {item.customerName || "Unnamed customer"}
            </Text>
            <Text numberOfLines={1} style={s.meta}>
              QTN-{item.quotationId}
              {item.mobileNo ? ` · ${item.mobileNo}` : ""}
              {item.assignedUserName ? ` · ${item.assignedUserName}` : ""}
            </Text>
          </View>
          {levelPill(item.level)}
        </View>

        <View style={s.countRow}>
          {updated > 0 ? (
            <View style={[s.badge, s.badgeUpdated]}>
              <Ionicons name="swap-vertical" size={11} color={AMBER} />
              <Text style={[s.badgeText, { color: AMBER }]}>
                {updated} QTY UPDATED
              </Text>
            </View>
          ) : null}
          {removed > 0 ? (
            <View style={[s.badge, s.badgeRemoved]}>
              <Ionicons name="trash-outline" size={11} color={RED} />
              <Text style={[s.badgeText, { color: RED }]}>
                {removed} DELETED
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.table}>
          {tableMode ? tableHead : null}
          {rows.map((row, i) =>
            tableMode
              ? tableRow(row, i, i === rows.length - 1)
              : stackedRow(row, i, i === rows.length - 1),
          )}
        </View>
      </View>
    );
  };

  const empty = () => {
    if (loading) return null;
    return (
      <View style={s.emptyWrap}>
        <View style={s.emptyIcon}>
          <Ionicons
            name={error ? "cloud-offline-outline" : "checkmark-done-outline"}
            size={28}
            color={PLACEHOLDER}
          />
        </View>
        <Text style={s.emptyTitle}>
          {error ? "Changes didn't load" : "No updates or deletions"}
        </Text>
        <Text style={s.emptyText}>
          {error ||
            `No plant quantity was updated and no plant was deleted between ${formatDate(
              from,
            )} and ${formatDate(to)}.`}
        </Text>
        {error ? (
          <Pressable style={s.emptyAction} onPress={load}>
            <Text style={s.emptyActionText}>TRY AGAIN</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View
      style={s.root}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        setWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
      }}
    >
      {/* date filter */}
      <View style={s.filterBar}>
        <View style={s.presetRow}>
          {PRESETS.map((p) => {
            const active = p.key === activePreset;
            return (
              <Pressable
                key={p.key}
                onPress={() => applyPreset(p.days)}
                style={[s.preset, active && s.presetActive]}
              >
                <Text style={[s.presetText, active && s.presetTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.rangeRow}>
          <Pressable style={s.dateBtn} onPress={() => setPicker("from")}>
            <Ionicons name="calendar-outline" size={15} color={NAVY} />
            <View>
              <Text style={s.label}>From</Text>
              <Text style={s.dateText}>{formatDate(from)}</Text>
            </View>
          </Pressable>
          <Ionicons name="arrow-forward" size={14} color={PLACEHOLDER} />
          <Pressable style={s.dateBtn} onPress={() => setPicker("to")}>
            <Ionicons name="calendar-outline" size={15} color={NAVY} />
            <View>
              <Text style={s.label}>To</Text>
              <Text style={s.dateText}>{formatDate(to)}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={s.loadingText}>Loading changes…</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.quotationId)}
          renderItem={renderGroup}
          extraData={tableMode}
          ListEmptyComponent={empty}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={NAVY}
              colors={[NAVY]}
            />
          }
        />
      )}

      {picker ? (
        <DatePickerSheet
          value={picker === "from" ? from : to}
          title={picker === "from" ? "Changes from" : "Changes up to"}
          subtitle="Plant quantity updates and deletions in this range"
          onSelect={pickDate}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </View>
  );
}

const cardShadow = Platform.select({
  web: { boxShadow: "0 1px 2px rgba(15,23,42,0.05)" },
  default: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});

const s = StyleSheet.create({
  root: { flex: 1, width: "100%" },

  /* filter */
  filterBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: HEAD_FILL,
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  presetActive: { backgroundColor: NAVY_TINT, borderColor: NAVY },
  presetText: { fontSize: 12, fontWeight: "700", color: MUTED },
  presetTextActive: { color: NAVY },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  dateText: { fontSize: 13, fontWeight: "700", color: TEXT },

  list: { padding: 12, gap: 12, flexGrow: 1 },

  /* group */
  group: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    overflow: "hidden",
    ...cardShadow,
  },
  groupHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  customer: { fontSize: 15, fontWeight: "800", color: TEXT },
  countRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  levelDot: { height: 6, width: 6, borderRadius: 3 },
  levelPillText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.4 },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeRemoved: { backgroundColor: RED_TINT },
  badgeUpdated: { backgroundColor: AMBER_TINT },
  badgeText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.4 },

  /* table */
  table: { borderTopWidth: 1, borderTopColor: BORDER },
  tHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: HEAD_FILL,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  th: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: "#526278",
    textTransform: "uppercase",
  },
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: GRID,
  },
  tRowRemoved: { backgroundColor: "#FFFBFB" },
  tRowLast: { borderBottomWidth: 0 },
  td: { fontSize: 13, color: "#334155" },
  num: { fontVariant: ["tabular-nums"] },
  right: { textAlign: "right" },
  alignEnd: { alignItems: "flex-end" },

  cPlant: { flex: 2.4, minWidth: 0 },
  cPrice: { flex: 1 },
  cPacking: { flex: 1.3 },
  cQty: { flex: 1 },
  cReason: { flex: 2.2, minWidth: 0 },

  stack: { gap: 2 },
  plantName: { fontSize: 13.5, fontWeight: "700", color: TEXT },
  meta: { fontSize: 11, fontWeight: "600", color: PLACEHOLDER },
  prevQty: { color: MUTED },
  updatedQty: {
    fontSize: 13.5,
    fontWeight: "800",
    color: NAVY,
    fontVariant: ["tabular-nums"],
  },
  reason: { fontSize: 12.5, lineHeight: 17, color: "#475569" },
  reasonEmpty: {
    fontSize: 12.5,
    color: PLACEHOLDER,
    fontStyle: "italic",
  },

  /* stacked (phones) */
  sRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: GRID,
  },
  sTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  sGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 8, columnGap: 16 },
  sCell: { gap: 2, minWidth: 92 },
  sReason: { gap: 2 },
  label: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#7C8CA1",
    textTransform: "uppercase",
  },

  /* states */
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: { fontSize: 14, color: PLACEHOLDER },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    height: 64,
    width: 64,
    borderRadius: 20,
    backgroundColor: INPUT_FILL,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: TEXT },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    maxWidth: 340,
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 14,
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#FFFFFF",
  },
});
