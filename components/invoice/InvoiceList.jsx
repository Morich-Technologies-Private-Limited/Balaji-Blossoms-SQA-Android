import { Ionicons } from "@expo/vector-icons";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { downloadInvoicePdf } from "../../api/downloadPdfApis.js";
import { fetchInvoicesByUnit } from "../../api/fetchInvoice.js";
import PdfShareSheet from "../../utility/PdfShareSheet.js";
import { getCurrentUser } from "../../utility/secureStorage.js";
import makeStyles from "./InvoiceList.styles.js";
import InvoiceView from "./View.jsx";

/* Payment status drives the filter chips and the row pill. Keys match the
   PaymentStatus enum coming back from the server. */
const STATUSES = [
  { key: "ALL", label: "All" },
  { key: "DUE", label: "Due" },
  { key: "PARTIAL", label: "Partial" },
  { key: "FULL", label: "Paid" },
];

const STATUS_META = {
  DUE: { label: "Due", tint: "#E8622C" },
  PARTIAL: { label: "Partial", tint: "#0F4776" },
  FULL: { label: "Paid", tint: "#5B8E2E" },
};

/* Tally sync is a secondary badge shown in the expand panel / cards. */
const TALLY_META = {
  SYNC: { label: "Synced", tint: "#5B8E2E" },
  REQUEST_INITIATED: { label: "Sync requested", tint: "#E8622C" },
  NOT_SYNC: { label: "Not synced", tint: "#94A3B8" },
};

/* Breakpoints are measured on the table container, not the window, so the
   layout stays correct inside drawers, split panes and modals. */
const BP_WIDE = 940; // every column
const BP_MID = 780; // mobile no. moves into the panel
const BP_COMPACT = 620; // sno moves into the panel
// below BP_COMPACT the list renders as cards

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
};

