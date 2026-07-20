import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { login } from "../../api/authApi";
import logo from "../../assets/images/logo.png";
import { saveLoginData } from "../../utility/secureStorage";
import { makeStyles } from "./Login.styles";

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { width } = useWindowDimensions();

  // breakpoints
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;

  const styles = makeStyles({ width, isTablet, isDesktop });

  const navigateByRole = (role) => {
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
        Alert.alert("Error", "Unknown user role.");
    }
  };

  const handleLogin = async () => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter User ID and Password.");
      return;
    }

    try {
      setLoading(true);

      const response = await login(userId, password);

      if (response.status !== "SUCCESS") {
        Alert.alert("Login Failed", response.message || "Invalid credentials.");
        return;
      }

      await saveLoginData(response.payload);

      Alert.alert("Success", `Welcome ${response.payload.name}`);

      navigateByRole(response.payload.role);
    } catch (error) {
      Alert.alert("Login Failed", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>Billing & Quotation</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.inputWrap}>
          <Ionicons
            name="person-outline"
            size={styles.iconSize}
            color="#94A3B8"
          />
          <TextInput
            style={styles.input}
            placeholder="User ID"
            placeholderTextColor="#94A3B8"
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputWrap}>
          <Ionicons
            name="lock-closed-outline"
            size={styles.iconSize}
            color="#94A3B8"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={styles.iconSize}
              color="#94A3B8"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>© 2026 Balaji Blossoms</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
