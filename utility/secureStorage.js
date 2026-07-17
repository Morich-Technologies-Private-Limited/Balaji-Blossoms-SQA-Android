import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN = "ACCESS_TOKEN";
const REFRESH_TOKEN = "REFRESH_TOKEN";
const USER = "USER";

export const saveLoginData = async (user) => {
  if (Platform.OS === "web") {
    localStorage.setItem(ACCESS_TOKEN, user.accessToken);
    localStorage.setItem(REFRESH_TOKEN, user.refreshToken);
    localStorage.setItem(USER, JSON.stringify(user));
    return;
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN, user.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN, user.refreshToken);
  await SecureStore.setItemAsync(USER, JSON.stringify(user));
};

export const getAccessToken = async () => {
  if (Platform.OS === "web") {
    return localStorage.getItem(ACCESS_TOKEN);
  }

  return await SecureStore.getItemAsync(ACCESS_TOKEN);
};

export const getCurrentUser = async () => {
  if (Platform.OS === "web") {
    const user = localStorage.getItem(USER);
    return user ? JSON.parse(user) : null;
  }

  const user = await SecureStore.getItemAsync(USER);
  return user ? JSON.parse(user) : null;
};

export const getCurrentRole = async () => {
  const user = await getCurrentUser();
  return user?.role;
};

export const isLoggedIn = async () => {
  const token = await getAccessToken();
  return !!token;
};

export const logout = async () => {
  if (Platform.OS === "web") {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem(USER);
    return;
  }

  await SecureStore.deleteItemAsync(ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(USER);
};
