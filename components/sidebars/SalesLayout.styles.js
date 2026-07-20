import { StyleSheet } from "react-native";
import { COLORS } from "./SalesSidebar.styles";

export { COLORS };

export default function makeStyles({ width, isTablet, isDesktop }) {
  const isLarge = isTablet || isDesktop;

  const iconSize = isDesktop ? 22 : 20;
  const headerHeight = isLarge ? 72 : 64;
  const contentMaxWidth = isDesktop ? 1100 : 760;
  const gutter = isDesktop ? 32 : isTablet ? 24 : 16;

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: isLarge ? COLORS.bgLarge : COLORS.bgPhone,
    },
    main: {
      flex: 1,
      minWidth: 0,
    },

    /* ---------- header ---------- */
    header: {
      height: headerHeight,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      gap: 12,
      backgroundColor: isLarge ? COLORS.bgLarge : COLORS.bgPhone,
      borderBottomWidth: isLarge ? 0 : 1,
      borderBottomColor: COLORS.border,
    },
    menuBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.inputFill,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: isDesktop ? 26 : 24,
      fontWeight: "700",
      color: COLORS.navy,
    },
    subtitle: {
      fontSize: 15,
      color: COLORS.placeholder,
      marginTop: 2,
    },

    /* ---------- body ---------- */
    body: {
      flex: 1,
      paddingHorizontal: isLarge ? gutter : 0,
      paddingBottom: isLarge ? gutter : 0,
      alignItems: isLarge ? "center" : "stretch",
    },
    content: {
      flex: 1,
      width: "100%",
      maxWidth: contentMaxWidth,
    },
    card: {
      flex: 1,
      backgroundColor: COLORS.surface,
      borderRadius: 24,
      overflow: "hidden",
      shadowColor: "#0F172A",
      shadowOpacity: 0.08,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    cardTopStrip: {
      height: 4,
      backgroundColor: COLORS.orange,
    },
    flat: {
      flex: 1,
      backgroundColor: COLORS.bgPhone,
    },

    /* ---------- drawer ---------- */
    drawer: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 40,
    },

    scrimWrap: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 30,
    },
  });

  return Object.assign(styles, {
    iconSize,
    headerHeight,
    contentMaxWidth,
    gutter,
    isLarge,
  });
}
