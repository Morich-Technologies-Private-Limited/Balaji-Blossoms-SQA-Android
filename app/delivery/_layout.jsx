import { Stack, usePathname } from "expo-router";
import RequireAuth from "../../components/auth/RequireAuth";
import DeliveryLayout from "../../components/sidebars/DeliveryLayout";
import { DELIVERY_MENU } from "../../components/sidebars/DeliverySidebar";

export default function DeliveryStackLayout() {
  const pathname = usePathname();
  const active = DELIVERY_MENU.find((item) => item.route === pathname);

  return (
    <RequireAuth>
      <DeliveryLayout
        title={active?.label ?? "Delivery"}
        subtitle={active?.hint}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </DeliveryLayout>
    </RequireAuth>
  );
}
