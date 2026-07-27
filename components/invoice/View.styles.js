import { Platform, StyleSheet } from "react-native";

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

const barShadow = Platform.select({
  web: { boxShadow: "0 -2px 12px rgba(15,23,42,0.06)" },
  default: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
});

const sheetShadow = Platform.select({
  web: { boxShadow: "0 10px 40px rgba(15,23,42,0.24)" },
  default: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
});

const makeStyles = ({ width, isTablet, isDesktop, isCardMode }) => {
  const large = isTablet || isDesktop;
  const pad = large ? 20 : 14;

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: CANVAS,
    },

    /* ── header ── */
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: pad,
      paddingVertical: large ? 14 : 12,
      backgroundColor: SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    closeBtn: {
      height: 40,
      width: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: NAVY_TINT,
    },
    headerText: { flex: 1, gap: 2 },
    headerTitle: {
      fontSize: large ? 19 : 16.5,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: TEXT,
    },
    headerMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    headerSub: {
      fontSize: 12.5,
      fontWeight: "600",
      color: MUTED,
    },
    headerDot: { color: PLACEHOLDER, fontSize: 12 },
    headerBadges: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    pillDot: { height: 6, width: 6, borderRadius: 3 },
    pillText: {
      fontSize: 9.5,
      lineHeight: 13,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },

    /* ── scroll body ── */
    scroll: { flex: 1 },
    scrollContent: {
      padding: pad,
      paddingBottom: 24,
      gap: 14,
      maxWidth: 1120,
      width: "100%",
      alignSelf: "center",
    },

    /* ── summary ── */
    summary: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: SURFACE,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: BORDER,
      paddingVertical: 16,
      paddingHorizontal: 8,
    },
    summaryCell: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    summaryDivider: {
      width: 1,
      alignSelf: "stretch",
      marginVertical: 4,
      backgroundColor: BORDER,
    },
    summaryLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: "#7C8CA1",
      textTransform: "uppercase",
    },
    summaryValue: {
      fontSize: large ? 19 : 16.5,
      fontWeight: "800",
      color: TEXT,
      fontVariant: ["tabular-nums"],
    },

    /* ── meta strip ── */
    metaStrip: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 12,
      columnGap: 20,
      backgroundColor: SURFACE,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      padding: 14,
    },
    metaCell: { gap: 2, minWidth: 96 },
    metaLabel: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: "#7C8CA1",
      textTransform: "uppercase",
    },
    metaText: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "600",
      color: TEXT,
    },

    /* ── error banner ── */
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#FDF2EC",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#F6D2C0",
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: "#9A3B12",
    },

    /* ── section ── */
    section: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: BORDER,
      overflow: "hidden",
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: NAVY,
      letterSpacing: -0.2,
    },
    sectionCount: {
      fontSize: 11,
      fontWeight: "800",
      color: MUTED,
      backgroundColor: INPUT_FILL,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: "hidden",
    },
    sectionBody: { padding: 8 },

    emptyLine: {
      fontSize: 13,
      color: PLACEHOLDER,
      textAlign: "center",
      paddingVertical: 18,
    },

    /* ── items table ── */
    itemHead: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: HEAD_FILL,
      borderRadius: 8,
    },
    itemHeadCell: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: "#526278",
      textTransform: "uppercase",
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: GRID,
    },
    itemCell: {
      fontSize: 13,
      color: "#475569",
      fontVariant: ["tabular-nums"],
    },
    itemCellStrong: {
      fontSize: 13,
      fontWeight: "700",
      color: TEXT,
    },
    itemTotal: {
      color: NAVY,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    colSno: { width: 34 },
    colName: { flex: 1, minWidth: 120, paddingRight: 8 },
    colType: { width: 84 },
    colNum: { width: 88, textAlign: "right", paddingRight: 8 },
    colTotal: { width: 96, textAlign: "right" },

    typeTag: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: SURFACE,
    },
    typeTagText: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },

    /* ── item cards (phones) ── */
    itemCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      padding: 12,
      gap: 10,
      marginBottom: 8,
    },
    itemCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    itemName: {
      flex: 1,
      fontSize: 14,
      fontWeight: "800",
      color: TEXT,
    },
    itemCardGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 18,
      rowGap: 8,
    },
    itemCardMeta: { gap: 2, minWidth: 70 },

    /* ── transactions ── */
    txnRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 8,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: GRID,
    },
    txnIcon: {
      height: 34,
      width: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    txnBody: { flex: 1, gap: 2 },
    txnDesc: {
      fontSize: 13.5,
      fontWeight: "700",
      color: TEXT,
    },
    txnSub: {
      fontSize: 11.5,
      fontWeight: "600",
      color: PLACEHOLDER,
    },
    txnAmount: {
      fontSize: 14,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },

    /* ── action bar ── */
    actionBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: pad,
      paddingVertical: 12,
      backgroundColor: SURFACE,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      ...barShadow,
    },
    barBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 48,
      borderRadius: 12,
    },
    barPrimary: {
      flex: 1,
      backgroundColor: NAVY,
      paddingHorizontal: 16,
    },
    barDisabled: { backgroundColor: "#9DB4CC" },
    barPrimaryText: {
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: "#FFFFFF",
    },
    barGhost: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 48,
      paddingHorizontal: 16,
      minWidth: 52,
      borderRadius: 12,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },
    barGhostText: {
      fontSize: 13.5,
      fontWeight: "800",
      color: TEXT,
    },

    /* ── add-payment sheet ── */
    payBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    paySheet: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: SURFACE,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: BORDER,
      overflow: "hidden",
      ...sheetShadow,
    },
    payHeader: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 14,
      gap: 3,
      borderBottomWidth: 1,
      borderBottomColor: BORDER,
    },
    payTitle: {
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.2,
      color: TEXT,
    },
    paySub: {
      fontSize: 12.5,
      fontWeight: "600",
      color: MUTED,
    },
    payBody: { padding: 20, paddingTop: 16 },
    fieldLabel: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: "#526278",
      textTransform: "uppercase",
      marginBottom: 6,
    },
    fieldWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: 48,
      borderRadius: 10,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 14,
    },
    fieldPrefix: {
      fontSize: 16,
      fontWeight: "800",
      color: MUTED,
    },
    fieldInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: TEXT,
      outlineStyle: "none",
    },
    fieldArea: {
      minHeight: 64,
      borderRadius: 10,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: TEXT,
      textAlignVertical: "top",
      outlineStyle: "none",
    },
    payActions: {
      flexDirection: "row",
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: BORDER,
    },
    payCancel: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
    },
    payCancelText: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: MUTED,
    },
    payConfirm: {
      flex: 1.4,
      height: 48,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: NAVY,
    },
    payConfirmText: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: "#FFFFFF",
    },
  });

  styles.colors = { NAVY, ORANGE, GREEN, MUTED, PLACEHOLDER, BORDER, TEXT };
  return styles;
};

export default makeStyles;
