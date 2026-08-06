import { Stack } from "expo-router";
import { View } from "react-native";
import OrientationToggleButton from "@/components/OrientationToggleButton";

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <OrientationToggleButton />
    </View>
  );
}
