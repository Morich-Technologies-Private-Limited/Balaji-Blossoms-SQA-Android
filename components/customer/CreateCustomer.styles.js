import { StyleSheet } from "react-native";

const NAVY = "#0f4776";
const GREEN = "#7CB342";
const RED = "#DC2626"; // validation / danger
const SURFACE = "#FFFFFF";
const BORDER = "#E2E8F0";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const PLACEHOLDER = "#94A3B8";

export default function makeStyles({ width, height, isTablet, isDesktop }) {
  const isPhone = !isTablet && !isDesktop;
  const compact = !isPhone && height < 820;

  // Wide desktops get a 4th column so 100% width is actually used.
  const columns = width >= 1500 ? 4 : isDesktop ? 3 : isTablet ? 2 : 1;

  const fieldHeight = isPhone ? 54 : compact ? 44 : 48;
  const gutter = isDesktop ? 20 : 16;
  const rowGap = compact ? 14 : 18;
  const padX = isPhone ? 16 : 24;

  const sheet = StyleSheet.create({
    /* No card: transparent, no border, no radius, no shadow. */
    screen: {
      flex: 1,
      width: "100%",
      maxWidth: "100%",
      alignSelf: "stretch",
      height: "100%",
      minHeight: 0,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 0,
      shadowOpacity: 0,
      elevation: 0,
      paddingHorizontal: padX,
      paddingTop: isPhone ? 12 : 8,
      paddingBottom: 0,
      overflow: "hidden",
    },
    keyboardWrap: {
      flex: 1,
      width: "100%",
      minHeight: 0,
    },
    /* minHeight/flexBasis 0 is what actually turns scrolling on for web. */
    scroll: {
      flex: 1,
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      minHeight: 0,
      width: "100%",
    },
    scrollContent: {
      paddingBottom: 16,
      flexGrow: 1,
    },

    /* sections */
    section: {
      marginBottom: compact ? 10 : 16,
      width: "100%",
    },
    sectionLabel: {
      fontSize: 11.5,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: "#475569",
      textTransform: "uppercase",
      marginBottom: compact ? 6 : 8,
    },
    row: {
      flexDirection: isPhone ? "column" : "row",
      flexWrap: "nowrap",
      alignItems: "flex-start",
      width: "100%",
      gap: gutter,
      marginBottom: isPhone ? 0 : rowGap,
    },
    field: {
      minWidth: 0,
      width: isPhone ? "100%" : undefined,
      marginBottom: isPhone ? 14 : 0,
      position: "relative",
    },
    spacer: {
      minWidth: 0,
    },

    /* inputs */
    label: {
      fontSize: 12.5,
      fontWeight: "600",
      color: MUTED,
      marginBottom: 4,
    },
    required: {
      color: RED,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      height: fieldHeight,
      borderRadius: 14,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: 12,
      gap: 8,
    },
    inputWrapFocused: {
      borderColor: NAVY,
    },
    inputWrapError: {
      borderColor: RED,
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      color: TEXT,
      paddingVertical: 0,
      outlineStyle: "none",
    },
    inputWrapHover: {
      borderColor: NAVY,
    },
    inputWrapDisabled: {
      backgroundColor: "#F8FAFC",
    },
    errorText: {
      position: "absolute",
      left: 2,
      bottom: -14,
      fontSize: 11,
      color: RED,
    },

    /* select trigger — same shell as an input, value instead of a TextInput */
    selectValue: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      color: TEXT,
    },
    selectPlaceholder: {
      color: PLACEHOLDER,
    },

    /* option picker dialog (state / city) */
    pickerCard: {
      width: "100%",
      maxWidth: 460,
      maxHeight: Math.max(280, height * 0.72),
      backgroundColor: SURFACE,
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: "#0F172A",
      shadowOpacity: 0.18,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    pickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 12,
    },
    pickerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "700",
      color: TEXT,
    },
    pickerSearch: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: fieldHeight,
      marginHorizontal: 18,
      marginBottom: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
    },
    pickerList: {
      flexGrow: 0,
    },
    pickerOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
    },
    pickerOptionHover: {
      backgroundColor: `${NAVY}0D`,
    },
    pickerOptionText: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      color: TEXT,
    },
    pickerOptionTextActive: {
      color: NAVY,
      fontWeight: "700",
    },
    pickerBadge: {
      fontSize: 9.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: NAVY,
      backgroundColor: `${NAVY}14`,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 999,
      overflow: "hidden",
    },
    pickerState: {
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 18,
      paddingVertical: 28,
    },
    pickerStateText: {
      fontSize: 13.5,
      color: MUTED,
      textAlign: "center",
    },
    pickerRetry: {
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.4,
      color: NAVY,
    },

    /* banner */
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
    },
    bannerError: {
      backgroundColor: `${RED}1A`,
    },
    bannerSuccess: {
      backgroundColor: `${GREEN}1A`,
    },
    bannerText: {
      flex: 1,
      fontSize: 13.5,
      color: TEXT,
    },

    /* actions — flexShrink 0 keeps it pinned and never squeezed away */
    actions: {
      flexDirection: isPhone ? "column-reverse" : "row",
      justifyContent: "flex-end",
      alignItems: "stretch",
      width: "100%",
      flexShrink: 0,
      flexGrow: 0,
      gap: 12,
      paddingTop: 12,
      paddingBottom: isPhone ? 16 : 12,
      borderTopWidth: 1,
      borderTopColor: BORDER,
      backgroundColor: "transparent",
    },
    button: {
      height: fieldHeight,
      minWidth: isPhone ? undefined : 170,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 22,
    },
    buttonPrimary: {
      backgroundColor: NAVY,
    },
    buttonGhost: {
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: BORDER,
    },
    buttonPressed: {
      opacity: 0.85,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 1,
      color: SURFACE,
    },
    buttonGhostText: {
      color: MUTED,
    },

    /* success dialog — the one place a panel is wanted */
    modalBackdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      backgroundColor: "rgba(15, 23, 42, 0.45)",
    },
    modalCard: {
      width: "100%",
      maxWidth: 420,
      alignItems: "center",
      backgroundColor: SURFACE,
      borderRadius: 22,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 20,
      shadowColor: "#0F172A",
      shadowOpacity: 0.18,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    modalIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: GREEN,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: TEXT,
      textAlign: "center",
    },
    modalBody: {
      fontSize: 14.5,
      lineHeight: 21,
      color: MUTED,
      textAlign: "center",
      marginTop: 8,
    },
    modalCountdown: {
      fontSize: 13,
      fontWeight: "600",
      color: NAVY,
      marginTop: 14,
    },
    modalActions: {
      flexDirection: isPhone ? "column-reverse" : "row",
      alignSelf: "stretch",
      justifyContent: "center",
      gap: 10,
      marginTop: 20,
    },
    modalButton: {
      flex: isPhone ? undefined : 1,
      minWidth: 0,
      paddingHorizontal: 12,
    },
  });

  return {
    ...sheet,
    columns,
    isPhone,
    compact,
    iconSize: isDesktop ? 20 : 18,
    placeholderColor: PLACEHOLDER,
    navy: NAVY,
    green: GREEN,
    danger: RED,
    red: RED,
  };
}
