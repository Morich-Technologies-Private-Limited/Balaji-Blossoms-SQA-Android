import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Fragment, useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import logo from "../../assets/images/balaji_logo.png";
import makeStyles, { COLORS } from "./SalesSidebar.styles";

export const SALES_MENU = [
  {
    key: "myQuotation",
    label: "My Quotation",
    hint: "Quotations you created",
    icon: "document-text-outline",
    route: "/sales/myQuotation",
  },
  {
    key: "allQuotation",
    label: "Unit Quotation",
    hint: "Everything in your unit",
    icon: "albums-outline",
    route: "/sales/allQuotation",
  },
  {
    key: "myInvoice",
    label: "My Invoice",
    hint: "Invoices you raised",
    icon: "receipt-outline",
    route: "/sales/myInvoice",
  },
  {
    key: "invoice",
    label: "Search Invoice",
    hint: "Find any invoice",
    icon: "search-outline",
    route: "/sales/invoice",
  },
  {
    key: "createCustomer",
    label: "New Customer",
    hint: "Add a buyer once, reuse everywhere",
    icon: "person-add-outline",
    route: "/sales/createCustomer",
  },
];

/**
 * SalesSidebar
 * @param {boolean} collapsed   icon-only rail (desktop)
 * @param {boolean} floating    rendered as an overlay drawer (phone / tablet)
 * @param {boolean} showHints   small caption under each label
 * @param {string}  storeName   footer store label
 */
export default function SalesSidebar({
  collapsed = false,
  floating = false,
  showHints = false,
  storeName = "Main Store",
  onNavigate,
  onToggleCollapse,
  onClose,
  onLogout,
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;
  const styles = useMemo(
    () => makeStyles({ width, isTablet, isDesktop }),
    [width, isTablet, isDesktop],
  );

  const router = useRouter();
  const pathname = usePathname();

  const go = (route) => {
    if (pathname !== route) router.push(route);
    onNavigate?.(route);
  };

  const showLabels = !collapsed;

  return (
    <View
      style={[
        styles.sidebar,
        collapsed && styles.sidebarCollapsed,
        floating && styles.sidebarFloating,
      ]}
    >
      {/* Brand: flower mark + wordmark (wordmark hidden when collapsed) */}
      <View style={[styles.brandRow, collapsed && styles.brandRowCollapsed]}>
        <Image
          source={logo}
          resizeMode="contain"
          style={[styles.mark, collapsed && styles.markCollapsed]}
          accessibilityLabel="Balaji Blossoms"
        />

        {showLabels && (
          <View style={styles.brandText}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              BALAJI
            </Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              BLOSSOMS
            </Text>
          </View>
        )}
      </View>

      {/* Toggle: edge tab on desktop, X when floating */}
      {floating ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          hitSlop={10}
          style={({ pressed, hovered }) => [
            styles.closeBtn,
            (pressed || hovered) && styles.closeBtnActive,
          ]}
        >
          <Ionicons name="close-outline" size={22} color={COLORS.onNavy} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onToggleCollapse}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? "Expand menu" : "Collapse menu"}
          hitSlop={10}
          style={({ pressed, hovered }) => [
            styles.edgeToggle,
            (pressed || hovered) && styles.edgeToggleActive,
          ]}
        >
          <Ionicons
            name={collapsed ? "chevron-forward" : "chevron-back"}
            size={18}
            color={COLORS.onNavy}
          />
        </Pressable>
      )}

      {showLabels && <Text style={styles.sectionLabel}>Sales</Text>}

      <ScrollView
        contentContainerStyle={styles.menu}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {SALES_MENU.map((item, i) => {
          const active = pathname === item.route;
          return (
            <Fragment key={item.key}>
              <Pressable
                onPress={() => go(item.route)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
                style={({ pressed, hovered }) => [
                  styles.item,
                  collapsed && styles.itemCollapsed,
                  (pressed || hovered) && !active && styles.itemHovered,
                  active && styles.itemActive,
                ]}
              >
                {active && <View style={styles.activeBar} />}

                <View style={styles.itemIcon}>
                  <Ionicons
                    name={item.icon}
                    size={styles.iconSize}
                    color={active ? COLORS.onNavy : COLORS.onNavyMuted}
                  />
                </View>

                {showLabels && (
                  <View style={styles.itemTextWrap}>
                    <Text
                      style={[
                        styles.itemLabel,
                        active && styles.itemLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {showHints && (
                      <Text style={styles.itemHint} numberOfLines={1}>
                        {item.hint}
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>

              {showLabels && i < SALES_MENU.length - 1 && (
                <View style={styles.itemDivider} />
              )}
            </Fragment>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed, hovered }) => [
            styles.logoutBtn,
            collapsed && styles.logoutBtnCollapsed,
            (pressed || hovered) && styles.logoutBtnPressed,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={styles.iconSize}
            color="#FFF"
          />
          {showLabels && <Text style={styles.logoutLabel}>Log out</Text>}
        </Pressable>

        {showLabels && (
          <View style={styles.footerMeta}>
            <Text style={styles.footerStore}>{storeName}</Text>
            <Text style={styles.footerCopy}>
              © {new Date().getFullYear()} All Rights Reserved
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
