import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";

const LOGO = require("@/assets/images/logo.png");

/** Intrinsic size of logo.png (1040x413) — keeps the box exactly on the artwork. */
const LOGO_ASPECT = 1040 / 413;

const BACKGROUND_COLOR = "#ffffff";
/** Fraction of the screen's shorter edge the logo should span. */
const LOGO_SCREEN_RATIO = 0.62;
const LOGO_MIN_WIDTH = 150;
const LOGO_MAX_WIDTH = 420;

const HOLD_MS = 300;
const FADE_MS = 400;

// The native splash stays up until <AnimatedSplash /> has laid out, so there is
// no white flash between the OS splash and this one.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

export function useSplashLogoWidth() {
  const { width, height } = useWindowDimensions();
  const shortestEdge = Math.min(width, height);

  return Math.round(
    Math.max(
      LOGO_MIN_WIDTH,
      Math.min(shortestEdge * LOGO_SCREEN_RATIO, LOGO_MAX_WIDTH)
    )
  );
}

export default function AnimatedSplash({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  const logoWidth = useSplashLogoWidth();

  const onLayout = useCallback((_: LayoutChangeEvent) => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setIsVisible(false);
      });
    }, HOLD_MS);

    return () => clearTimeout(timer);
  }, [isVisible, opacity]);

  return (
    <View style={styles.root}>
      {children}
      {isVisible && (
        <Animated.View
          style={[styles.overlay, { opacity }]}
          onLayout={onLayout}
        >
          <Image
            source={LOGO}
            style={{ width: logoWidth, height: logoWidth / LOGO_ASPECT }}
            contentFit="contain"
            transition={0}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BACKGROUND_COLOR,
  },
});
