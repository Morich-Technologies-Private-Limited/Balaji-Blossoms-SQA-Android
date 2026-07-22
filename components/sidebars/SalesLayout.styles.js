import { StyleSheet } from "react-native";
import { COLORS } from "./SalesSidebar.styles";

export { COLORS };

export default function makeStyles({ width, isTablet, isDesktop }) {
  const isLarge = isTablet || isDesktop;

  const iconSize = isDesktop ? 22 : 20;
  const headerHeight = isLarge ? 72 : 64;
  const gutter = isDesktop ? 32 : isTablet ? 24 : 16;

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: "transparent",
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
      backgroundColor: "transparent",
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

    /* ---------- body ----------
       No card, no panel, no accent strip. Transparent all the way down so
       screens paint straight onto the page background. */
    body: {
      flex: 1,
      minHeight: 0,
      width: "100%",
      paddingHorizontal: isLarge ? gutter : 0,
      paddingBottom: isLarge ? gutter : 0,
      backgroundColor: "transparent",
    },
    content: {
      flex: 1,
      minHeight: 0,
      width: "100%",
      maxWidth: "100%",
      backgroundColor: "transparent",
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
    gutter,
    isLarge,
  });
}
