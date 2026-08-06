import { Platform, StyleSheet } from "react-native";

/* ── palette ───────────────────────────────────────────────────────── */
const NAVY = "#0F4776";
const NAVY_DEEP = "#0B3358";
const NAVY_TINT = "#EAF2FA";
const BLUE_CARD = "#EDF4FD";
const BLUE_CARD_LINE = "#CBDFF6";
const BLUE_TEXT = "#0F4776";
const GREEN = "#16A34A";
const GREEN_DEEP = "#128040";
const GREEN_SOFT = "#E9F7EF";
const GREEN_LINE = "#BFE5CD";
const WHATSAPP = "#25D366";
const WHATSAPP_DEEP = "#1FAF55";
const ORANGE = "#EA8A3C";
const ALERT = "#E8622C";
const ALERT_SOFT = "#FDECE5";
const ALERT_LINE = "#F6CBB6";
const RED = "#DC2626";
const RED_SOFT = "#FDE9E9";
const RED_LINE = "#F8CFCF";
const SURFACE = "#FFFFFF";
const PAGE = "#EDF1F6";
const FILL = "#F7F9FC";
const FILL_DEEP = "#EEF2F7";
const BORDER = "#E5EAF1";
const BORDER_STRONG = "#D3DCE7";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const FAINT = "#94A3B8";

const web = Platform.OS === "web";
const noOutline = web ? { outlineStyle: "none" } : null;

const shadow = (opacity, radius, y) =>
  web
    ? { boxShadow: `0 ${y}px ${radius}px rgba(15,23,42,${opacity})` }
    : {
        shadowColor: TEXT,
        shadowOpacity: opacity,
        shadowRadius: radius,
        shadowOffset: { width: 0, height: y },
        elevation: Math.round(radius / 3),
      };

