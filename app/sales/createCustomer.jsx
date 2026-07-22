import { useRouter } from "expo-router";
import { useCallback } from "react";
import CreateCustomer from "../../components/customer/CreateCustomer";

export default function CreateCustomerScreen() {
  const router = useRouter();

  const handleCreated = useCallback(
    (customer) => {
      // Saved — hand the new id back to whatever opened this screen.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace({
          pathname: "/sales/myQuotation",
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
    else router.replace("/sales");
  }, [router]);

  return <CreateCustomer onCreated={handleCreated} onCancel={handleCancel} />;
}
