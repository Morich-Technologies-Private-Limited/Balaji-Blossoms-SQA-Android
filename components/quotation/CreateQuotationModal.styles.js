import { Platform, StyleSheet } from "react-native";

const NAVY = "#0F4776";
const NAVY_TINT = "#EAF1F8";
const NAVY_DARK = "#0C3A61";
const ORANGE = "#E8622C";
const SURFACE = "#FFFFFF";
const INPUT_FILL = "#F5F7FA";
const BORDER = "#E2E8F0";
const GRID = "#EEF2F7";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const PLACEHOLDER = "#94A3B8";

const sheetShadow = Platform.select({
  web: { boxShadow: "0 18px 50px rgba(15,23,42,0.28)" },
  default: {
    shadowColor: TEXT,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
});

const dropdownShadow = Platform.select({
  web: { boxShadow: "0 12px 28px rgba(15,23,42,0.14)" },
  default: {
    shadowColor: TEXT,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});

const makeStyles = ({ width, isTablet, isDesktop }) => {
  const large = isTablet || isDesktop;
  const controlHeight = large ? 54 : 52;
  const sheetWidth = isDesktop
    ? 560
    : isTablet
      ? 500
      : Math.min(width - 32, 460);

  const styles = StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    backdropPress: {
      ...StyleSheet.absoluteFillObject,
    },
    sheetWrap: {
      width: sheetWidth,
      maxHeight: "90%",
    },
    sheet: {
      width: "100%",
      maxHeight: "100%",
      backgroundColor: SURFACE,
      borderRadius: 24,
      paddingTop: large ? 28 : 24,
      overflow: "hidden",
      ...sheetShadow,
    },
    sheetStrip: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: ORANGE,
    },

    /* ── header ── */
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: large ? 28 : 22,
      marginBottom: 18,
    },
    headerBadge: {
      height: 44,
      width: 44,
      borderRadius: 13,
      backgroundColor: NAVY_TINT,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
      gap: 3,
    },
    title: {
      fontSize: isDesktop ? 23 : 21,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: NAVY,
    },
    subtitle: {
      fontSize: 13.5,
      color: PLACEHOLDER,
    },
    closeBtn: {
      height: 36,
      width: 36,
      borderRadius: 999,
      backgroundColor: INPUT_FILL,
      alignItems: "center",
      justifyContent: "center",
    },

    /* ── scrollable body ── */
    body: {
      flexGrow: 0,
    },
    bodyContent: {
      paddingHorizontal: large ? 28 : 22,
      paddingBottom: 8,
    },

    sectionLabel: {
      fontSize: 11.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: "#475569",
      textTransform: "uppercase",
      marginBottom: 8,
    },
    sectionHeadRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    /* ── search + input ── */
    searchBlock: {
      // dropdown is in normal flow beneath the input; the sheet grows with it
      gap: 0,
    },
    inputWrap: {
      height: controlHeight,
      borderRadius: 14,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    inputWrapOpen: {
      borderColor: NAVY,
      backgroundColor: SURFACE,
    },
    inputWrapError: {
      borderColor: ORANGE,
    },
    input: {
      flex: 1,
      fontSize: isDesktop ? 16 : 15,
      color: TEXT,
      outlineStyle: "none",
    },
    hint: {
      marginTop: 8,
      fontSize: 12.5,
      color: PLACEHOLDER,
    },

    /* ── dropdown ── */
    dropdown: {
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      overflow: "hidden",
      ...dropdownShadow,
    },
    dropdownScroll: {
      maxHeight: 244,
    },
    dropdownState: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 20,
      paddingHorizontal: 16,
    },
    dropdownStateText: {
      fontSize: 13.5,
      color: MUTED,
      textAlign: "center",
      flexShrink: 1,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: GRID,
    },
    optionLast: {
      borderBottomWidth: 0,
    },
    optionHover: {
      backgroundColor: NAVY_TINT,
    },
    optionAvatar: {
      height: 38,
      width: 38,
      borderRadius: 11,
      backgroundColor: NAVY_TINT,
      alignItems: "center",
      justifyContent: "center",
    },
    optionAvatarText: {
      fontSize: 16,
      fontWeight: "800",
      color: NAVY,
    },
    optionText: {
      flex: 1,
      gap: 2,
    },
    optionName: {
      fontSize: 14.5,
      fontWeight: "700",
      color: TEXT,
    },
    optionMeta: {
      fontSize: 12,
      color: MUTED,
    },

    /* ── selected customer ── */
    detailBlock: {
      gap: 0,
    },
    changeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: NAVY_TINT,
    },
    changeBtnText: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: NAVY,
    },
    customerCard: {
      marginTop: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: "#FBFCFE",
      padding: 16,
      gap: 16,
    },
    customerCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    customerAvatar: {
      height: 48,
      width: 48,
      borderRadius: 14,
      backgroundColor: NAVY,
      alignItems: "center",
      justifyContent: "center",
    },
    customerAvatarText: {
      fontSize: 20,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    customerName: {
      fontSize: 17,
      fontWeight: "800",
      color: TEXT,
    },
    customerAlias: {
      fontSize: 13,
      color: MUTED,
      marginTop: 1,
    },
    detailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 14,
      columnGap: 16,
    },
    detailCell: {
      width: "46%",
      flexGrow: 1,
      gap: 3,
    },
    detailCellFull: {
      width: "100%",
    },
    detailLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: "#7C8CA1",
      textTransform: "uppercase",
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "600",
      color: TEXT,
    },

    /* ── assigned-to / read-only rows ── */
    readonlyRow: {
      minHeight: controlHeight,
      borderRadius: 14,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    readonlyText: {
      flex: 1,
      fontSize: 14.5,
      color: MUTED,
    },
    retryText: {
      color: ORANGE,
    },

    /* ── company picker (dropdown) ── */
    selectTrigger: {
      minHeight: controlHeight,
      borderRadius: 14,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    selectTriggerHover: {
      borderColor: NAVY,
      backgroundColor: SURFACE,
    },
    selectTriggerOpen: {
      borderColor: NAVY,
      backgroundColor: SURFACE,
    },
    selectValue: {
      flex: 1,
      fontSize: isDesktop ? 16 : 15,
      fontWeight: "700",
      color: TEXT,
    },
    selectPlaceholder: {
      fontWeight: "400",
      color: PLACEHOLDER,
    },
    companyScroll: {
      maxHeight: 220,
    },
    companyOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 48,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: GRID,
    },
    companyOptionText: {
      flex: 1,
      fontSize: 14.5,
      fontWeight: "600",
      color: TEXT,
    },
    companyOptionTextActive: {
      fontWeight: "800",
      color: NAVY_DARK,
    },
    companyBadge: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: NAVY,
      backgroundColor: NAVY_TINT,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 999,
      overflow: "hidden",
    },

    /* ── error ── */
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: ORANGE,
    },

    /* ── actions ── */
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: large ? 28 : 22,
      paddingTop: 16,
      paddingBottom: large ? 24 : 20,
      borderTopWidth: 1,
      borderTopColor: GRID,
    },
    secondaryBtn: {
      flex: 1,
      height: controlHeight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryBtnText: {
      fontSize: 14.5,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: MUTED,
    },
    primaryBtn: {
      flex: 2,
      height: controlHeight,
      borderRadius: 14,
      backgroundColor: NAVY,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtnOff: {
      backgroundColor: PLACEHOLDER,
    },
    primaryBtnText: {
      fontSize: 14.5,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: "#FFFFFF",
    },
  });

  styles.iconSize = isDesktop ? 22 : 20;
  styles.colors = {
    NAVY,
    NAVY_TINT,
    NAVY_DARK,
    ORANGE,
    SURFACE,
    MUTED,
    PLACEHOLDER,
    TEXT,
    BORDER,
  };

  return styles;
};

export default makeStyles;
