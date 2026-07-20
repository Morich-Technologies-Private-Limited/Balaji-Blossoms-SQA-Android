import { useRouter } from "expo-router";
import { useCallback } from "react";
import QuotationViewList from "../../components/quotation/QuotationViewList";

export default function UnitQuotationScreen() {
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

  return <QuotationViewList mode="unit" onSelect={handleSelect} />;
}
