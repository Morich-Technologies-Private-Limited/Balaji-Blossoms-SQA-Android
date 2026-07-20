import { Stack, usePathname } from "expo-router";
import SalesLayout from "../../components/sidebars/SalesLayout";
import { SALES_MENU } from "../../components/sidebars/SalesSidebar";

/**
 * SalesLayout lives here rather than inside each screen, so the sidebar
 * mounts once for the whole /sales section. Collapse state and drawer
 * animation survive navigation instead of resetting on every push.
 *
 * Title comes from SALES_MENU, keyed on the active route — one source of
 * truth for what each screen is called.
 */
export default function SalesStackLayout() {
  const pathname = usePathname();
  const active = SALES_MENU.find((item) => item.route === pathname);

  return (
    <SalesLayout title={active?.label ?? "Sales"} subtitle={active?.hint}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </SalesLayout>
  );
}
