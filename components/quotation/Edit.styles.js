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

  const gutter = isDesktop ? 20 : isTablet ? 14 : 12;

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
      paddingTop: large ? 14 : 12,
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
      paddingHorizontal: 10,
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
    /* unsaved marker sits next to the level so both read as status */
    dirtyPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
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
      paddingVertical: 10,
      borderRadius: 11,
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

    /* ── table ─────────────────────────────────────────────────────── */
    tableWrap: {
      flex: 1,
      paddingHorizontal: gutter,
      paddingTop: 12,
      paddingBottom: 2,
    },
    tableShell: {
      flex: 1,
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
      paddingHorizontal: 8,
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
    /* a row plus its reason strip travel together */
    rowGroup: { borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 84,
      paddingVertical: 10,
      backgroundColor: SURFACE,
    },
    rowAlt: { backgroundColor: "#FAFCFE" },
    cellWrap: {
      paddingHorizontal: 8,
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
      gap: 6,
      marginTop: 4,
    },
    metaTag: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
      backgroundColor: FILL_DEEP,
    },
    metaTagText: { fontSize: 10.5, fontWeight: "700", color: "#5A6B80" },
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

    /* ── read-only cells (delivery shade and later) ────────────────── */
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
      paddingHorizontal: 10,
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
      paddingHorizontal: 10,
      gap: 4,
    },
    qtyBoxWarn: { borderColor: ALERT, backgroundColor: "#FFF8F5" },
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
    qtyHintWarn: {
      fontSize: 10.5,
      fontWeight: "700",
      color: ALERT,
      marginTop: 4,
    },

    /* packing = type + charge in one column */
    packStack: { width: "100%", gap: 5 },
    chargeBox: {
      flexDirection: "row",
      alignItems: "center",
      height: 30,
      paddingHorizontal: 8,
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

    /* selected by customer */
    choiceToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      height: 34,
      paddingHorizontal: 10,
      borderRadius: 9,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
    },
    choiceToggleOn: { backgroundColor: NAVY_TINT, borderColor: "#B7D3EE" },
    choiceToggleHover: { borderColor: NAVY },
    choicePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    choiceOn: { backgroundColor: NAVY_TINT, borderColor: "#B7D3EE" },
    choiceOff: { backgroundColor: FILL, borderColor: BORDER },
    choiceText: { fontSize: 11.5, fontWeight: "700" },
    choiceTextOn: { color: NAVY },
    choiceTextOff: { color: MUTED },

    /* tick box used for the invoice check and the select-all header */
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

    /* ── per-row reason ────────────────────────────────────────────── */
    reasonStrip: {
      flexDirection: isCardMode ? "column" : "row",
      alignItems: isCardMode ? "stretch" : "center",
      gap: 10,
      paddingHorizontal: isCardMode ? 0 : 14,
      paddingVertical: 10,
      backgroundColor: isCardMode ? "transparent" : "#FFF9F5",
      borderTopWidth: isCardMode ? 1 : 0,
      borderTopColor: BORDER,
    },
    reasonStripError: {
      backgroundColor: isCardMode ? "transparent" : ALERT_SOFT,
    },
    reasonTag: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: ALERT_SOFT,
      borderWidth: 1,
      borderColor: ALERT_LINE,
    },
    reasonTagText: { fontSize: 11, fontWeight: "800", color: ALERT },
    reasonInput: {
      flex: isCardMode ? undefined : 1,
      height: 36,
      borderRadius: 9,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER_STRONG,
      paddingHorizontal: 12,
      fontSize: 13,
      color: TEXT,
      ...noOutline,
    },
    reasonInputError: { borderColor: ALERT, backgroundColor: "#FFF8F4" },

    /* ── row card (narrow screens) ─────────────────────────────────── */
    cardList: { padding: 12, gap: 10, flexGrow: 1 },
    lineCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      padding: 14,
      gap: 12,
      ...shadow(0.05, 6, 2),
    },
    lineCardChecked: { borderColor: GREEN_LINE, backgroundColor: "#FBFEFC" },
    lineCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    lineIndex: {
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor: NAVY_TINT,
      alignItems: "center",
      justifyContent: "center",
    },
    lineIndexText: { fontSize: 12, fontWeight: "800", color: NAVY },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    field: { flexGrow: 1, flexBasis: 150, minWidth: 140, gap: 5 },
    fieldLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: MUTED,
      textTransform: "uppercase",
    },
    lineFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: BORDER,
    },
    lineTotalLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: MUTED,
      textTransform: "uppercase",
    },
    lineTotal: { fontSize: 17, fontWeight: "800", color: GREEN },

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
      padding: 11,
      borderRadius: 11,
      backgroundColor: ALERT_SOFT,
      borderWidth: 1,
      borderColor: ALERT_LINE,
    },
    bannerText: { flex: 1, fontSize: 13, color: ALERT },

    /* ── footer dock ───────────────────────────────────────────────── */
    footerDock: {
      paddingHorizontal: gutter,
      paddingTop: 12,
      paddingBottom: large ? 14 : 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      backgroundColor: SURFACE,
      ...(large ? null : shadow(0.06, 12, -4)),
    },
    footerRow: {
      flexDirection: large ? "row" : "column",
      alignItems: large ? "center" : "stretch",
      gap: 12,
    },
    /* metrics read as a ledger strip — no boxes to squeeze labels into */
    metricStrip: {
      flex: large ? 1 : undefined,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      rowGap: 10,
      columnGap: 18,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },
    metric: { minWidth: 74 },
    metricLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: MUTED,
      textTransform: "uppercase",
    },
    metricValue: {
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: TEXT,
      marginTop: 3,
    },
    metricUnit: { fontSize: 10.5, color: FAINT, marginTop: 1 },
    metricDivider: { width: 1, alignSelf: "stretch", backgroundColor: BORDER },
    metricGrand: {
      paddingLeft: 14,
      marginLeft: "auto",
      borderLeftWidth: 1,
      borderLeftColor: BORDER,
      minWidth: 120,
    },
    metricGrandValue: {
      fontSize: 21,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: GREEN,
      marginTop: 3,
    },
    metricWarm: { color: ORANGE },

    /* ── buttons ───────────────────────────────────────────────────── */
    actionRow: {
      flexDirection: isCardMode ? "column" : "row",
      alignItems: "stretch",
      gap: 10,
    },
    ghostButton: {
      minWidth: large ? 180 : undefined,
      height: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: SURFACE,
      borderWidth: 1.5,
      borderColor: NAVY,
    },
    ghostButtonHover: { backgroundColor: NAVY_TINT },
    ghostButtonDisabled: { borderColor: BORDER_STRONG, backgroundColor: FILL },
    ghostTitle: {
      fontSize: 13.5,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: NAVY,
    },
    ghostTitleDisabled: { color: "#9CA9B8" },

    primaryButton: {
      minWidth: large ? 250 : undefined,
      height: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 22,
      borderRadius: 12,
      backgroundColor: NAVY,
    },
    primaryButtonHover: { backgroundColor: NAVY_DEEP },
    primaryButtonDisabled: { backgroundColor: "#A8BACB" },
    invoiceButton: { backgroundColor: GREEN },
    invoiceButtonHover: { backgroundColor: GREEN_DEEP },
    primaryTitle: {
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: SURFACE,
    },
    saveHint: {
      fontSize: 11.5,
      color: MUTED,
      textAlign: large ? "right" : "center",
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
      paddingBottom: 12,
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

    loadingWrap: { padding: 32, alignItems: "center", gap: 12 },
    loadingText: { fontSize: 14, color: FAINT },

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
  });

  styles.iconSize = large ? 20 : 18;
  styles.isLarge = large;
  styles.isCardMode = isCardMode;
  styles.gutter = gutter;
  styles.colors = { NAVY, GREEN, ALERT, RED, MUTED, FAINT, BLUE_TEXT };

  return styles;
}
