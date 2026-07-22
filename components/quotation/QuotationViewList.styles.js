import { Platform, StyleSheet } from "react-native";

/* ── palette ─────────────────────────────────────────────────────────────
   Kept the existing brand navy / orange / green, but rebalanced the neutrals
   so the table reads as a document rather than a grid of boxes.            */
const NAVY = "#0F4776";
const NAVY_TINT = "#EAF1F8";
const ORANGE = "#E8622C";
const GREEN = "#5B8E2E";

const SURFACE = "#FFFFFF";
const CANVAS = "#F2F5F9";
const INPUT_FILL = "#F6F8FB";
const HEAD_FILL = "#F8FAFC";
const BORDER = "#E3E9F1";
const GRID = "#EFF3F8";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const PLACEHOLDER = "#94A3B8";

const softShadow = Platform.select({
  web: {
    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
  },
  default: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

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

const makeStyles = ({ width, isTablet, isDesktop, isCardMode }) => {
  const large = isTablet || isDesktop;
  const gutter = isDesktop ? 24 : isTablet ? 16 : 12;
  const controlHeight = large ? 46 : 44;

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      width: "100%",
      backgroundColor: CANVAS,
      padding: gutter,
    },
    shell: {
      flex: 1,
      width: "100%",
      maxWidth: 1440,
      alignSelf: "center",
      backgroundColor: SURFACE,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: BORDER,
      overflow: "hidden",
      ...softShadow,
    },

    /* ── header ── */
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: large ? 20 : 14,
      paddingVertical: large ? 16 : 14,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    headerIcon: {
      height: 42,
      width: 42,
      borderRadius: 12,
      backgroundColor: NAVY_TINT,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    headerTitle: {
      fontSize: large ? 21 : 18,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: NAVY,
    },
    headerSub: {
      fontSize: 13,
      color: MUTED,
    },
    primaryButton: {
      height: controlHeight,
      paddingHorizontal: large ? 18 : 14,
      borderRadius: 10,
      backgroundColor: NAVY,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    primaryButtonText: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: "#FFFFFF",
    },

    /* ── toolbar ── */
    toolbar: {
      paddingHorizontal: large ? 20 : 14,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    searchWrap: {
      height: controlHeight,
      borderRadius: 10,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14.5,
      color: TEXT,
      outlineStyle: "none",
    },

    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },
    filterPillActive: {
      backgroundColor: NAVY,
      borderColor: NAVY,
    },
    filterPillText: {
      fontSize: 12.5,
      fontWeight: "700",
      color: MUTED,
    },
    filterPillTextActive: {
      color: "#FFFFFF",
    },
    resultCount: {
      marginLeft: "auto",
      fontSize: 11.5,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: "#475569",
      textTransform: "uppercase",
    },

    /* ── table ── */
    tableWrap: {
      flex: 1,
      width: "100%",
    },
    tableHead: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 40,
      paddingHorizontal: large ? 20 : 14,
      backgroundColor: HEAD_FILL,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    headCell: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: "#526278",
      textTransform: "uppercase",
    },

    listContent: {
      flexGrow: 1,
      paddingBottom: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 62,
      paddingHorizontal: large ? 20 : 14,
      borderBottomWidth: 1,
      borderBottomColor: GRID,
      backgroundColor: SURFACE,
    },
    rowOpen: {
      backgroundColor: "#F7FAFD",
      borderBottomColor: "transparent",
    },
    rowPressed: {
      backgroundColor: "#F1F6FB",
    },

    cellWrap: {
      paddingRight: 10,
      justifyContent: "center",
    },
    alignLeft: { alignItems: "flex-start" },
    alignCenter: { alignItems: "center" },
    alignRight: { alignItems: "flex-end" },

    expandBtn: {
      height: 26,
      width: 26,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    expandBtnOpen: {
      backgroundColor: NAVY_TINT,
    },

    stack: { width: "100%", gap: 2 },

    cell: {
      fontSize: 13,
      lineHeight: 17,
      color: "#475569",
    },
    cellStrong: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "700",
      color: TEXT,
    },
    cellSub: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "600",
      color: PLACEHOLDER,
      letterSpacing: 0.2,
    },
    amount: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      color: NAVY,
      textAlign: "right",
      fontVariant: ["tabular-nums"],
    },
    snoText: {
      fontSize: 12.5,
      fontWeight: "700",
      color: MUTED,
    },

    levelPill: {
      maxWidth: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    levelDot: {
      height: 6,
      width: 6,
      borderRadius: 3,
    },
    levelPillText: {
      fontSize: 9.5,
      lineHeight: 13,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },

    actionCell: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    actionBtn: {
      height: 30,
      width: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },

    /* ── expandable panel ── */
    panel: {
      width: "100%",
      backgroundColor: "#F7FAFD",
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
      paddingHorizontal: large ? 20 : 14,
      paddingBottom: 14,
    },
    panelInner: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 14,
      columnGap: 22,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER,
    },
    stat: {
      gap: 3,
      minWidth: 104,
    },
    statLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: "#7C8CA1",
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: 16,
      fontWeight: "800",
      color: TEXT,
    },
    statValueAccent: { color: NAVY },
    statText: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "600",
      color: TEXT,
    },

    /* ── card mode (phones) ── */
    cardList: {
      padding: 12,
      gap: 10,
      flexGrow: 1,
    },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      padding: 14,
      gap: 12,
      ...cardShadow,
    },
    cardPressed: { backgroundColor: "#F7FAFD" },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    cardName: {
      fontSize: 15,
      fontWeight: "800",
      color: TEXT,
    },
    cardMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 18,
      rowGap: 10,
    },
    cardMeta: { gap: 2, minWidth: 92 },
    cardAmount: {
      fontSize: 16,
      fontWeight: "800",
      color: NAVY,
      fontVariant: ["tabular-nums"],
    },
    cardActions: {
      flexDirection: "row",
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: GRID,
    },
    cardActionBtn: {
      flex: 1,
      height: 38,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 9,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },
    cardActionText: {
      fontSize: 12.5,
      fontWeight: "700",
      color: NAVY,
    },

    /* ── states ── */
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingVertical: 60,
    },
    loadingText: {
      fontSize: 14,
      color: PLACEHOLDER,
    },
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
    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: TEXT,
    },
    emptyText: {
      fontSize: 14,
      color: MUTED,
      textAlign: "center",
      maxWidth: 320,
      lineHeight: 20,
    },
    emptyAction: {
      marginTop: 14,
      height: controlHeight,
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

  /* plain values the component reads directly */
  styles.iconSize = 19;
  styles.gutter = large ? 20 : 14;
  styles.isCardMode = isCardMode;
  styles.colors = { NAVY, ORANGE, GREEN, MUTED, PLACEHOLDER, BORDER, TEXT };

  return styles;
};

export default makeStyles;
