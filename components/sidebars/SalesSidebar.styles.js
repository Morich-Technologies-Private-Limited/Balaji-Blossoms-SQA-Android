import { StyleSheet } from "react-native";

export const COLORS = {
  /* brand */
  navy: "#0F4776",
  navyDeep: "#0C3A61", // logo header block
  navyBody: "#124A7A", // sidebar body
  green: "#8CC63F",
  orange: "#E8622C",

  /* sidebar surfaces */
  itemActive: "rgba(255,255,255,0.16)",
  itemHover: "rgba(255,255,255,0.08)",
  divider: "rgba(255,255,255,0.10)",

  /* sidebar text */
  onNavy: "#FFFFFF",
  onNavyMuted: "rgba(255,255,255,0.72)",
  onNavyFaint: "rgba(255,255,255,0.45)",

  /* app surfaces (unchanged, used elsewhere) */
  bgPhone: "#FFFFFF",
  bgLarge: "#F1F5F9",
  surface: "#FFFFFF",
  inputFill: "#F5F7FA",
  border: "#E2E8F0",
  textPrimary: "#0F172A",
  textMuted: "#64748B",
  placeholder: "#94A3B8",
  label: "#475569",
};

export default function makeStyles({ width, isTablet, isDesktop }) {
  const isLarge = isTablet || isDesktop;

  const sidebarWidth = isDesktop
    ? 268
    : isTablet
      ? 300
      : Math.min(320, width * 0.86);
  const railWidth = 76;
  const iconSize = isDesktop ? 22 : 20;
  const rowHeight = isLarge ? 56 : 54;
  const markSize = isLarge ? 64 : 56;

  const styles = StyleSheet.create({
    /* ---------- shell ---------- */
    sidebar: {
      width: sidebarWidth,
      height: "100%",
      backgroundColor: COLORS.navyBody,
      paddingBottom: 12,
    },
    sidebarCollapsed: {
      width: railWidth,
    },
    sidebarFloating: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 40,
      shadowColor: "#0F172A",
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 4, height: 0 },
      elevation: 8,
    },
    scrim: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "rgba(15,23,42,0.45)",
      zIndex: 30,
    },

    /* ---------- brand ---------- */
    brandRow: {
      backgroundColor: COLORS.navyDeep,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: isLarge ? 18 : 14,
      paddingHorizontal: 16,
    },
    brandRowCollapsed: {
      justifyContent: "center",
      paddingHorizontal: 0,
    },
    mark: {
      width: markSize,
      height: markSize,
    },
    markCollapsed: {
      width: 40,
      height: 40,
    },
    brandText: {
      flex: 1,
      marginLeft: 10,
    },
    brandTitle: {
      fontSize: isDesktop ? 22 : 20,
      fontWeight: "800",
      letterSpacing: 1,
      color: COLORS.onNavy,
    },
    brandSubtitle: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: "600",
      letterSpacing: 1.5,
      color: COLORS.green,
      marginTop: 1,
    },

    /* ---------- toggles ---------- */
    edgeToggle: {
      position: "absolute",
      top: "50%",
      right: -18,
      marginTop: -28,
      width: 22,
      height: 56,
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
      backgroundColor: COLORS.navyDeep,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    },
    closeBtn: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.14)",
      zIndex: 50,
    },

    /* ---------- sections ---------- */
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
      color: COLORS.onNavyFaint,
      textTransform: "uppercase",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    menu: {
      paddingHorizontal: 10,
      paddingTop: 8,
    },

    /* ---------- nav item ---------- */
    item: {
      minHeight: rowHeight,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: "transparent",
      overflow: "hidden",
    },
    itemCollapsed: {
      justifyContent: "center",
      paddingHorizontal: 0,
    },
    itemActive: {
      backgroundColor: COLORS.itemActive,
    },
    itemHovered: {
      backgroundColor: COLORS.itemHover,
    },
    itemDivider: {
      height: 1,
      marginLeft: 14,
      backgroundColor: COLORS.divider,
    },
    activeBar: {
      position: "absolute",
      left: 0,
      top: 8,
      bottom: 8,
      width: 4,
      borderRadius: 999,
      backgroundColor: COLORS.green,
    },
    itemIcon: {
      width: 28,
      alignItems: "center",
    },
    itemTextWrap: {
      flex: 1,
      marginLeft: 12,
    },
    itemLabel: {
      fontSize: isDesktop ? 16 : 15,
      fontWeight: "600",
      color: COLORS.onNavyMuted,
    },
    itemLabelActive: {
      color: COLORS.onNavy,
      fontWeight: "700",
    },
    itemHint: {
      fontSize: 12,
      color: COLORS.onNavyFaint,
      marginTop: 2,
    },

    /* ---------- footer ---------- */
    footer: {
      marginTop: "auto",
      paddingTop: 14,
      paddingHorizontal: 14,
    },
    logoutBtn: {
      minHeight: rowHeight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: COLORS.orange,
    },
    logoutBtnCollapsed: {
      paddingHorizontal: 0,
    },
    logoutBtnPressed: {
      backgroundColor: "#CF5324",
    },
    logoutLabel: {
      fontSize: isDesktop ? 16 : 15,
      fontWeight: "700",
      color: "#FFFFFF",
      marginLeft: 10,
    },
    footerMeta: {
      alignItems: "center",
      paddingTop: 16,
      paddingBottom: 4,
    },
    footerStore: {
      fontSize: 14,
      fontWeight: "700",
      color: COLORS.onNavy,
    },
    footerCopy: {
      fontSize: 11,
      color: COLORS.onNavyFaint,
      marginTop: 6,
    },
  });

  return Object.assign(styles, {
    sidebarWidth,
    railWidth,
    iconSize,
    rowHeight,
    markSize,
    isLarge,
  });
}
