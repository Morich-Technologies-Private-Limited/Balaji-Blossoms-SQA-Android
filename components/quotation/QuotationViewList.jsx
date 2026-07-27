import { Ionicons } from "@expo/vector-icons";
import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
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

import {
  downloadCollectionSheetPdf,
  downloadQuotationPdf,
} from "../../api/downloadPdfApis";

import {
  fetchQuotationsByUnit,
  fetchQuotationsByUser,
  getQuotation,
} from "../../api/fetchQuotation";
import PdfShareSheet from "../../utility/PdfShareSheet";
import { getCurrentUser } from "../../utility/secureStorage";
import CreateQuotationModal from "./CreateQuotationModal";
import Edit from "./Edit";
import makeStyles from "./QuotationViewList.styles";

const LEVELS = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "DELIVERY_SHADE", label: "Delivery shade" },
  { key: "INVOICE_GENERATED", label: "Invoiced" },
];

const LEVEL_META = {
  DRAFT: { label: "Draft", tint: "#E8622C" },
  DELIVERY_SHADE: { label: "Delivery shade", tint: "#0F4776" },
  INVOICE_GENERATED: { label: "Invoiced", tint: "#5B8E2E" },
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
  const raw = item?.creationDate || item?.updateDate;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};

/* A loose date haystack for search: matches both the displayed dd-mm-yyyy form
   and common typed variants (yyyy-mm-dd, dd/mm, month name), so an operator can
   find a quotation by typing part of its date however they think of it. */
const dateSearchText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const month = date.toLocaleString("en-IN", { month: "long" }).toLowerCase();
  const monthShort = date
    .toLocaleString("en-IN", { month: "short" })
    .toLowerCase();
  return [
    `${dd}-${mm}-${yyyy}`,
    `${dd}/${mm}/${yyyy}`,
    `${yyyy}-${mm}-${dd}`,
    `${dd} ${month} ${yyyy}`,
    `${dd} ${monthShort}`,
    month,
    monthShort,
    String(yyyy),
  ].join(" ");
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const levelOf = (item) =>
  LEVEL_META[item.level] || { label: item.level || "—", tint: "#94A3B8" };

/* ── share chooser ─────────────────────────────────────────────────────
   A small sheet offered when the operator taps Send on a row, or automatically
   after a level change. It only picks *what* to share — Quotation or Collector
   Sheet — and hands the choice back; the download and the actual share are
   driven by the parent. */
