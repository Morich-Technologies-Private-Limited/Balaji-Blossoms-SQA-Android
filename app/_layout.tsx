import { Stack } from "expo-router";
import { View } from "react-native";
import AnimatedSplash from "@/components/animated-splash";
import OrientationToggleButton from "@/components/OrientationToggleButton";

export default function RootLayout() {
  return (
    <AnimatedSplash>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
        <OrientationToggleButton />
      </View>
    </AnimatedSplash>
  );
}
