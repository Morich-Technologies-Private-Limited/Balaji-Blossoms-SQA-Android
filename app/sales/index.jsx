import { Redirect } from "expo-router";

/**
 * /sales has no screen of its own — it lands on the first menu item.
 * Redirect (not router.replace in an effect) so there is no flash of
 * an empty screen and no entry added to the history stack.
 */
export default function SalesIndex() {
  return <Redirect href="/sales/myQuotation" />;
}
