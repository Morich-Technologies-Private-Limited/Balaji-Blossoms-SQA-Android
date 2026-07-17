import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { getCurrentRole, isLoggedIn } from "../../utility/secureStorage";

export default function Index() {
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const loggedIn = await isLoggedIn();

        if (!loggedIn) {
          router.replace("/auth/Login");
          return;
        }

        const role = await getCurrentRole();

        switch (role) {
          case "ADMIN":
            router.replace("/admin");
            break;

          case "SALES":
            router.replace("/sales");
            break;

          case "DELIVERY_MANAGER":
            router.replace("/delivery");
            break;

          case "INVENTORY_MANAGER":
            router.replace("/inventory");
            break;

          case "BILLING_MANAGER":
            router.replace("/billing");
            break;

          case "SEEDING_MANAGER":
            router.replace("/seeding");
            break;

          default:
            router.replace("/auth/Login");
        }
      } catch (error) {
        console.error("Auto Login Error:", error);
        router.replace("/auth/Login");
      }
    };

    checkLogin();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
      }}
    >
      <ActivityIndicator size="large" color="#14B8A6" />
    </View>
  );
}
