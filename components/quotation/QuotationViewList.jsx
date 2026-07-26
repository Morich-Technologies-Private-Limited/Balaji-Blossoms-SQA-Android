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

import {
  downloadCollectionSheetPdf,
  downloadQuotationPdf,
} from "../../api/downloadPdfApis";

import {
  fetchQuotationsByUnit,
  fetchQuotationsByUser,
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

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const levelOf = (item) =>
  LEVEL_META[item.level] || { label: item.level || "—", tint: "#94A3B8" };

/* ── share chooser ─────────────────────────────────────────────────────
   A small sheet offered when the operator taps Send on a row. It only picks
   *what* to share — Quotation or Collector Sheet — and hands the choice back;
   the download and the actual share are driven by the parent. */
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
 * Edit opens the plant editor over the list. The saved quotation comes back
 * from the server, so the row is refreshed in place instead of refetching.
 *
 * The Edit screen distinguishes a plain in-place save (which should leave the
 * editor open so the operator can keep working) from a finalizing action —
 * moving to the loading shade or generating the invoice — which closes it. It
 * signals this in the second argument to `onSaved` as `{ keepOpen }`, and
 * `handleSaved` only dismisses the modal when `keepOpen` is false.
 *
 * Send opens a small chooser: the operator shares either the Quotation PDF or
 * the Collector Sheet PDF. The chosen PDF is downloaded and handed to the
 * shared PdfShareSheet. If a parent passes `onSend`, that takes over instead.
 */
export default function QuotationViewList({
  mode = "user",
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
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});

  /* Share flow: the row whose Send was tapped, which kind is downloading, and
     the downloaded PDF once it is ready to hand to the share sheet. */
  const [shareTarget, setShareTarget] = useState(null);
  const [shareBusyKind, setShareBusyKind] = useState(null);
  const [pdf, setPdf] = useState(null);

  const resolvedUserId = currentUser?.emailId;
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

  const numbered = useMemo(
    () =>
      [...quotations]
        .sort((a, b) => dateValue(a) - dateValue(b))
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
          (q.assignedUserId || "").toLowerCase().includes(term)
        );
      });
  }, [numbered, search, level]);

  const handleCreated = (created) => {
    setCreateOpen(false);
    if (created) setQuotations((prev) => [created, ...prev]);
    else load();
  };

  /* Edit's onSaved fires for every successful write. The second argument tells
     us the intent:
       • a plain save sends { keepOpen: true }  → refresh the row, leave the
         editor open so the operator can keep working (they close it manually);
       • move-to-shade / generate-invoice send { keepOpen: false } → refresh
         and dismiss the editor.
     Older callers with no meta object are treated as "close", preserving the
     previous behaviour. */
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

  /* ── share ────────────────────────────────────────────────────────────
     Tapping Send opens the kind chooser. Picking a kind downloads the matching
     PDF and, on success, hands it to PdfShareSheet. The chooser closes once the
     download resolves; a failed download surfaces an inline error and leaves
     the chooser open to retry. A parent-supplied `onSend` takes over entirely
     if present. */
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

  const actionButtons = useCallback(
    (item) => (
      <View style={styles.actionCell}>
        <Pressable
          style={styles.actionBtn}
          hitSlop={6}
          onPress={() => onSelect?.(item)}
        >
          <Ionicons name="eye-outline" size={16} color={C.NAVY} />
        </Pressable>
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
    [styles, C, onSelect, openShare],
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
        label: "Actions",
        w: dense ? 112 : 124,
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

        <View style={styles.cardActions}>
          <Pressable
            style={styles.cardActionBtn}
            onPress={() => onSelect?.(item)}
          >
            <Ionicons name="eye-outline" size={16} color={C.NAVY} />
            <Text style={styles.cardActionText}>View</Text>
          </Pressable>
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

  const heading =
    title || (mode === "unit" ? "Unit quotations" : "My quotations");
  const sub =
    subtitle ||
    (mode === "unit"
      ? "Every quotation raised by your unit"
      : "Quotations you created");

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
              placeholder="Search customer, quotation ID, mobile or sales person"
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
