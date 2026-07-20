import { useRouter } from "expo-router";
import { useCallback } from "react";
import QuotationViewList from "../../components/quotation/QuotationViewList";

export default function MyQuotationScreen() {
  const router = useRouter();

  const handleSelect = useCallback(
    (quotation) => {
      router.push({
        pathname: "/quotation/details",
        params: { quotationId: quotation.quotationId },
      });
    },
    [router],
  );

  return <QuotationViewList mode="user" onSelect={handleSelect} />;
}
