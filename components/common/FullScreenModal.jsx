import { Modal, StyleSheet } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

/**
 * FullScreenModal
 *
 * A slide-up <Modal> whose content stays clear of the status bar, the
 * gesture/navigation bar and any display cut-out. The app runs edge-to-edge
 * on Android, so a plain Modal draws its header under the status bar and its
 * footer under the gesture bar.
 *
 * A Modal is a separate native window, so it gets its own SafeAreaProvider.
 *
 * @param {boolean}  visible
 * @param {Function} onRequestClose  Android back button
 * @param {string}   background      colour shown behind the system bars
 */
export default function FullScreenModal({
  visible,
  onRequestClose,
  background = "#FFFFFF",
  children,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.root, { backgroundColor: background }]}
          edges={["top", "bottom", "left", "right"]}
        >
          {children}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
