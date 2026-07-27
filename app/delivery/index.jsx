import { Redirect } from "expo-router";

/**
 * /delivery has no screen of its own — it lands on the first menu item.
 * Redirect (not router.replace in an effect) so there is no flash of an empty
 * screen and no entry added to the history stack.
 */
export default function DeliveryIndex() {
  return <Redirect href="/delivery/viewQuotationUnit" />;
}