const dateValue = (item) => {
  const raw = item?.createdAt;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const statusOf = (item) =>
  STATUS_META[item.paymentStatus] || {
    label: item.paymentStatus || "—",
    tint: "#94A3B8",
  };

const tallyOf = (item) =>
  TALLY_META[item.tallySync] || {
    label: item.tallySync || "—",
    tint: "#94A3B8",
  };

/**
 * Invoice list.
 *
 * Layout contract: the table never scrolls sideways. Column widths are derived
 * from the measured container width and always add up to it, so the Action
 * column can never be pushed out of frame. As the container narrows, columns
 * are removed in order of importance and their values move into the expand
 * panel; under 620px the rows become cards.
 *
 * Data: every row returned by GET /findByUnitId is rendered as-is. Scoping to
 * the signed-in user is the server's job — it reads the caller from the bearer
 * token and returns only what that user is allowed to see. There is
 * deliberately no client-side ownership filter here: duplicating that rule on
 * the client only creates a second place for it to go wrong, and a mismatched
 * display name would silently hide rows the server intended to send.
 *
 * The only client-side narrowing is the search box and the status chips, both
 * of which are presentation concerns the operator controls directly.
 *
 * View opens the read-only invoice viewer over the list. Its actions (Add
 * payment, Send to Tally) refetch the invoice and echo the fresh InvoiceDto
 * back through onSaved, so the row is refreshed in place; a bare `true` echo
 * (failed refetch) triggers a full reload instead.
 *
 * Send downloads the invoice PDF and hands it to the shared PdfShareSheet.
 * If a parent passes `onSend`, that takes over instead.
 */
export default function InvoiceList({
  title,
  subtitle,
  onSelect,
  onUpdate,
  onSend,
}) {
  const { width } = useWindowDimensions();
  const [avail, setAvail] = useState(0);

  const space = avail || width;
  const isCardMode = space < BP_COMPACT;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;

  const styles = useMemo(
    () => makeStyles({ width, isTablet, isDesktop, isCardMode }),
    [width, isTablet, isDesktop, isCardMode],
  );
  const C = styles.colors;

  const [currentUser, setCurrentUser] = useState(null);
  const [userReady, setUserReady] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [viewing, setViewing] = useState(null);
  const [expanded, setExpanded] = useState({});

  /* Share flow: the row whose Send was tapped, whether a download is in
     flight, and the downloaded PDF once it is ready for the share sheet. */
  const [shareBusyId, setShareBusyId] = useState(null);
  const [pdf, setPdf] = useState(null);

  const resolvedUnitId = currentUser?.unitId;

  const toggleRow = useCallback((id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!alive) return;
        setCurrentUser(user);
      } finally {
        if (alive) setUserReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!userReady) return;

    /* The unit id scopes the request; the server handles everything else. */
    if (!resolvedUnitId) {
      setError("No unit assigned to this user.");
      setInvoices([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);

    const response = await fetchInvoicesByUnit(resolvedUnitId);

    if (response?.status === "SUCCESS") {
      /* Render exactly what the server sent — no ownership filter here. */
      setInvoices(response.payload || []);
    } else if (response?.status === "NOT_FOUND") {
      setInvoices([]);
    } else {
      setInvoices([]);
      setError(response?.message || "Could not load invoices.");
    }

    setLoading(false);
    setRefreshing(false);
  }, [userReady, resolvedUnitId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const numbered = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => dateValue(a) - dateValue(b))
        .map((inv, index) => ({ ...inv, sno: index + 1 })),
    [invoices],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return numbered
      .filter((inv) => (status === "ALL" ? true : inv.paymentStatus === status))
      .filter((inv) => {
        if (!term) return true;
        return (
          String(inv.displayInvoiceId ?? "").includes(term) ||
          String(inv.customerNumber || "").includes(term) ||
          (inv.customerName || "").toLowerCase().includes(term) ||
          (inv.unitName || "").toLowerCase().includes(term) ||
          (inv.assignedUserName || "").toLowerCase().includes(term)
        );
      });
  }, [numbered, search, status]);

  /* View's onSaved fires after a payment (or Tally sync) is recorded. It sends
     the refreshed InvoiceDto on success, or the bare flag `true` if the
     refetch failed — in which case we reload the whole list so it isn't left
     showing stale figures. The viewer stays open either way; View manages its
     own dismissal through onClose. */
  const handleSaved = useCallback(
    (saved) => {
      if (!saved || saved === true) {
        load();
        return;
      }

      setInvoices((prev) =>
        prev.map((inv) => (inv.invoiceId === saved.invoiceId ? saved : inv)),
      );

      onUpdate?.(saved);
    },
    [load, onUpdate],
  );

  /* ── share ────────────────────────────────────────────────────────────
     Tapping Send downloads the invoice PDF and, on success, hands it to
     PdfShareSheet. A failed download surfaces an inline error. A parent-
     supplied `onSend` takes over entirely if present. */
  const openShare = useCallback(
    async (item) => {
      if (onSend) {
        onSend(item);
        return;
      }
      if (shareBusyId) return;

      setError(null);
      setShareBusyId(item.invoiceId);

      const id = item.invoiceId;
      const response = await downloadInvoicePdf(id);

      setShareBusyId(null);

      if (response?.status !== "SUCCESS" || !response.payload) {
        setError(
          response?.message || "The invoice PDF could not be downloaded.",
        );
        return;
      }

      const invoiceLine = `INV-${item.displayInvoiceId ?? id}${
        item.customerName ? ` · ${item.customerName}` : ""
      }`;

      setPdf({
        title: "Invoice",
        subtitle: invoiceLine,
        message: `Invoice for ${invoiceLine}`,
        file: response.payload,
      });
    },
    [onSend, shareBusyId],
  );

  /* ── shared bits ─────────────────────────────────────────────────────── */

  const statusPill = useCallback(
    (item) => {
      const meta = statusOf(item);
      return (
        <View
          style={[
            styles.levelPill,
            {
              backgroundColor: `${meta.tint}14`,
              borderColor: `${meta.tint}33`,
            },
          ]}
        >
          <View style={[styles.levelDot, { backgroundColor: meta.tint }]} />
          <Text
            numberOfLines={1}
            style={[styles.levelPillText, { color: meta.tint }]}
          >
            {meta.label}
          </Text>
        </View>
      );
    },
    [styles],
  );

  const tallyBadge = useCallback(
    (item) => {
      const meta = tallyOf(item);
      return (
        <View
          style={[
            styles.tallyBadge,
            {
              backgroundColor: `${meta.tint}14`,
              borderColor: `${meta.tint}33`,
            },
          ]}
        >
          <Text style={[styles.tallyBadgeText, { color: meta.tint }]}>
            {meta.label}
          </Text>
        </View>
      );
    },
    [styles],
  );

  const actionButtons = useCallback(
    (item) => {
      const busy = shareBusyId === item.invoiceId;
      return (
        <View style={styles.actionCell}>
          <Pressable
            style={styles.actionBtn}
            hitSlop={6}
            onPress={() => setViewing(item)}
          >
            <Ionicons name="eye-outline" size={16} color={C.ORANGE} />
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            hitSlop={6}
            onPress={() => openShare(item)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={C.GREEN} />
            ) : (
              <Ionicons name="send-outline" size={15} color={C.GREEN} />
            )}
          </Pressable>
        </View>
      );
    },
    [styles, C, openShare, shareBusyId],
  );

  /* ── columns: always sum to the measured width ───────────────────────── */
  const columns = useMemo(() => {
    if (isCardMode) return [];

    const inner = space - styles.gutter * 2;
    const showMobile = space >= BP_MID;
    const showSno = space >= BP_COMPACT + 60;
    const dense = space < BP_WIDE;

    const defs = [
      { key: "expand", label: "", w: dense ? 30 : 34, align: "center" },
      showSno && {
        key: "sno",
        label: "Sno",
        w: dense ? 36 : 42,
        align: "center",
      },
      { key: "date", label: "Date", w: dense ? 92 : 108 },
      { key: "customer", label: "Customer", flex: true, min: 130 },
      showMobile && { key: "mobile", label: "Mobile no", w: 120 },
      { key: "amount", label: "Total", w: dense ? 96 : 112, align: "right" },
      { key: "status", label: "Status", w: dense ? 108 : 124 },
      {
        key: "action",
        label: "Actions",
        w: dense ? 84 : 96,
        align: "center",
      },
    ].filter(Boolean);

    const fixed = defs.reduce((sum, c) => sum + (c.w || 0), 0);
    const flexWidth = Math.max(130, inner - fixed);

    return defs.map((c) => ({ ...c, size: c.flex ? flexWidth : c.w }));
  }, [space, isCardMode, styles]);

  const cellStyle = (col) => [
    styles.cellWrap,
    { width: col.size },
    col.align === "center"
      ? styles.alignCenter
      : col.align === "right"
        ? styles.alignRight
        : styles.alignLeft,
  ];

  const renderCell = (col, item) => {
    switch (col.key) {
      case "expand": {
        const open = !!expanded[item.invoiceId];
        return (
          <View style={[styles.expandBtn, open && styles.expandBtnOpen]}>
            <Ionicons
              name={open ? "chevron-down" : "chevron-forward"}
              size={15}
              color={open ? C.NAVY : C.PLACEHOLDER}
            />
          </View>
        );
      }
      case "sno":
        return <Text style={styles.snoText}>{item.sno}</Text>;
      case "date":
        return (
          <View style={styles.stack}>
            <Text numberOfLines={1} style={styles.cell}>
              {formatDate(item.createdAt)}
            </Text>
            <Text numberOfLines={1} style={styles.cellSub}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        );
      case "customer":
        return (
          <View style={styles.stack}>
            <Text numberOfLines={1} style={styles.cellStrong}>
              {item.customerName || "Unnamed customer"}
            </Text>
            <Text numberOfLines={1} style={styles.cellSub}>
              INV-{item.displayInvoiceId}
            </Text>
          </View>
        );
      case "mobile":
        return (
          <Text numberOfLines={1} style={styles.cell}>
            {item.customerNumber || "—"}
          </Text>
        );
      case "amount":
        return (
          <Text style={styles.amount}>{formatAmount(item.totalPayment)}</Text>
        );
      case "status":
        return statusPill(item);
      case "action":
        return actionButtons(item);
      default:
        return null;
    }
  };

  const tableHead = (
    <View style={styles.tableHead}>
      {columns.map((col) => (
        <View key={col.key} style={cellStyle(col)}>
          <Text numberOfLines={1} style={styles.headCell}>
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );

  /* ── expand panel ────────────────────────────────────────────────────── */
  const renderPanel = (item) => {
    const regular = item.regularPlants || 0;
    const special = item.specialPlants || 0;
    const shownKeys = columns.map((c) => c.key);
    const txnCount = item.transactions?.length || 0;

    const stats = [
      { label: "Regular plants", value: String(regular) },
      { label: "Special plants", value: String(special) },
      {
        label: "Total items",
        value: String(regular + special),
        accent: true,
      },
      { label: "Deposited", text: formatAmount(item.paymentDeposited) },
      { label: "Remaining", text: formatAmount(item.remainingPayment) },
      { label: "Transport", text: formatAmount(item.transportationCost) },
      { label: "Extra discount", text: formatAmount(item.additionalDiscount) },
      {
        label: "Sales person",
        text: item.assignedUserName || "Unassigned",
        wide: true,
      },
      { label: "Unit", text: item.unitName || "—" },
      { label: "Company ID", text: String(item.companyId ?? "—") },
      { label: "Transactions", value: String(txnCount) },
    ];

    if (!shownKeys.includes("mobile")) {
      stats.splice(3, 0, {
        label: "Mobile no",
        text: item.customerNumber || "—",
      });
    }
    if (!shownKeys.includes("sno")) {
      stats.unshift({ label: "Sno", value: String(item.sno) });
    }

    return (
      <View style={styles.panel}>
        <View style={styles.panelInner}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={[styles.stat, stat.wide && { minWidth: 150 }]}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>
              {stat.value !== undefined ? (
                <Text
                  style={[
                    styles.statValue,
                    stat.accent && styles.statValueAccent,
                  ]}
                >
                  {stat.value}
                </Text>
              ) : (
                <Text style={styles.statText}>{stat.text}</Text>
              )}
            </View>
          ))}
          <View style={[styles.stat, { minWidth: 120 }]}>
            <Text style={styles.statLabel}>Tally sync</Text>
            {tallyBadge(item)}
          </View>
        </View>
      </View>
    );
  };

  /* ── rows ────────────────────────────────────────────────────────────── */
  const renderRow = ({ item }) => {
    const open = !!expanded[item.invoiceId];

    return (
      <Fragment>
        <Pressable
          onPress={() => toggleRow(item.invoiceId)}
          style={({ pressed }) => [
            styles.row,
            open && styles.rowOpen,
            pressed && styles.rowPressed,
          ]}
        >
          {columns.map((col) => (
            <View key={col.key} style={cellStyle(col)}>
              {renderCell(col, item)}
            </View>
          ))}
        </Pressable>
        {open ? renderPanel(item) : null}
      </Fragment>
    );
  };

  const renderCard = ({ item }) => {
    const open = !!expanded[item.invoiceId];
    const plants = (item.regularPlants || 0) + (item.specialPlants || 0);
    const busy = shareBusyId === item.invoiceId;

    return (
      <Pressable
        onPress={() => toggleRow(item.invoiceId)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={styles.cardName}>
              {item.customerName || "Unnamed customer"}
            </Text>
            <Text style={styles.cellSub}>
              INV-{item.displayInvoiceId} · {formatDate(item.createdAt)}
            </Text>
          </View>
          {statusPill(item)}
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.cardAmount}>
              {formatAmount(item.totalPayment)}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Mobile no</Text>
            <Text style={styles.statText}>{item.customerNumber || "—"}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Items</Text>
            <Text style={styles.statText}>{plants}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Deposited</Text>
            <Text style={styles.statText}>
              {formatAmount(item.paymentDeposited)}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Remaining</Text>
            <Text style={styles.statText}>
              {formatAmount(item.remainingPayment)}
            </Text>
          </View>
          {open ? (
            <>
              <View style={styles.cardMeta}>
                <Text style={styles.statLabel}>Transport</Text>
                <Text style={styles.statText}>
                  {formatAmount(item.transportationCost)}
                </Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.statLabel}>Extra discount</Text>
                <Text style={styles.statText}>
                  {formatAmount(item.additionalDiscount)}
                </Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.statLabel}>Sales person</Text>
                <Text style={styles.statText}>
                  {item.assignedUserName || "Unassigned"}
                </Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.statLabel}>Unit</Text>
                <Text style={styles.statText}>{item.unitName || "—"}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.statLabel}>Company ID</Text>
                <Text style={styles.statText}>
                  {String(item.companyId ?? "—")}
                </Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.statLabel}>Tally sync</Text>
                {tallyBadge(item)}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.cardActions}>
          <Pressable
            style={styles.cardActionBtn}
            onPress={() => setViewing(item)}
          >
            <Ionicons name="eye-outline" size={16} color={C.ORANGE} />
            <Text style={[styles.cardActionText, { color: C.ORANGE }]}>
              View
            </Text>
          </Pressable>
          <Pressable
            style={styles.cardActionBtn}
            onPress={() => openShare(item)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={C.GREEN} />
            ) : (
              <Ionicons name="send-outline" size={15} color={C.GREEN} />
            )}
            <Text style={[styles.cardActionText, { color: C.GREEN }]}>
              Send
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  /* `invoices` is now exactly what the server returned, so a non-empty
     `invoices` with an empty `visible` can only mean the search box or a
     status chip is hiding rows — which is what "Nothing matches this view"
     tells the operator. */
  const listEmpty = () => {
    if (loading) return null;
    const filtered = invoices.length > 0;

    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name={error ? "cloud-offline-outline" : "receipt-outline"}
            size={28}
            color={C.PLACEHOLDER}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {error
            ? "Invoices didn't load"
            : filtered
              ? "Nothing matches this view"
              : "No invoices yet"}
        </Text>
        <Text style={styles.emptyText}>
          {error ||
            (filtered
              ? "Clear the search box or pick another status to see more."
              : "Generated invoices will appear here.")}
        </Text>
        {error ? (
          <Pressable style={styles.emptyAction} onPress={load}>
            <Text style={styles.emptyActionText}>TRY AGAIN</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.shell}>
        {/* toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.searchWrap}>
            <Ionicons
              name="search-outline"
              size={styles.iconSize}
              color={C.PLACEHOLDER}
            />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search customer, invoice ID, mobile or sales person"
              placeholderTextColor={C.PLACEHOLDER}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={styles.iconSize}
                  color={C.PLACEHOLDER}
                />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.filterRow}>
            {STATUSES.map((option) => {
              const active = option.key === status;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setStatus(option.key)}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.resultCount}>
              {visible.length} of {invoices.length} shown
            </Text>
          </View>
        </View>

        {/* body */}
        <View
          style={styles.tableWrap}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            setAvail((prev) => (Math.abs(prev - w) > 2 ? w : prev));
          }}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={C.NAVY} />
              <Text style={styles.loadingText}>Loading invoices…</Text>
            </View>
          ) : (
            <>
              {!isCardMode && visible.length > 0 ? tableHead : null}
              <FlatList
                data={visible}
                keyExtractor={(item) => String(item.invoiceId)}
                renderItem={isCardMode ? renderCard : renderRow}
                extraData={{ expanded, columns, shareBusyId }}
                ListEmptyComponent={listEmpty}
                contentContainerStyle={
                  isCardMode ? styles.cardList : styles.listContent
                }
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={C.NAVY}
                    colors={[C.NAVY]}
                  />
                }
              />
            </>
          )}
        </View>
      </View>

      <Modal
        visible={!!viewing}
        animationType="slide"
        onRequestClose={() => setViewing(null)}
      >
        {viewing ? (
          <InvoiceView
            invoice={viewing}
            onClose={() => setViewing(null)}
            onSaved={handleSaved}
            onError={setError}
          />
        ) : null}
      </Modal>

      <PdfShareSheet
        file={pdf?.file}
        title={pdf?.title}
        subtitle={pdf?.subtitle}
        message={pdf?.message}
        onClose={() => setPdf(null)}
        onError={setError}
      />
    </View>
  );
}
