import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StatusBar, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";

const LANDSCAPE_ORIENTATIONS = [
  ScreenOrientation.Orientation.LANDSCAPE_LEFT,
  ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
];

export default function OrientationToggleButton() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    ScreenOrientation.getOrientationAsync().then((orientation) => {
      setIsLandscape(LANDSCAPE_ORIENTATIONS.includes(orientation));
    });

    const subscription = ScreenOrientation.addOrientationChangeListener(
      ({ orientationInfo }) => {
        setIsLandscape(LANDSCAPE_ORIENTATIONS.includes(orientationInfo.orientation));
      }
    );

    return () => ScreenOrientation.removeOrientationChangeListener(subscription);
  }, []);

  const toggleOrientation = useCallback(async () => {
    await ScreenOrientation.lockAsync(
      isLandscape
        ? ScreenOrientation.OrientationLock.PORTRAIT_UP
        : ScreenOrientation.OrientationLock.LANDSCAPE
    );
  }, [isLandscape]);

  return (
    <Pressable
      onPress={toggleOrientation}
      style={styles.button}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isLandscape ? "Switch to portrait view" : "Switch to landscape view"}
    >
      <Ionicons
        name={isLandscape ? "phone-portrait-outline" : "phone-landscape-outline"}
        size={22}
        color="#0F4776"
      />
    </Pressable>
  );
}

const TOP_OFFSET =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + 8 : 48;

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: TOP_OFFSET,
    right: 12,
    zIndex: 999,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
