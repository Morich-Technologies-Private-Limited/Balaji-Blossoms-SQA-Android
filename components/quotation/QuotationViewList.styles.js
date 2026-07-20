import { StyleSheet } from "react-native";

const NAVY = "#0f4776";
const GREEN = "#7CB342";
const ORANGE = "#E8622C";
const SURFACE = "#FFFFFF";
const INPUT_FILL = "#F5F7FA";
const BORDER = "#E2E8F0";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const PLACEHOLDER = "#94A3B8";

const makeStyles = ({ width, isTablet, isDesktop }) => {
  const large = isTablet || isDesktop;
  const maxWidth = isDesktop ? 1100 : isTablet ? 760 : width;
  const gutter = isDesktop ? 32 : isTablet ? 24 : 20;
  const controlHeight = large ? 56 : 54;
  const numColumns = isDesktop ? 2 : 1;

  const cardShadow = large
    ? {
        shadowColor: TEXT,
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      }
    : {};

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: large ? "#F1F5F9" : SURFACE,
      alignItems: "center",
    },
    container: {
      flex: 1,
      width: "100%",
      maxWidth,
      paddingHorizontal: gutter,
    },

    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingText: {
      fontSize: 15,
      color: PLACEHOLDER,
    },

    listContent: {
      paddingTop: large ? 32 : 20,
      paddingBottom: 120,
    },
    column: {
      gap: 16,
    },

    header: {
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 24,
    },
    titleBlock: {
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

    primaryButton: {
      height: controlHeight,
      paddingHorizontal: 22,
      borderRadius: 14,
      backgroundColor: NAVY,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 1,
      color: "#FFFFFF",
    },

    searchWrap: {
      height: controlHeight,
      borderRadius: 14,
      backgroundColor: INPUT_FILL,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: isDesktop ? 16 : 15,
      color: TEXT,
      // removes the web focus ring while keeping the container border
      outlineStyle: "none",
    },

    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    filterPill: {
      paddingHorizontal: 16,
      paddingVertical: 9,
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
      fontSize: 13,
      fontWeight: "700",
      color: MUTED,
    },
    filterPillTextActive: {
      color: "#FFFFFF",
    },

    resultCount: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: "#475569",
      textTransform: "uppercase",
      marginBottom: 12,
    },

    card: {
      flex: numColumns > 1 ? 1 : undefined,
      backgroundColor: SURFACE,
      borderRadius: 22,
      borderWidth: large ? 0 : 1,
      borderColor: BORDER,
      padding: large ? 22 : 18,
      paddingTop: large ? 26 : 22,
      marginBottom: 16,
      overflow: "hidden",
      ...cardShadow,
    },
    cardPressed: {
      opacity: 0.85,
    },
    cardStrip: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    cardHeaderText: {
      flex: 1,
      gap: 2,
    },
    customerName: {
      fontSize: isDesktop ? 17 : 16,
      fontWeight: "700",
      color: TEXT,
    },
    quotationId: {
      fontSize: 13,
      fontWeight: "600",
      color: PLACEHOLDER,
      letterSpacing: 0.5,
    },

    levelPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    levelPillText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },

    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    metaText: {
      flex: 1,
      fontSize: 14,
      color: MUTED,
    },

    cardFooter: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginTop: 10,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: BORDER,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: "#475569",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    amount: {
      fontSize: isDesktop ? 20 : 19,
      fontWeight: "700",
      color: NAVY,
    },
    countsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    countText: {
      fontSize: 14,
      color: PLACEHOLDER,
    },

    emptyWrap: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 56,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: TEXT,
      marginTop: 6,
    },
    emptyText: {
      fontSize: 15,
      color: PLACEHOLDER,
      textAlign: "center",
      maxWidth: 340,
    },
    emptyAction: {
      marginTop: 14,
      height: controlHeight,
      paddingHorizontal: 28,
      borderRadius: 14,
      backgroundColor: NAVY,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyActionText: {
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 1,
      color: "#FFFFFF",
    },

    fab: {
      position: "absolute",
      right: 4,
      bottom: 24,
      height: 60,
      width: 60,
      borderRadius: 999,
      backgroundColor: ORANGE,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: TEXT,
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  });

  // raw numbers the components need (Ionicons `size` wants a number, not a style)
  styles.iconSize = isDesktop ? 22 : 20;
  styles.iconSizeSmall = 16;
  styles.numColumns = numColumns;
  styles.accentGreen = GREEN;

  return styles;
};

export default makeStyles;
