// components/RequireAuth.jsx
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import useAuthCheck from "../../hooks/useAuthCheck";

export default function RequireAuth({ children }) {
  const status = useAuthCheck();

  if (status === "checking") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === "out") return <Redirect href="/auth/Login" />;

  return children;
}