export default function makeStyles({ width, isTablet, isDesktop, isCardMode }) {
  const large = isTablet || isDesktop;

  const maxWidth = isDesktop
    ? Math.min(1560, Math.round(width * 0.94))
    : isTablet
      ? Math.round(width * 0.96)
      : width;

  const gutter = isDesktop ? 22 : isTablet ? 16 : 13;

  const styles = StyleSheet.create({
    /* ── shell ─────────────────────────────────────────────────────── */
    screen: {
      flex: 1,
      backgroundColor: large ? PAGE : SURFACE,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      flex: 1,
      width: "100%",
      maxWidth,
      backgroundColor: SURFACE,
      borderRadius: large ? 20 : 0,
      marginVertical: isDesktop ? 16 : isTablet ? 10 : 0,
      overflow: "hidden",
      ...(large ? shadow(0.1, 28, 10) : null),
    },
    fill: { flex: 1, minWidth: 0 },
    cellFill: { width: "100%" },

    /* ── header ────────────────────────────────────────────────────── */
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: large ? 12 : 10,
      paddingHorizontal: gutter,
      paddingTop: large ? 14 : 11,
      paddingBottom: large ? 14 : 10,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    headerTitles: { flex: 1, minWidth: 0 },
    title: {
      fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: NAVY,
    },
    subtitle: {
      fontSize: isDesktop ? 13.5 : 12.5,
      fontWeight: "500",
      color: "#5A7391",
      marginTop: 2,
    },
    headerMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: large ? 10 : 8,
    },
    headerDivider: { width: 1, height: 24, backgroundColor: BORDER },
    levelPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    levelDot: { height: 6, width: 6, borderRadius: 3 },
    levelPillText: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    dirtyPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: ALERT_SOFT,
      borderWidth: 1,
      borderColor: ALERT_LINE,
    },
    dirtyDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: ALERT },
    dirtyText: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: ALERT,
    },
    savedPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: GREEN_SOFT,
      borderWidth: 1,
      borderColor: GREEN_LINE,
    },
    savedText: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: GREEN_DEEP,
    },
    dateWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
    dateText: { fontSize: 13.5, fontWeight: "600", color: "#334155" },

    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
    },
    iconBtnHover: { backgroundColor: FILL, borderColor: NAVY },
    iconBtnPressed: { backgroundColor: FILL_DEEP },
    iconBtnActive: { backgroundColor: NAVY_TINT, borderColor: NAVY },

    /* ── toolbar ───────────────────────────────────────────────────── */
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: gutter,
      paddingVertical: 12,
      zIndex: 20,
    },
    searchAnchor: { flex: 1, position: "relative", zIndex: 30 },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 11,
      backgroundColor: FILL,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
    },
    searchInput: {
      flex: 1,
      fontSize: 14.5,
      color: TEXT,
      paddingVertical: 0,
      ...noOutline,
    },
    addButton: {
      height: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: large ? 20 : 14,
      borderRadius: 11,
      backgroundColor: NAVY,
    },
    addButtonHover: { backgroundColor: NAVY_DEEP },
    addButtonPressed: { backgroundColor: NAVY_DEEP },
    addButtonText: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: SURFACE,
    },

    /* ── check progress strip (delivery shade) ─────────────────────── */
    checkStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: gutter,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: GREEN_SOFT,
      borderWidth: 1,
      borderColor: GREEN_LINE,
    },
    checkStripText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: "#245C3B",
    },
    checkStripLink: {
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: GREEN_DEEP,
    },

    /* ── search results ────────────────────────────────────────────── */
    results: {
      position: "absolute",
      top: 52,
      left: 0,
      right: 0,
      maxHeight: large ? 340 : 280,
      backgroundColor: SURFACE,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      overflow: "hidden",
      zIndex: 30,
      ...shadow(0.14, 24, 10),
    },
    resultCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      backgroundColor: SURFACE,
    },
    resultCardHover: { backgroundColor: NAVY_TINT },
    resultCardPressed: { backgroundColor: FILL_DEEP },
    resultIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: NAVY_TINT,
    },
    resultName: { fontSize: 14.5, fontWeight: "700", color: TEXT },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },
    chipText: { fontSize: 11, fontWeight: "600", color: MUTED },
    resultPriceWrap: { alignItems: "flex-end" },
    resultPrice: { fontSize: 14.5, fontWeight: "700", color: NAVY },
    resultPriceLabel: { fontSize: 10.5, color: FAINT, marginTop: 1 },
    resultEmpty: {
      padding: 18,
      fontSize: 13.5,
      color: FAINT,
      textAlign: "center",
    },
    resultLoading: { padding: 22, alignItems: "center", gap: 10 },
    resultLoadingText: { fontSize: 13, color: FAINT },

    /* ── scrollable body ───────────────────────────────────────────── */
    bodyScroll: { flex: 1 },
    bodyContent: { flexGrow: 1, paddingBottom: 4 },

    /* ── table ─────────────────────────────────────────────────────── */
    tableWrap: {
      paddingHorizontal: gutter,
      paddingTop: 12,
      paddingBottom: 2,
    },
    tableShell: {
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
    },
    tableHead: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 54,
      backgroundColor: NAVY,
    },
    headCellWrap: {
      paddingHorizontal: 9,
      paddingVertical: 8,
      justifyContent: "center",
      overflow: "hidden",
    },
    headCell: {
      fontSize: 11.5,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: SURFACE,
    },
    headCellSub: {
      fontSize: 10,
      fontWeight: "500",
      color: "#A8C6E4",
      marginTop: 2,
    },
    tableBody: { flexGrow: 1 },
    rowGroup: { borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 84,
      paddingVertical: 11,
      backgroundColor: SURFACE,
    },
    rowAlt: { backgroundColor: "#FAFCFE" },
    /* a row whose values moved since the last save */
    rowDirty: { backgroundColor: "#FFFBF7" },
    cellWrap: {
      paddingHorizontal: 9,
      justifyContent: "center",
      overflow: "hidden",
    },
    alignLeft: { alignItems: "flex-start" },
    alignCenter: { alignItems: "center" },
    alignRight: { alignItems: "flex-end" },

    /* ── cell content ──────────────────────────────────────────────── */
    snoText: { fontSize: 13, fontWeight: "700", color: "#7A8699" },
    plantName: { fontSize: 14.5, fontWeight: "700", color: TEXT },
    plantSub: { fontSize: 11.5, color: "#8A97A8", marginTop: 3 },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 5,
    },
    metaTag: {
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 5,
      backgroundColor: FILL_DEEP,
    },
    metaTagText: { fontSize: 10.5, fontWeight: "700", color: "#5A6B80" },
    /* the SPECIAL flag on barcode-scanned rows, shown inline in the table */
    specialTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 5,
      backgroundColor: NAVY_TINT,
      borderWidth: 1,
      borderColor: "#B7D3EE",
    },
    specialTagText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: NAVY,
    },
    /* an inline "changed" marker on a row, replacing the old reason strip */
    changeTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 5,
      backgroundColor: ALERT_SOFT,
      borderWidth: 1,
      borderColor: ALERT_LINE,
    },
    changeTagText: { fontSize: 10, fontWeight: "800", color: ALERT },
    cellText: { fontSize: 13.5, color: "#334155" },
    priceText: { fontSize: 13.5, fontWeight: "600", color: "#7A8699" },
    priceStrike: {
      fontSize: 11,
      color: FAINT,
      textDecorationLine: "line-through",
      marginTop: 2,
    },
    amountText: { fontSize: 14.5, fontWeight: "800", color: GREEN },
    dashText: { fontSize: 16, color: "#C3CDD9", fontWeight: "600" },

    /* ── read-only cells ───────────────────────────────────────────── */
    readValue: { fontSize: 13.5, fontWeight: "700", color: "#334155" },
    readSub: { fontSize: 11, color: FAINT, marginTop: 2 },
    readQty: { flexDirection: "row", alignItems: "baseline", gap: 5 },
    readQtyValue: {
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: TEXT,
    },
    readQtyUnit: { fontSize: 11, fontWeight: "600", color: FAINT },

    /* ── seedling maths ────────────────────────────────────────────── */
    calcCard: {
      width: "100%",
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: BLUE_CARD,
      borderWidth: 1,
      borderColor: BLUE_CARD_LINE,
      gap: 2,
    },
    calcLine: { fontSize: 11.5 },
    calcLabel: { fontSize: 11.5, fontWeight: "600", color: "#5B7CA0" },
    calcValue: { fontSize: 11.5, fontWeight: "700", color: BLUE_TEXT },
    calcValueStrong: { fontSize: 12, fontWeight: "800", color: BLUE_TEXT },
    calcMeta: { fontSize: 10.5, color: "#7B96B5", marginTop: 1 },
    calcMissing: { fontSize: 11, color: ALERT, textAlign: "center" },
    derivedHint: {
      fontSize: 10.5,
      fontWeight: "700",
      color: BLUE_TEXT,
      marginTop: 4,
    },

    /* ── in-row controls ───────────────────────────────────────────── */
    select: {
      width: "100%",
      height: 38,
      paddingHorizontal: 11,
      borderRadius: 9,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    selectHover: { borderColor: NAVY, backgroundColor: NAVY_TINT },
    selectPressed: { backgroundColor: FILL_DEEP },
    selectDisabled: { backgroundColor: FILL, borderColor: BORDER },
    selectText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#334155",
      flexShrink: 1,
    },
    selectPlaceholder: { fontSize: 13, color: FAINT, flexShrink: 1 },
    selectInvalid: { borderColor: ALERT, backgroundColor: "#FFF8F5" },

    qtyBox: {
      width: "100%",
      height: 38,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 9,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
      paddingHorizontal: 11,
      gap: 4,
    },
    qtyBoxWarn: { borderColor: ALERT, backgroundColor: "#FFF8F5" },
    qtyBoxDirty: { borderColor: ORANGE, backgroundColor: "#FFFAF4" },
    qtyInput: {
      flex: 1,
      height: "100%",
      fontSize: 15,
      fontWeight: "700",
      color: TEXT,
      paddingVertical: 0,
      ...noOutline,
    },
    qtyUnit: { fontSize: 11.5, fontWeight: "600", color: FAINT },
    qtyHint: { fontSize: 10.5, color: FAINT, marginTop: 4 },
    qtyHintMoved: {
      fontSize: 10.5,
      fontWeight: "700",
      color: ORANGE,
      marginTop: 4,
    },

    /* packing = type + charge in one column */
    packStack: { width: "100%", gap: 6 },
    chargeBox: {
      flexDirection: "row",
      alignItems: "center",
      height: 31,
      paddingHorizontal: 9,
      borderRadius: 8,
      backgroundColor: FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },
    chargeBoxManual: { backgroundColor: "#FFF3EA", borderColor: "#F6D6BC" },
    chargePrefix: { fontSize: 13, fontWeight: "700", color: "#5A6B80" },
    chargeInput: {
      flex: 1,
      height: "100%",
      fontSize: 13,
      fontWeight: "700",
      color: "#334155",
      paddingVertical: 0,
      paddingHorizontal: 3,
      ...noOutline,
    },
    chargeSuffix: { fontSize: 10.5, color: FAINT },
    chargeManualText: { color: ALERT },

    /* a catalogue packing's rate is fixed — shown as a plain label (no box,
       no border) instead of the editable charge box above */
    chargeLabelRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      height: 31,
      paddingHorizontal: 2,
    },
    chargeLabelValue: { fontSize: 13.5, fontWeight: "700", color: "#334155" },

    /* shown instead of the select+charge stack while a line is still at the
       "No packing" default — tapping it opens the same packing picker */
    addPackingBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      height: 38,
      paddingHorizontal: 10,
      borderRadius: 9,
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: BORDER_STRONG,
      borderStyle: "dashed",
    },
    addPackingBtnHover: { borderColor: NAVY, backgroundColor: NAVY_TINT },
    addPackingText: {
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.2,
      color: NAVY,
    },

    /* custom packing: free-text name field shown above the charge box */
    customNameBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: 31,
      paddingHorizontal: 9,
      borderRadius: 8,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
    },
    customNameBoxActive: {
      backgroundColor: "#FFF7F1",
      borderColor: ALERT_LINE,
    },
    customNameInput: {
      flex: 1,
      height: "100%",
      fontSize: 12.5,
      fontWeight: "700",
      color: "#334155",
      paddingVertical: 0,
      ...noOutline,
    },

    /* ── selected by customer: an inline Yes / No radio pair ────────── */
    radioRow: { flexDirection: "row", alignItems: "center", gap: 18 },
    /* single-column stack used in the table so the choice cell stays narrow
       and the grid never has to scroll sideways to fit it */
    radioColumn: { flexDirection: "column", alignItems: "flex-start", gap: 2 },
    radioItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingVertical: 4,
    },
    radioItemHover: { opacity: 0.8 },
    radioDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: BORDER_STRONG,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: SURFACE,
    },
    radioDotOn: { borderColor: NAVY },
    radioDotInner: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: NAVY,
    },
    radioLabel: { fontSize: 13, fontWeight: "600", color: MUTED },
    radioLabelOn: { color: TEXT, fontWeight: "800" },

    /* tick box used for the invoice check */
    check: {
      width: 24,
      height: 24,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: BORDER_STRONG,
    },
    checkOn: { backgroundColor: GREEN, borderColor: GREEN },
    checkHover: { borderColor: GREEN },
    checkPressed: { opacity: 0.75 },

    deleteBtn: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: RED_SOFT,
      borderWidth: 1,
      borderColor: RED_LINE,
    },
    deleteBtnHover: { backgroundColor: "#FBD5D5", borderColor: RED },
    deleteBtnPressed: { backgroundColor: "#F8C4C4" },
    /* delete + tick sit together in the action cell in delivery shade */
    actionStack: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    /* ── row card (narrow screens) ─────────────────────────────────────
       Kept deliberately tight — several cards should fit on one screen. */
    cardList: { padding: 9, gap: 7, flexGrow: 1 },
    lineCard: {
      borderRadius: 13,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      padding: 9,
      gap: 7,
      ...shadow(0.05, 6, 2),
    },
    lineCardChecked: { borderColor: GREEN_LINE, backgroundColor: "#FBFEFC" },
    lineCardDirty: { borderColor: ALERT_LINE, backgroundColor: "#FFFBF7" },
    lineCardSpecial: { borderColor: "#B7D3EE", backgroundColor: "#F6FAFF" },
    lineIndexSpecial: { backgroundColor: NAVY_TINT },
    lineCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
    lineIndex: {
      width: 22,
      height: 22,
      borderRadius: 7,
      backgroundColor: NAVY_TINT,
      alignItems: "center",
      justifyContent: "center",
    },
    lineIndexText: { fontSize: 11, fontWeight: "800", color: NAVY },
    /* Name, subtitle, price and tag flow together in one wrapping row
       instead of three stacked lines. */
    cardHeaderRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
    },
    plantNameInline: { maxWidth: "58%", flexShrink: 1 },
    plantSubInline: { fontSize: 11, color: "#8A97A8" },
    /* line total, tucked onto the end of the header row instead of its own
       footer band lower in the card */
    cardHeaderAmount: {
      marginLeft: "auto",
      fontSize: 15,
      fontWeight: "800",
      color: GREEN,
    },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    field: { flexGrow: 1, flexBasis: 150, minWidth: 140, gap: 4 },
    /* Unit / Qty / Packing / Selected-by-customer sit four-up in one row on
       a plant card; they wrap to fewer columns on very narrow screens. */
    fieldQuad: { flexGrow: 1, flexBasis: "22%", minWidth: 76, gap: 4 },
    /* The customer radios are content-width, not a stretchy input — letting
       them flexGrow like the others just leaves dead space to their right,
       so they stay compact and any extra row width goes to Unit/Qty/Packing
       instead. */
    fieldQuadTight: {
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: "auto",
      minWidth: 76,
      gap: 4,
    },
    fieldLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: MUTED,
      textTransform: "uppercase",
    },

    /* ── empty state ───────────────────────────────────────────────── */
    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 54,
      paddingHorizontal: 24,
      gap: 8,
      backgroundColor: SURFACE,
    },
    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: NAVY_TINT,
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
    emptyText: { fontSize: 13.5, color: FAINT, textAlign: "center" },

    /* ── banner ────────────────────────────────────────────────────── */
    sectionLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: MUTED,
      textTransform: "uppercase",
    },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: gutter,
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: ALERT_SOFT,
      borderWidth: 1,
      borderColor: ALERT_LINE,
    },
    bannerText: { flex: 1, fontSize: 13, color: ALERT },
    bannerOk: { backgroundColor: GREEN_SOFT, borderColor: GREEN_LINE },
    bannerOkText: { flex: 1, fontSize: 13, color: GREEN_DEEP },

    /* ── special plants (barcode) ──────────────────────────────────── */
    specialSection: {
      paddingHorizontal: gutter,
      paddingTop: 12,
      paddingBottom: 4,
      gap: 10,
    },
    specialHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    specialTitle: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.2,
      color: NAVY,
    },
    specialCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      ...shadow(0.04, 5, 2),
    },
    specialIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: NAVY_TINT,
    },

    /* ── audit history ─────────────────────────────────────────────── */
    auditSection: {
      paddingHorizontal: gutter,
      paddingTop: 12,
      paddingBottom: 4,
      gap: 10,
    },
    auditHead: { flexDirection: "row", alignItems: "center", gap: 8 },
    auditTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.2,
      color: NAVY,
    },
    auditToggleText: {
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: NAVY,
    },
    auditShell: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      overflow: "hidden",
      backgroundColor: SURFACE,
      maxHeight: 260,
    },
    auditHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 40,
      backgroundColor: FILL_DEEP,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    auditHeadCell: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: MUTED,
      textTransform: "uppercase",
    },
    auditRow: {
      flexDirection: isCardMode ? "column" : "row",
      alignItems: isCardMode ? "stretch" : "flex-start",
      gap: isCardMode ? 8 : 0,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
      backgroundColor: SURFACE,
    },
    auditRowAlt: { backgroundColor: "#FAFCFE" },
    auditCell: { paddingHorizontal: 13, justifyContent: "flex-start" },
    /* values updated */
    auditValueText: { fontSize: 13, fontWeight: "700", color: TEXT },
    /* reason, kept visually separate from the values */
    auditReasonText: { fontSize: 12.5, color: "#475569", lineHeight: 18 },
    auditReasonEmpty: { fontSize: 12.5, color: FAINT, fontStyle: "italic" },
    auditMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 5,
    },
    auditMetaText: { fontSize: 10.5, fontWeight: "600", color: FAINT },
    auditEmpty: {
      padding: 20,
      fontSize: 13,
      color: FAINT,
      textAlign: "center",
    },
    /* card-mode labels so the two columns stay distinguishable */
    auditCardLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: FAINT,
      textTransform: "uppercase",
      marginBottom: 3,
    },

    /* ── footer dock ───────────────────────────────────────────────── 
       Deliberately compact so the table above keeps most of the height. */
    footerDock: {
      paddingHorizontal: gutter,
      paddingTop: 9,
      paddingBottom: large ? 11 : 10,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      backgroundColor: SURFACE,
      ...(large ? null : shadow(0.06, 12, -4)),
    },

    /* ── quotation adjustments (transport + discount triggers) ───────
       On narrow (card-mode) screens these sit two-to-a-row instead of
       wrapping loosely, keeping the footer compact. */
    adjustBar: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
    },
    adjustAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: isCardMode ? "center" : "flex-start",
      flexGrow: isCardMode ? 1 : 0,
      flexBasis: isCardMode ? "47%" : undefined,
      gap: 7,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 9,
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: BORDER_STRONG,
      borderStyle: "dashed",
    },
    adjustAddBtnHover: { borderColor: NAVY, backgroundColor: NAVY_TINT },
    adjustAddText: {
      flexShrink: 1,
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.2,
      color: NAVY,
    },
    adjustChip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: isCardMode ? "center" : "flex-start",
      flexGrow: isCardMode ? 1 : 0,
      flexBasis: isCardMode ? "47%" : undefined,
      gap: 7,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 9,
      backgroundColor: NAVY_TINT,
      borderWidth: 1,
      borderColor: "#B7D3EE",
    },
    adjustChipHover: { borderColor: NAVY },
    adjustChipText: {
      flexShrink: 1,
      fontSize: 12.5,
      fontWeight: "800",
      color: NAVY,
    },

    moneyReadBar: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 14,
      paddingVertical: 4,
    },
    moneyReadItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    moneyReadText: { fontSize: 13, fontWeight: "600", color: "#334155" },

    /* On large screens the metric strip and the buttons share one row.
       The metric strip itself lays its items out horizontally so the whole
       footer stays a slim band (see reference image 2). */
    footerRow: {
      flexDirection: large ? "row" : "column",
      alignItems: large ? "center" : "stretch",
      gap: 12,
    },
    /* A consistent two-column grid, always — plant types / quantity / packing
       / special / transport / discount / advance / grand total / remaining
       all behave as identically-sized cells that wrap onto new rows, so the
       strip reads as one aligned grid instead of a line that reflows
       differently depending on how many optional totals are present. */
    metricStrip: {
      flex: large ? 1 : undefined,
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 12,
      columnGap: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 11,
      backgroundColor: FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },
    metric: {
      flexGrow: 1,
      flexBasis: "40%",
      minWidth: 110,
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: MUTED,
      textTransform: "uppercase",
    },
    metricValue: {
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: TEXT,
      marginTop: 2,
    },
    metricUnit: { fontSize: 9.5, color: FAINT, marginTop: 0 },
    metricWarm: { color: ORANGE },
    metricDiscount: { color: GREEN },
    /* grand total / remaining are the same grid cell, just with bolder text */
    metricGrand: { alignItems: "flex-start" },
    metricGrandLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: MUTED,
      textTransform: "uppercase",
    },
    metricGrandValue: {
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: GREEN,
      marginTop: 1,
    },
    /* remaining-to-collect, shown once an advance is set — same grid cell */
    metricRemaining: { alignItems: "flex-start" },
    metricRemainingLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: MUTED,
      textTransform: "uppercase",
    },
    metricRemainingValue: {
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: ORANGE,
      marginTop: 1,
    },

    /* ── buttons ───────────────────────────────────────────────────── 
       Shorter than before so the whole footer stays compact. */
    actionRow: {
      flexDirection: isCardMode ? "column" : "row",
      alignItems: "stretch",
      gap: 10,
    },
    ghostButton: {
      minWidth: large ? 150 : undefined,
      height: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      paddingHorizontal: 16,
      borderRadius: 11,
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: NAVY,
    },
    ghostButtonHover: { backgroundColor: NAVY_TINT },
    ghostButtonDisabled: { borderColor: BORDER_STRONG, backgroundColor: FILL },
    ghostTitle: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: NAVY,
    },
    ghostTitleDisabled: { color: "#9CA9B8" },

    primaryButton: {
      minWidth: large ? 220 : undefined,
      height: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      paddingHorizontal: 20,
      borderRadius: 11,
      backgroundColor: NAVY,
    },
    primaryButtonHover: { backgroundColor: NAVY_DEEP },
    primaryButtonDisabled: { backgroundColor: "#A8BACB" },
    invoiceButton: { backgroundColor: GREEN },
    invoiceButtonHover: { backgroundColor: GREEN_DEEP },
    primaryTitle: {
      fontSize: 13.5,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: SURFACE,
    },
    saveHint: {
      fontSize: 11,
      color: MUTED,
      textAlign: large ? "right" : "center",
    },

    /* ── compact portrait grid ────────────────────────────────────────
       Below the `large` breakpoint the metrics and the action buttons are
       laid out as one fixed 4-column grid instead of a tall stack, so the
       whole footer reads as two rows (see reference photo) no matter how
       many optional totals (special / transport / discount / advance) are
       showing. */
    metricGridBox: {
      flexDirection: "row",
      flexWrap: "wrap",
      borderRadius: 11,
      backgroundColor: FILL,
      borderWidth: 1,
      borderColor: BORDER,
      overflow: "hidden",
    },
    metricGridCell: {
      width: "25%",
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRightWidth: 1,
      borderRightColor: BORDER,
      borderTopWidth: 1,
      borderTopColor: BORDER,
    },
    metricGridLabel: {
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.2,
      color: MUTED,
      textTransform: "uppercase",
      textAlign: "center",
    },
    metricGridValue: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: -0.2,
      color: TEXT,
      marginTop: 2,
      textAlign: "center",
    },
    metricGridValueGrand: { fontSize: 13, color: GREEN },
    metricGridValueRemaining: { color: ORANGE },
    metricGridUnit: { fontSize: 7.5, color: FAINT, textAlign: "center" },
    metricGridBtn: {
      width: "100%",
      height: "100%",
      minHeight: 56,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingHorizontal: 4,
      paddingVertical: 6,
    },
    metricGridBtnGhost: { backgroundColor: SURFACE },
    metricGridBtnPrimary: { backgroundColor: NAVY },
    metricGridBtnInvoice: { backgroundColor: GREEN },
    metricGridBtnDisabled: { backgroundColor: "#DDE3EA" },
    metricGridBtnLabel: {
      fontSize: 8.5,
      fontWeight: "800",
      letterSpacing: 0.2,
      textAlign: "center",
    },

    /* ── sheets ────────────────────────────────────────────────────── */
    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.45)",
      justifyContent: large ? "center" : "flex-end",
      alignItems: "center",
      padding: large ? 24 : 0,
    },
    sheet: {
      width: "100%",
      maxWidth: large ? 500 : undefined,
      maxHeight: "72%",
      backgroundColor: SURFACE,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomLeftRadius: large ? 18 : 0,
      borderBottomRightRadius: large ? 18 : 0,
      paddingBottom: large ? 8 : 20,
      overflow: "hidden",
    },
    sheetHeader: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 13,
      gap: 3,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    sheetTitle: { fontSize: 16.5, fontWeight: "800", color: NAVY },
    sheetSubtitle: { fontSize: 12.5, color: FAINT },
    optionRow: {
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    optionRowHover: { backgroundColor: FILL },
    optionRowActive: { backgroundColor: NAVY_TINT },
    optionText: { fontSize: 14.5, color: TEXT },
    optionTextActive: { fontWeight: "800", color: NAVY },
    optionMeta: { fontSize: 12, color: FAINT, marginTop: 2 },
    optionBadge: { fontSize: 13, fontWeight: "800", color: GREEN },
    optionLead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    optionIcon: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: FILL_DEEP,
    },
    optionIconCustom: { backgroundColor: ALERT_SOFT },

    loadingWrap: { padding: 32, alignItems: "center", gap: 12 },
    loadingText: { fontSize: 14, color: FAINT },

    /* ── charge modals (transport / discount editors) ──────────────── */
    adjustBody: { paddingHorizontal: 20, paddingVertical: 17, gap: 18 },
    adjustField: { gap: 8 },
    moneyHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    moneyLabel: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
      color: NAVY,
      textTransform: "uppercase",
    },
    chargeBoxLg: {
      flexDirection: "row",
      alignItems: "center",
      height: 48,
      paddingHorizontal: 13,
      borderRadius: 11,
      backgroundColor: FILL,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
      gap: 4,
    },
    chargePrefixLg: { fontSize: 15, fontWeight: "800", color: "#5A6B80" },
    chargeInputLg: {
      flex: 1,
      height: "100%",
      fontSize: 17,
      fontWeight: "800",
      color: TEXT,
      paddingVertical: 0,
      paddingHorizontal: 4,
      ...noOutline,
    },
    chargeSuffixLg: { fontSize: 11.5, color: FAINT },
    discountRemarkInput: {
      minHeight: 64,
      borderRadius: 11,
      backgroundColor: FILL,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: TEXT,
      textAlignVertical: "top",
      ...noOutline,
    },
    discountRemarkInputError: {
      borderColor: ALERT,
      backgroundColor: "#FFF8F4",
    },
    adjustError: { fontSize: 11.5, fontWeight: "700", color: ALERT },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: large ? 14 : 20,
    },
    modalCancel: {
      flex: 1,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: NAVY,
    },
    modalCancelText: {
      fontSize: 13.5,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: NAVY,
    },
    modalApply: {
      flex: 1.4,
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 12,
      backgroundColor: NAVY,
    },
    modalApplyText: {
      fontSize: 13.5,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: SURFACE,
    },

    /* ── close confirmation (unsaved changes) ───────────────────────── */
    confirmActions: {
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: large ? 16 : 22,
    },
    confirmPrimaryBtn: {
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 12,
      backgroundColor: NAVY,
    },
    confirmPrimaryText: {
      fontSize: 13.5,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: SURFACE,
    },
    confirmDangerBtn: {
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: RED_SOFT,
      borderWidth: 1.5,
      borderColor: RED_LINE,
    },
    confirmDangerBtnHover: { backgroundColor: "#FBD5D5", borderColor: RED },
    confirmDangerText: {
      fontSize: 13.5,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: RED,
    },
    confirmGhostBtn: {
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmGhostText: { fontSize: 13, fontWeight: "700", color: MUTED },

    /* Taller variants used only by the reason modals (FieldReasonModal /
       DeleteReasonModal) — those buttons sit at the end of a long scrollable
       form and read better with more tap-target height.
       reasonActions stacks these in a column on narrow screens, where `flex`
       would apply its 0% flex-basis to the main (vertical) axis and collapse
       the explicit height — proportioned by the grow ratio instead of both
       buttons sharing the same 56px. Use width:100% there instead, and only
       let them share a row's width via `flex` when they're laid out in a row. */
    reasonCancelBtn: {
      ...(isCardMode ? { width: "100%" } : { flex: 1 }),
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: NAVY,
    },
    reasonApplyBtn: {
      ...(isCardMode ? { width: "100%" } : { flex: 1.4 }),
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 13,
      backgroundColor: NAVY,
    },

    /* ── reason modal ──────────────────────────────────────────────────
       Wider than the other sheets and scrollable, because it carries the
       whole "values updated" summary above the text area. */
    reasonSheet: {
      width: "100%",
      maxWidth: large ? 620 : undefined,
      maxHeight: large ? "86%" : "84%",
      backgroundColor: SURFACE,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomLeftRadius: large ? 20 : 0,
      borderBottomRightRadius: large ? 20 : 0,
      overflow: "hidden",
      ...shadow(0.2, 34, 14),
    },
    /* Wraps the backdrop so the keyboard pushes the sheet up on iOS instead
       of covering it — without this the action buttons can end up hidden
       behind the keyboard on short screens. */
    reasonKav: { flex: 1 },
    /* Lets the scrollable body shrink to fit between the header and the
       action row instead of overflowing past reasonSheet's maxHeight, which
       otherwise clips CANCEL / SAVE REASON off the bottom on small screens. */
    reasonScrollArea: { flexShrink: 1, minHeight: 0 },
    reasonHeader: {
      flexShrink: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    reasonHeaderIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: ALERT_SOFT,
      borderWidth: 1,
      borderColor: ALERT_LINE,
    },
    reasonHeaderText: { flex: 1, minWidth: 0, gap: 3 },
    reasonTitle: {
      fontSize: 17.5,
      fontWeight: "800",
      letterSpacing: -0.2,
      color: TEXT,
    },
    reasonSubtitle: { fontSize: 12.5, color: MUTED, lineHeight: 17 },

    reasonBody: { paddingHorizontal: 22, paddingVertical: 18, gap: 18 },
    reasonBlock: { gap: 9 },
    reasonBlockHead: { flexDirection: "row", alignItems: "center", gap: 7 },
    reasonBlockLabel: {
      flex: 1,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: NAVY,
      textTransform: "uppercase",
    },
    reasonCountTag: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 999,
      backgroundColor: NAVY_TINT,
    },
    reasonCountText: { fontSize: 10.5, fontWeight: "800", color: NAVY },

    /* the "values updated" list */
    changeList: {
      borderRadius: 13,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: FILL,
      overflow: "hidden",
      maxHeight: 220,
    },
    changeRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: "#E9EEF5",
    },
    changeRowLast: { borderBottomWidth: 0 },
    changeIcon: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER,
      marginTop: 1,
    },
    changeIconAdd: { backgroundColor: GREEN_SOFT, borderColor: GREEN_LINE },
    changeIconRemove: { backgroundColor: RED_SOFT, borderColor: RED_LINE },
    changeIconEdit: { backgroundColor: ALERT_SOFT, borderColor: ALERT_LINE },
    changeBody: { flex: 1, minWidth: 0 },
    changeTitle: { fontSize: 13.5, fontWeight: "700", color: TEXT },
    changeDetail: { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },
    changeFromTo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginTop: 5,
    },
    changeFrom: {
      fontSize: 12,
      fontWeight: "700",
      color: MUTED,
      textDecorationLine: "line-through",
    },
    changeTo: { fontSize: 12.5, fontWeight: "800", color: NAVY },

    /* the reason text area: deliberately large */
    reasonInputLg: {
      minHeight: large ? 128 : 108,
      borderRadius: 13,
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: BORDER_STRONG,
      paddingHorizontal: 15,
      paddingVertical: 13,
      fontSize: 14.5,
      lineHeight: 21,
      color: TEXT,
      textAlignVertical: "top",
      ...noOutline,
    },
    reasonInputLgFocus: { borderColor: NAVY },
    reasonInputLgError: { borderColor: ALERT, backgroundColor: "#FFF8F4" },
    /* one of these sits under every per-plant / per-adjustment change group,
       so it stays compact even when several are stacked in the same modal */
    reasonInputCompact: {
      minHeight: 64,
      borderRadius: 12,
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: BORDER_STRONG,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 13.5,
      lineHeight: 19,
      color: TEXT,
      textAlignVertical: "top",
      ...noOutline,
    },
    reasonFootRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    reasonHelp: { flex: 1, fontSize: 11.5, color: FAINT },
    reasonHelpError: {
      flex: 1,
      fontSize: 11.5,
      fontWeight: "700",
      color: ALERT,
    },
    reasonCounter: { fontSize: 11, fontWeight: "700", color: FAINT },

    /* quick-pick reason chips */
    reasonChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    reasonChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
    },
    reasonChipHover: { borderColor: NAVY, backgroundColor: NAVY_TINT },
    reasonChipText: { fontSize: 12, fontWeight: "700", color: "#475569" },

    reasonActions: {
      flexShrink: 0,
      flexDirection: isCardMode ? "column-reverse" : "row",
      gap: 10,
      paddingHorizontal: 22,
      paddingTop: 14,
      paddingBottom: large ? 18 : 22,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      backgroundColor: SURFACE,
    },

    /* ── pdf sheet ─────────────────────────────────────────────────── */
    pdfSheet: {
      maxWidth: large ? 420 : undefined,
      alignItems: "center",
      paddingHorizontal: 22,
      paddingTop: 26,
      paddingBottom: large ? 22 : 28,
      gap: 6,
    },
    pdfIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: GREEN_SOFT,
      borderWidth: 1,
      borderColor: GREEN_LINE,
      marginBottom: 6,
    },
    pdfTitle: { fontSize: 17.5, fontWeight: "800", color: TEXT },
    pdfText: { fontSize: 12.5, color: FAINT, textAlign: "center" },
    pdfActions: { width: "100%", gap: 10, marginTop: 16 },
    pdfBtn: {
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderRadius: 12,
    },
    pdfBtnWhats: { backgroundColor: WHATSAPP },
    pdfBtnWhatsHover: { backgroundColor: WHATSAPP_DEEP },
    pdfBtnGhost: {
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: NAVY,
    },
    pdfBtnGhostHover: { backgroundColor: NAVY_TINT },
    pdfBtnText: {
      fontSize: 13.5,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: SURFACE,
    },
    pdfBtnGhostText: { color: NAVY },
    pdfDone: { paddingVertical: 14 },
    pdfDoneText: { fontSize: 13.5, fontWeight: "700", color: MUTED },

    /*
     * Add these keys to the object returned by makeStyles() in Edit.styles.js.
     * They back the two new pieces of UI:
     *   - adjustChipLocked : the greyed-out, non-tappable advance chip when the
     *     advance was collected on an earlier day (locked).
     *   - staleBar / staleText / staleButton* : the "loaded on an earlier day"
     *     banner shown at the top of the body when fetchDate is not today.
     *
     * Colour references (C.*) assume your existing palette exposes NAVY, MUTED,
     * ALERT and a light surface. Swap them for whatever your palette already uses.
     */

    // ── locked advance chip ────────────────────────────────────────────────
    adjustChipLocked: {
      opacity: 0.6,
      backgroundColor: "#F1F5F9",
      borderColor: "#E2E8F0",
    },

    // ── stale-data banner ──────────────────────────────────────────────────
    staleBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#F6D6A8", // warm amber border
      backgroundColor: "#FEF6E7", // warm amber surface
    },
    staleText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: "#8A5A00",
      fontWeight: "500",
    },
    staleButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: "#CBD5E1",
      backgroundColor: "#FFFFFF",
    },
    staleButtonHover: {
      backgroundColor: "#F8FAFC",
      borderColor: "#94A3B8",
    },
    staleButtonText: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.4,
      color: "#0F4776", // NAVY
    },
  });

  styles.iconSize = large ? 20 : 18;
  styles.isLarge = large;
  styles.isCardMode = isCardMode;
  styles.gutter = gutter;
  styles.colors = {
    NAVY,
    NAVY_DEEP,
    GREEN,
    GREEN_DEEP,
    ORANGE,
    ALERT,
    RED,
    MUTED,
    FAINT,
    BLUE_TEXT,
    BORDER,
  };

  return styles;
}
