import { StyleSheet } from "react-native";

const NAVY = "#0f4776";

// Returns a responsive stylesheet based on screen size.
// Also exposes non-style values (iconSize) for use in the component.
export function makeStyles({ width, isTablet, isDesktop }) {
  // card width per tier
  let cardMaxWidth = "100%"; // phone
  if (isTablet) cardMaxWidth = 460;
  if (isDesktop) cardMaxWidth = 420;

  // scale a few key sizes up on larger screens
  const logoWidth = isDesktop ? 260 : isTablet ? 250 : 220;
  const logoHeight = isDesktop ? 140 : isTablet ? 135 : 120;
  const titleSize = isDesktop ? 26 : isTablet ? 25 : 24;
  const inputHeight = isTablet || isDesktop ? 56 : 54;
  const iconSize = isDesktop ? 22 : 20;

  // give tablet/desktop a visible card panel; phone stays flat & full-bleed
  const cardIsPanel = isTablet || isDesktop;

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: cardIsPanel ? "#F1F5F9" : "#FFFFFF",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: isDesktop ? 40 : 24,
    },

    card: {
      width: "100%",
      maxWidth: cardMaxWidth,
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      borderRadius: cardIsPanel ? 24 : 0,
      paddingHorizontal: cardIsPanel ? 36 : 0,
      paddingVertical: cardIsPanel ? 44 : 0,
      // panel shadow only on tablet/desktop
      ...(cardIsPanel
        ? {
            shadowColor: "#0F172A",
            shadowOpacity: 0.08,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }
        : {}),
    },

    logo: {
      width: logoWidth,
      height: logoHeight,
      marginBottom: 16,
    },

    title: {
      fontSize: titleSize,
      fontWeight: "700",
      color: NAVY,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      color: "#94A3B8",
      marginTop: 6,
      marginBottom: 32,
      textAlign: "center",
    },

    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      height: inputHeight,
      backgroundColor: "#F5F7FA",
      borderRadius: 14,
      paddingHorizontal: 16,
      marginBottom: 16,
      gap: 12,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: "#0F172A",
      height: "100%",
    },

    button: {
      width: "100%",
      height: inputHeight,
      backgroundColor: NAVY,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 16,
      letterSpacing: 1,
    },

    footer: {
      marginTop: 28,
      color: "#94A3B8",
      fontSize: 13,
      textAlign: "center",
    },
  });

  // attach plain (non-StyleSheet) values the component needs
  styles.iconSize = iconSize;

  return styles;
}
