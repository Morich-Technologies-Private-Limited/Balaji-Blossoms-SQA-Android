import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    BackHandler,
    KeyboardAvoidingView,
    PanResponder,
    Platform,
    Pressable,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DeliverySidebar from "./DeliverySidebar.jsx";
import makeStyles, { COLORS } from "./SalesLayout.styles.js";
import makeSidebarStyles from "./SalesSidebar.styles.js";

/** How far in from the left screen edge a swipe can start the open gesture. */
const EDGE_ZONE = 28;
/** Horizontal travel required before we claim the gesture from a ScrollView. */
const DRAG_THRESHOLD = 8;
/** Fling speed (px/ms) that decides direction regardless of distance. */
const VELOCITY_THRESHOLD = 0.4;

/**
 * DeliveryLayout — the shell for the whole /delivery section.
 * Mounted once from app/delivery/_layout.jsx, so sidebar state survives
 * navigation.
 *
 * A sibling of SalesLayout: identical responsive drawer behaviour and gesture
 * handling (reusing the Sales layout + sidebar styles), but it renders
 * DeliverySidebar and has no create-quotation flow.
 *
 * Phone   (<600)  drawer overlay, opened from the header hamburger or an
 *                 edge swipe; swipe left on the drawer to close
 * Tablet  (600+)  same drawer, wider
 * Desktop (1024+) docked sidebar, collapsible to an icon rail, no gestures
 *
 * @param {string} title     header title
 * @param {string} subtitle  muted line under the title
 * @param {node}   right     optional header-right actions
 */
export default function DeliveryLayout({ title, subtitle, right, children }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;

  const styles = useMemo(
    () => makeStyles({ width, isTablet, isDesktop }),
    [width, isTablet, isDesktop],
  );
  const sidebarStyles = useMemo(
    () => makeSidebarStyles({ width, isTablet, isDesktop }),
    [width, isTablet, isDesktop],
  );

  const router = useRouter();
  const pathname = usePathname();

  const docked = isDesktop;
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = sidebarStyles.sidebarWidth;

  // 0 = closed, 1 = open. Driven by both the animation and the drag.
  const anim = useRef(new Animated.Value(0)).current;

  // Mirrors of state the PanResponder needs without re-creating itself.
  const openRef = useRef(open);
  const progressRef = useRef(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => {
      progressRef.current = value;
    });
    return () => anim.removeListener(id);
  }, [anim]);

  /** Single place that moves the drawer and keeps state in sync. */
  const animateTo = useCallback(
    (toOpen, velocity = 0) => {
      openRef.current = toOpen;
      Animated.spring(anim, {
        toValue: toOpen ? 1 : 0,
        velocity,
        bounciness: 0,
        speed: 14,
        useNativeDriver: true,
      }).start();
      setOpen(toOpen);
    },
    [anim],
  );

  // Responds to `open` being changed from outside the gesture (hamburger,
  // back button, route change). Skipped when the gesture already animated.
  useEffect(() => {
    if (open === openRef.current) return;
    openRef.current = open;
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  // Rotating to a docked width mid-session must not leave a stale drawer behind.
  useEffect(() => {
    if (docked) setOpen(false);
  }, [docked]);

  // Android back closes the drawer before it pops the route.
  useEffect(() => {
    if (Platform.OS !== "android" || !open) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = useCallback(() => {
    setOpen(false);
    router.replace("/auth/Login");
  }, [router]);

  /* ---------------- swipe gesture ---------------- */

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Never claim a plain tap — buttons and list rows must still work.
        onStartShouldSetPanResponder: () => false,

        onMoveShouldSetPanResponder: (evt, g) => {
          if (docked) return false;

          const horizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
          if (!horizontal || Math.abs(g.dx) < DRAG_THRESHOLD) return false;

          // Open drawer: any leftward drag closes it.
          if (openRef.current) return g.dx < 0;

          // Closed drawer: rightward drag that began near the screen edge.
          return g.dx > 0 && evt.nativeEvent.pageX <= EDGE_ZONE;
        },

        onPanResponderGrant: () => {
          anim.stopAnimation();
        },

        onPanResponderMove: (_evt, g) => {
          const base = openRef.current ? 1 : 0;
          const next = base + g.dx / sidebarWidth;
          anim.setValue(Math.max(0, Math.min(1, next)));
        },

        onPanResponderRelease: (_evt, g) => {
          let shouldOpen;
          if (g.vx > VELOCITY_THRESHOLD) shouldOpen = true;
          else if (g.vx < -VELOCITY_THRESHOLD) shouldOpen = false;
          else shouldOpen = progressRef.current > 0.5;

          animateTo(shouldOpen, g.vx / sidebarWidth);
        },

        onPanResponderTerminate: () => animateTo(openRef.current),
        onPanResponderTerminationRequest: () => false,
      }),
    [docked, sidebarWidth, anim, animateTo],
  );

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth, 0],
    extrapolate: "clamp",
  });

  // The drawer must accept touches while it is being dragged open, not only
  // once `open` has flipped — otherwise a half-open drawer is dead to the touch.
  const drawerInteractive = open || progressRef.current > 0;

  return (
    <SafeAreaView
      style={styles.root}
      edges={["top", "left", "right"]}
      {...(docked ? {} : panResponder.panHandlers)}
    >
      {docked && (
        <DeliverySidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onLogout={handleLogout}
        />
      )}

      <KeyboardAvoidingView
        style={styles.main}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          {!docked && (
            <Pressable
              onPress={() => setOpen(true)}
              style={styles.menuBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <Ionicons
                name="menu-outline"
                size={styles.iconSize}
                color={COLORS.navy}
              />
            </Pressable>
          )}

          <View style={styles.headerTextWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          {right}
        </View>

        {/* Children sit directly on the page — no card, no strip. */}
        <View style={styles.body}>
          <View style={styles.content}>{children}</View>
        </View>
      </KeyboardAvoidingView>

      {/* Drawer, phone and tablet only. Kept mounted so the slide animation
          runs both ways; pointerEvents keeps it inert while closed. */}
      {!docked && (
        <>
          <Animated.View
            pointerEvents={open ? "auto" : "none"}
            style={[styles.scrimWrap, { opacity: anim }]}
          >
            <Pressable
              style={sidebarStyles.scrim}
              onPress={() => animateTo(false)}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            />
          </Animated.View>

          <Animated.View
            pointerEvents={drawerInteractive ? "auto" : "none"}
            style={[styles.drawer, { transform: [{ translateX }] }]}
          >
            <DeliverySidebar
              floating
              onClose={() => animateTo(false)}
              onNavigate={() => animateTo(false)}
              onLogout={handleLogout}
            />
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}
