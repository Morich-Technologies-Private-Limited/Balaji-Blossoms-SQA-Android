import { useRouter } from "expo-router";
import { useCallback } from "react";
import CreateCustomer from "../../components/customer/CreateCustomer";

/**
 * Create Customer (delivery section). Renders the shared CreateCustomer form;
 * the sidebar + header come from app/delivery/_layout.jsx. On save or cancel it
 * goes back to wherever it was opened from, falling back into the delivery
 * section rather than sales.
 */
export default function CreateCustomerScreen() {
  const router = useRouter();

  const handleCreated = useCallback(
    (customer) => {
      // Saved — hand the new id back to whatever opened this screen.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({
          pathname: "/delivery/viewQuotationUnit",
          params: customer?.customerId
            ? { createdCustomerId: customer.customerId }
            : undefined,
        });
      }
    },
    [router],
  );

  const handleCancel = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/delivery");
  }, [router]);

  return <CreateCustomer onCreated={handleCreated} onCancel={handleCancel} />;
}
