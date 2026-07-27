import { Ionicons } from "@expo/vector-icons";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { downloadInvoicePdf } from "../../api/downloadPdfApis.js";
import { searchInvoice } from "../../api/fetchInvoice.js";
import PdfShareSheet from "../../utility/PdfShareSheet.js";
import { getCurrentUser } from "../../utility/secureStorage.js";
import makeStyles from "./InvoiceList.styles.js";
import InvoiceView from "./View.jsx";

/* Server-side search tuning. */
const DEBOUNCE_MS = 400; // wait after the last keystroke before hitting the API
const MIN_CHARS = 2; // don't search on a single character
const MAX_RECORDS = 20; // matches the endpoint's default cap

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

const TALLY_META = {
  SYNC: { label: "Synced", tint: "#5B8E2E" },
  REQUEST_INITIATED: { label: "Sync requested", tint: "#E8622C" },
  NOT_SYNC: { label: "Not synced", tint: "#94A3B8" },
};

const BP_WIDE = 940;
const BP_MID = 780;
const BP_COMPACT = 620;

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

/* Debounce any fast-changing value: returns `value` only after it has stopped
   changing for `delay` ms. The cleanup cancels the pending timer on every new
   keystroke, so only the final pause fires. */
function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Search Invoice.
 *
 * Server-side search against GET /search (searchKey, unitId, maxRecord). Typing
 * is debounced, so the API is only called once the operator pauses; pressing
 * the keyboard's Search key fires immediately. Results are capped at
 * MAX_RECORDS and can be narrowed further by the payment-status chips
 * client-side. View and Send behave exactly as in the main invoice list.
 *
 * A monotonic request id guards against out-of-order responses: only the newest
 * in-flight query is allowed to write results, so a slow earlier request can't
 * clobber a faster later one.
 */
export default function SearchInvoiceList({ onUpdate, onSend }) {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [viewing, setViewing] = useState(null);
  const [expanded, setExpanded] = useState({});

  const [shareBusyId, setShareBusyId] = useState(null);
  const [pdf, setPdf] = useState(null);

  const resolvedUnitId = currentUser?.unitId;

  const debouncedSearch = useDebouncedValue(search, DEBOUNCE_MS);

  /* Latest-wins guard for async responses. */
  const reqId = useRef(0);

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

  /* Run a search for `raw`. Short terms clear the list; a stale response (one
     whose id is no longer the latest) is dropped before it can set state. */
  const runSearch = useCallback(
    async (raw) => {
      const term = raw.trim();

      if (term.length < MIN_CHARS) {
        reqId.current += 1; // invalidate any in-flight request
        setInvoices([]);
        setError(null);
        setLoading(false);
        return;
      }

      if (!resolvedUnitId) {
        setError("No unit assigned to this user.");
        setLoading(false);
        return;
      }

      const id = ++reqId.current;
      setLoading(true);
      setError(null);

      const response = await searchInvoice(term, resolvedUnitId, MAX_RECORDS);
      if (id !== reqId.current) return; // a newer search superseded this one

      if (response?.status === "SUCCESS") {
        setInvoices(response.payload || []);
      } else if (response?.status === "NOT_FOUND") {
        setInvoices([]);
      } else {
        setInvoices([]);
        setError(response?.message || "Could not search invoices.");
      }
      setLoading(false);
    },
    [resolvedUnitId],
  );

  /* Fire whenever the debounced term settles (and once the user is loaded). */
  useEffect(() => {
    if (!userReady) return;
    runSearch(debouncedSearch);
  }, [debouncedSearch, userReady, runSearch]);

  /* True from the first keystroke (while the debounce timer is still counting)
     through to the response landing — so the spinner shows instantly, not only
     once the request goes out. */
  const busy =
    loading ||
    (search.trim() !== debouncedSearch.trim() &&
      search.trim().length >= MIN_CHARS);

  const numbered = useMemo(
    () =>
      [...invoices]
        .sort((a, b) => dateValue(a) - dateValue(b))
        .map((inv, index) => ({ ...inv, sno: index + 1 })),
    [invoices],
  );

  /* Status chips refine the returned results client-side. */
  const visible = useMemo(
    () =>
      numbered.filter((inv) =>
        status === "ALL" ? true : inv.paymentStatus === status,
      ),
    [numbered, status],
  );

  const handleSaved = useCallback(
    (saved) => {
      if (!saved || saved === true) {
        runSearch(debouncedSearch);
        return;
      }
      setInvoices((prev) =>
        prev.map((inv) => (inv.invoiceId === saved.invoiceId ? saved : inv)),
      );
      onUpdate?.(saved);
    },
    [runSearch, debouncedSearch, onUpdate],
  );

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

      const invoiceLine = `INV-${id}${
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
      const rowBusy = shareBusyId === item.invoiceId;
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
            disabled={rowBusy}
          >
            {rowBusy ? (
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

  /* ── columns ─────────────────────────────────────────────────────────── */
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
      { key: "action", label: "Actions", w: dense ? 84 : 96, align: "center" },
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
              INV-{item.invoiceId}
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
      { label: "Total items", value: String(regular + special), accent: true },
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

  /* ── rows / cards ────────────────────────────────────────────────────── */
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
    const rowBusy = shareBusyId === item.invoiceId;

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
              INV-{item.invoiceId} · {formatDate(item.createdAt)}
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
            disabled={rowBusy}
          >
            {rowBusy ? (
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

  /* Empty area does quadruple duty: searching / prompt / error / no-match. */
  const listEmpty = () => {
    if (busy) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.NAVY} />
          <Text style={styles.loadingText}>Searching invoices…</Text>
        </View>
      );
    }

    const term = debouncedSearch.trim();

    if (term.length < MIN_CHARS) {
      return (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={28} color={C.PLACEHOLDER} />
          </View>
          <Text style={styles.emptyTitle}>Search for an invoice</Text>
          <Text style={styles.emptyText}>
            Type a customer name, invoice ID, mobile number or sales person to
            find invoices in your unit.
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={C.PLACEHOLDER}
            />
          </View>
          <Text style={styles.emptyTitle}>Search failed</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable
            style={styles.emptyAction}
            onPress={() => runSearch(debouncedSearch)}
          >
            <Text style={styles.emptyActionText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons name="receipt-outline" size={28} color={C.PLACEHOLDER} />
        </View>
        <Text style={styles.emptyTitle}>No invoices found</Text>
        <Text style={styles.emptyText}>
          Nothing matches “{term}”. Check the spelling or try a different term.
        </Text>
      </View>
    );
  };

  const resultLabel = busy
    ? "Searching…"
    : `${visible.length}${
        visible.length !== invoices.length ? ` of ${invoices.length}` : ""
      } shown`;

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
              autoFocus
              autoCorrect={false}
              onSubmitEditing={() => runSearch(search)} // search now, skip debounce
            />
            {busy ? (
              <ActivityIndicator size="small" color={C.NAVY} />
            ) : search.length > 0 ? (
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
            <Text style={styles.resultCount}>{resultLabel}</Text>
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
          {!isCardMode && visible.length > 0 ? tableHead : null}
          <FlatList
            data={visible}
            keyExtractor={(item) => String(item.invoiceId)}
            renderItem={isCardMode ? renderCard : renderRow}
            extraData={{ expanded, columns, shareBusyId, busy }}
            ListEmptyComponent={listEmpty}
            contentContainerStyle={
              isCardMode ? styles.cardList : styles.listContent
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
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
