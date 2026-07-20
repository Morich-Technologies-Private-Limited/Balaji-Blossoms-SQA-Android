import { StyleSheet } from "react-native";

const NAVY = "#0f4776";
const ORANGE = "#E8622C";
const SURFACE = "#FFFFFF";
const INPUT_FILL = "#F5F7FA";
const BORDER = "#E2E8F0";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const PLACEHOLDER = "#94A3B8";

const makeStyles = ({ width, isTablet, isDesktop }) => {
  const large = isTablet || isDesktop;
  const controlHeight = large ? 56 : 54;
  const sheetWidth = isDesktop
    ? 520
    : isTablet
      ? 480
      : Math.min(width - 32, 440);

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
    },
    sheet: {
      width: "100%",
      backgroundColor: SURFACE,
      borderRadius: 24,
      padding: large ? 28 : 22,
      paddingTop: large ? 32 : 26,
      overflow: "hidden",
      shadowColor: TEXT,
      shadowOpacity: 0.18,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    sheetStrip: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: ORANGE,
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 24,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontSize: isDesktop ? 26 : 24,
      fontWeight: "700",
      color: NAVY,
    },
    subtitle: {
      fontSize: 15,
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

    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: "#475569",
      textTransform: "uppercase",
      marginBottom: 8,
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
      marginBottom: 24,
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
      fontSize: 15,
      color: MUTED,
    },

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

    actions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 32,
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
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 1,
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
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 1,
      color: "#FFFFFF",
    },
  });

  styles.iconSize = isDesktop ? 22 : 20;

  return styles;
};

export default makeStyles;