function ShareKindModal({ styles, quotationLine, busyKind, onPick, onClose }) {
  const C = styles.colors;

  const options = [
    {
      key: "quotation",
      icon: "document-text-outline",
      title: "Quotation",
      subtitle: "The customer-facing quotation PDF",
    },
    {
      key: "collector",
      icon: "clipboard-outline",
      title: "Collector Sheet",
      subtitle: "The picking / collection sheet",
    },
  ];

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.shareBackdrop} onPress={onClose}>
        <Pressable style={styles.shareSheet} onPress={() => {}}>
          <View style={styles.shareHeader}>
            <Text style={styles.shareTitle}>Share</Text>
            <Text style={styles.shareSubtitle}>{quotationLine}</Text>
          </View>

          <View style={styles.shareBody}>
            {options.map((option) => {
              const busy = busyKind === option.key;
              const disabled = busyKind !== null;
              return (
                <Pressable
                  key={option.key}
                  style={({ hovered, pressed }) => [
                    styles.shareOption,
                    (hovered || pressed) &&
                      !disabled &&
                      styles.shareOptionHover,
                    disabled && !busy && styles.shareOptionDisabled,
                  ]}
                  onPress={() => onPick(option.key)}
                  disabled={disabled}
                >
                  <View style={styles.shareOptionIcon}>
                    {busy ? (
                      <ActivityIndicator color={C.NAVY} />
                    ) : (
                      <Ionicons name={option.icon} size={20} color={C.NAVY} />
                    )}
                  </View>
                  <View style={styles.shareOptionText}>
                    <Text style={styles.shareOptionTitle}>{option.title}</Text>
                    <Text style={styles.shareOptionSub}>{option.subtitle}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={C.PLACEHOLDER}
                  />
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ hovered, pressed }) => [
              styles.shareCancel,
              (hovered || pressed) && styles.shareCancelHover,
            ]}
            onPress={onClose}
            disabled={busyKind !== null}
          >
            <Text style={styles.shareCancelText}>CANCEL</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Quotation list.
 *
 * Layout contract: the table never scrolls sideways. Column widths are derived
 * from the measured container width and always add up to it, so the Action
 * column can never be pushed out of frame. As the container narrows, columns
 * are removed in order of importance and their values move into the expand
 * panel; under 620px the rows become cards.
 *
 * The "New quotation" trigger no longer lives in this component's header — the
 * hosting screen renders it in the SalesLayout header (top-right, beside the
 * page title) and calls the imperative `openCreate()` handle exposed via ref.
 *
 * Rows are shown newest-first (descending creationDate); the Sno numbering
 * follows that order. Search matches customer name, quotation / customer ID,
 * mobile, sales person, and the creation date in several written forms.
 *
 * Edit opens the plant editor over the list. On save the row is refreshed in
 * place from the server echo; additionally, whenever the editor closes (X,
 * Android back, or a finalizing action) the edited quotation is refetched so
 * the row always reflects the server's latest copy.
 *
 * Auto-share on level change: the editor is opened against a known level
 * (DRAFT / DELIVERY_SHADE / INVOICE_GENERATED). When it closes we refetch the
 * quotation, and if the level has moved on (e.g. moved to the loading shade or
 * turned into an invoice), we automatically open the Share chooser for that
 * quotation so the operator can hand over the fresh document. No level change,
 * no popup — a plain close is silent.
 *
 * Send opens the same chooser: the operator shares either the Quotation PDF or
 * the Collector Sheet PDF. The chosen PDF is downloaded and handed to the
 * shared PdfShareSheet. If a parent passes `onSend`, that takes over instead.
 */
function QuotationViewList(
  { mode = "user", title, subtitle, onSelect, onUpdate, onSend },
  ref,
) {
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
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});

  /* Share flow: the row whose Send was tapped (or which just changed level),
     which kind is downloading, and the downloaded PDF once it is ready to hand
     to the share sheet. */
  const [shareTarget, setShareTarget] = useState(null);
  const [shareBusyKind, setShareBusyKind] = useState(null);
  const [pdf, setPdf] = useState(null);

  const resolvedUserId = currentUser?.emailId;
  const resolvedUnitId = currentUser?.unitId;

  const toggleRow = useCallback((id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  /* The hosting screen owns the "New quotation" button in the page header and
     opens the create modal through this handle. */
  useImperativeHandle(
    ref,
    () => ({ openCreate: () => setCreateOpen(true) }),
    [],
  );

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

    if (mode === "user" && !resolvedUserId) {
      setError("No signed-in user found.");
      setQuotations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === "unit" && !resolvedUnitId) {
      setError("No unit assigned to this user.");
      setQuotations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);

    const response =
      mode === "unit"
        ? await fetchQuotationsByUnit(resolvedUnitId)
        : await fetchQuotationsByUser(resolvedUserId);

    if (response?.status === "SUCCESS") {
      setQuotations(response.payload || []);
    } else if (response?.status === "NOT_FOUND") {
      setQuotations([]);
    } else {
      setQuotations([]);
      setError(response?.message || "Could not load quotations.");
    }

    setLoading(false);
    setRefreshing(false);
  }, [mode, userReady, resolvedUserId, resolvedUnitId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  /* Newest first: sort by creationDate descending, then number the rows so Sno
     1 is the most recent quotation. */
  const numbered = useMemo(
    () =>
      [...quotations]
        .sort((a, b) => dateValue(b) - dateValue(a))
        .map((q, index) => ({ ...q, sno: index + 1 })),
    [quotations],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return numbered
      .filter((q) => (level === "ALL" ? true : q.level === level))
      .filter((q) => {
        if (!term) return true;
        return (
          String(q.quotationId).includes(term) ||
          String(q.customerId || "").includes(term) ||
          String(q.mobileNo || "").includes(term) ||
          (q.customerName || "").toLowerCase().includes(term) ||
          (q.assignedUserName || "").toLowerCase().includes(term) ||
          (q.assignedUserId || "").toLowerCase().includes(term) ||
          dateSearchText(q.creationDate).includes(term)
        );
      });
  }, [numbered, search, level]);

  const handleCreated = (created) => {
    setCreateOpen(false);
    if (created) setQuotations((prev) => [created, ...prev]);
    else load();
  };

  /* ── share ────────────────────────────────────────────────────────────
     Opening the chooser: either tapping Send on a row, or automatically after
     a level change. Picking a kind downloads the matching PDF and, on success,
     hands it to PdfShareSheet. The chooser closes once the download resolves; a
     failed download surfaces an inline error and leaves the chooser open to
     retry. A parent-supplied `onSend` takes over entirely if present. */
  const openShare = useCallback(
    (item) => {
      if (onSend) {
        onSend(item);
        return;
      }
      setError(null);
      setShareTarget(item);
      setShareBusyKind(null);
    },
    [onSend],
  );

  const closeShare = useCallback(() => {
    setShareTarget(null);
    setShareBusyKind(null);
  }, []);

  const pickShareKind = useCallback(
    async (kind) => {
      if (!shareTarget || shareBusyKind) return;

      setError(null);
      setShareBusyKind(kind);

      const id = shareTarget.quotationId;
      const response =
        kind === "collector"
          ? await downloadCollectionSheetPdf(id)
          : await downloadQuotationPdf(id);

      setShareBusyKind(null);

      if (response?.status !== "SUCCESS" || !response.payload) {
        setError(
          response?.message ||
            (kind === "collector"
              ? "The collector sheet could not be downloaded."
              : "The quotation PDF could not be downloaded."),
        );
        return;
      }

      const isCollector = kind === "collector";
      const quotationLine = `QTN-${id}${
        shareTarget.customerName ? ` · ${shareTarget.customerName}` : ""
      }`;

      setPdf({
        kind,
        title: isCollector ? "Collector sheet" : "Quotation",
        subtitle: quotationLine,
        message: `${
          isCollector ? "Collector sheet" : "Quotation"
        } for ${quotationLine}`,
        file: response.payload,
      });

      // The chooser has done its job; the share sheet takes over.
      closeShare();
    },
    [shareTarget, shareBusyKind, closeShare],
  );

  /* Edit's onSaved fires for every successful write. The second argument tells
     us the intent:
       • a plain save sends { keepOpen: true }  → refresh the row, leave the
         editor open so the operator can keep working (they close it manually);
       • move-to-shade / generate-invoice send { keepOpen: false } → refresh
         and dismiss the editor.
     Older callers with no meta object are treated as "close", preserving the
     previous behaviour. The auto-share on level change is handled centrally on
     editor close (see refreshQuotation), not here. */
  const handleSaved = useCallback(
    (saved, meta) => {
      const keepOpen = meta?.keepOpen === true;

      if (!keepOpen) {
        setEditing(null);
      }

      if (!saved || saved === true) {
        // No echo (or a bare success flag) from the server: refetch the list.
        load();
        return;
      }

      setQuotations((prev) =>
        prev.map((q) => (q.quotationId === saved.quotationId ? saved : q)),
      );

      /* Keep the open editor bound to the freshly saved quotation so, if it
         stays open, it is working against the server's latest copy. */
      if (keepOpen) {
        setEditing((current) =>
          current && current.quotationId === saved.quotationId
            ? saved
            : current,
        );
      }

      onUpdate?.(saved);
    },
    [load, onUpdate],
  );

  /* ── refetch on editor close ──────────────────────────────────────────
     Re-pull the single quotation from the server whenever the editor is
     dismissed, whatever the cause (X button, Android back, or a finalizing
     save). Runs once per close via the was-editing latch.

     If the level has moved on since the editor opened — the operator moved the
     quotation to the loading shade or turned it into an invoice — automatically
     open the Share chooser for the fresh copy, so the new document is one tap
     from going out. A plain close with no level change stays silent. */
  const refreshQuotation = useCallback(
    async (quotationId, openedAtLevel) => {
      if (quotationId == null) return;
      const response = await getQuotation(quotationId);

      if (response?.status === "SUCCESS" && response.payload) {
        const fresh = response.payload;

        setQuotations((prev) =>
          prev.map((q) => (q.quotationId === fresh.quotationId ? fresh : q)),
        );

        if (
          openedAtLevel != null &&
          fresh.level != null &&
          fresh.level !== openedAtLevel
        ) {
          openShare(fresh);
        }
      } else if (response?.status === "NOT_FOUND") {
        // Gone on the server — drop it from the list.
        setQuotations((prev) =>
          prev.filter((q) => q.quotationId !== quotationId),
        );
      }
    },
    [openShare],
  );

  const editingIdRef = useRef(null);
  const editingLevelRef = useRef(null);
  const wasEditingRef = useRef(false);
  useEffect(() => {
    if (editing) {
      editingIdRef.current = editing.quotationId;
      editingLevelRef.current = editing.level;
      wasEditingRef.current = true;
      return;
    }
    if (wasEditingRef.current) {
      wasEditingRef.current = false;
      refreshQuotation(editingIdRef.current, editingLevelRef.current);
    }
  }, [editing, refreshQuotation]);

  /* ── shared bits ─────────────────────────────────────────────────────── */

  const levelPill = useCallback(
    (item) => {
      const meta = levelOf(item);
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

  /* View button removed — the row now exposes only Edit and Send. */
  const actionButtons = useCallback(
    (item) => (
      <View style={styles.actionCell}>
        <Pressable
          style={styles.actionBtn}
          hitSlop={6}
          onPress={() => setEditing(item)}
        >
          <Ionicons name="create-outline" size={16} color={C.ORANGE} />
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          hitSlop={6}
          onPress={() => openShare(item)}
        >
          <Ionicons name="send-outline" size={15} color={C.GREEN} />
        </Pressable>
      </View>
    ),
    [styles, C, openShare],
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
      { key: "level", label: "Level", w: dense ? 108 : 124 },
      {
        key: "action",
        // Narrower now that the View button is gone (2 icons instead of 3).
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
        const open = !!expanded[item.quotationId];
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
              {formatDate(item.creationDate)}
            </Text>
            <Text numberOfLines={1} style={styles.cellSub}>
              {formatTime(item.creationDate)}
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
              QTN-{item.quotationId}
            </Text>
          </View>
        );
      case "mobile":
        return (
          <Text numberOfLines={1} style={styles.cell}>
            {item.mobileNo || "—"}
          </Text>
        );
      case "amount":
        return (
          <Text style={styles.amount}>{formatAmount(item.totalAmount)}</Text>
        );
      case "level":
        return levelPill(item);
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
    const plants = item.plantList?.length || 0;
    const special = item.specialPlantList?.length || 0;
    const shownKeys = columns.map((c) => c.key);

    const stats = [
      { label: "Plant count", value: String(plants) },
      { label: "Special plants", value: String(special) },
      { label: "Total items", value: String(plants + special), accent: true },
      { label: "Advance paid", text: formatAmount(item.advancePayment) },
      { label: "Remaining", text: formatAmount(item.remainingPayment) },
      {
        label: "Sales person",
        text: item.assignedUserName || item.assignedUserId || "Unassigned",
        wide: true,
      },
      { label: "Customer ID", text: String(item.customerId ?? "—") },
    ];

    if (!shownKeys.includes("mobile")) {
      stats.splice(3, 0, { label: "Mobile no", text: item.mobileNo || "—" });
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
        </View>
      </View>
    );
  };

  /* ── rows ────────────────────────────────────────────────────────────── */
  const renderRow = ({ item }) => {
    const open = !!expanded[item.quotationId];

    return (
      <Fragment>
        <Pressable
          onPress={() => toggleRow(item.quotationId)}
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
    const open = !!expanded[item.quotationId];
    const plants =
      (item.plantList?.length || 0) + (item.specialPlantList?.length || 0);

    return (
      <Pressable
        onPress={() => toggleRow(item.quotationId)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={styles.cardName}>
              {item.customerName || "Unnamed customer"}
            </Text>
            <Text style={styles.cellSub}>
              QTN-{item.quotationId} · {formatDate(item.creationDate)}
            </Text>
          </View>
          {levelPill(item)}
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.cardAmount}>
              {formatAmount(item.totalAmount)}
            </Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Mobile no</Text>
            <Text style={styles.statText}>{item.mobileNo || "—"}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Items</Text>
            <Text style={styles.statText}>{plants}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.statLabel}>Advance paid</Text>
            <Text style={styles.statText}>
              {formatAmount(item.advancePayment)}
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
                <Text style={styles.statLabel}>Sales person</Text>
                <Text style={styles.statText}>
                  {item.assignedUserName || item.assignedUserId || "Unassigned"}
                </Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.statLabel}>Customer ID</Text>
                <Text style={styles.statText}>{item.customerId ?? "—"}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* View button removed — cards now offer Edit and Send only. */}
        <View style={styles.cardActions}>
          <Pressable
            style={styles.cardActionBtn}
            onPress={() => setEditing(item)}
          >
            <Ionicons name="create-outline" size={16} color={C.ORANGE} />
            <Text style={[styles.cardActionText, { color: C.ORANGE }]}>
              Edit
            </Text>
          </Pressable>
          <Pressable
            style={styles.cardActionBtn}
            onPress={() => openShare(item)}
          >
            <Ionicons name="send-outline" size={15} color={C.GREEN} />
            <Text style={[styles.cardActionText, { color: C.GREEN }]}>
              Send
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const listEmpty = () => {
    if (loading) return null;
    const filtered = quotations.length > 0;

    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name={error ? "cloud-offline-outline" : "document-text-outline"}
            size={28}
            color={C.PLACEHOLDER}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {error
            ? "Quotations didn't load"
            : filtered
              ? "Nothing matches this view"
              : "No quotations yet"}
        </Text>
        <Text style={styles.emptyText}>
          {error ||
            (filtered
              ? "Clear the search box or pick another status to see more."
              : "Create your first quotation and it will appear here.")}
        </Text>
        <Pressable
          style={styles.emptyAction}
          onPress={error ? load : () => setCreateOpen(true)}
        >
          <Text style={styles.emptyActionText}>
            {error ? "TRY AGAIN" : "NEW QUOTATION"}
          </Text>
        </Pressable>
      </View>
    );
  };

  const shareLine = shareTarget
    ? `QTN-${shareTarget.quotationId}${
        shareTarget.customerName ? ` · ${shareTarget.customerName}` : ""
      }`
    : "";

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
              placeholder="Search by customer name, date, quotation ID or mobile"
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
            {LEVELS.map((option) => {
              const active = option.key === level;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setLevel(option.key)}
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
              {visible.length} of {quotations.length} shown
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
              <Text style={styles.loadingText}>Loading quotations…</Text>
            </View>
          ) : (
            <>
              {!isCardMode && visible.length > 0 ? tableHead : null}
              <FlatList
                data={visible}
                keyExtractor={(item) => String(item.quotationId)}
                renderItem={isCardMode ? renderCard : renderRow}
                extraData={{ expanded, columns }}
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

      <CreateQuotationModal
        visible={createOpen}
        userId={resolvedUserId}
        unitId={resolvedUnitId}
        userName={currentUser?.name || currentUser?.userName}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        {editing ? (
          <Edit
            quotation={editing}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        ) : null}
      </Modal>

      {shareTarget ? (
        <ShareKindModal
          styles={styles}
          quotationLine={shareLine}
          busyKind={shareBusyKind}
          onPick={pickShareKind}
          onClose={closeShare}
        />
      ) : null}

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

export default forwardRef(QuotationViewList);
