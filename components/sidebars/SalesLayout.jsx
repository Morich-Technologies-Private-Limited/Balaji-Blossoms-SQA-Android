import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    BackHandler,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import makeStyles, { COLORS } from "./SalesLayout.styles";
import SalesSidebar from "./SalesSidebar";
import makeSidebarStyles from "./SalesSidebar.styles";

/**
 * SalesLayout — the shell for the whole /sales section.
 * Mounted once from app/sales/_layout.jsx, so sidebar state survives navigation.
 *
 * Phone   (<600)  drawer overlay, opened from the header hamburger
 * Tablet  (600+)  same drawer, wider
 * Desktop (1024+) docked sidebar, collapsible to an icon rail
 *
 * @param {string} title     header title, usually derived from SALES_MENU
 * @param {string} subtitle  muted line under the title
 * @param {node}   right     optional header-right actions
 * @param {boolean} card     white card panel on tablet/desktop (default true)
 */
export default function SalesLayout({
  title,
  subtitle,
  right,
  card = true,
  children,
}) {
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

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    router.replace("/login");
  }, [router]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarStyles.sidebarWidth, 0],
  });

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {docked && (
        <SalesSidebar
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

        <View style={styles.body}>
          <View style={styles.content}>
            {styles.isLarge && card ? (
              <View style={styles.card}>
                <View style={styles.cardTopStrip} />
                {children}
              </View>
            ) : (
              <View style={styles.flat}>{children}</View>
            )}
          </View>
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
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            />
          </Animated.View>

          <Animated.View
            pointerEvents={open ? "auto" : "none"}
            style={[styles.drawer, { transform: [{ translateX }] }]}
          >
            <SalesSidebar
              floating
              onClose={() => setOpen(false)}
              onNavigate={() => setOpen(false)}
              onLogout={handleLogout}
            />
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}
