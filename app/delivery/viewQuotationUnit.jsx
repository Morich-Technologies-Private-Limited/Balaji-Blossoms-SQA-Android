import QuotationViewList from "../../components/quotation/QuotationViewList";

/**
 * View Quotation (Unit) — every quotation in the operator's unit, read/edit.
 * Bare screen: the sidebar + header come from app/delivery/_layout.jsx.
 */
export default function ViewQuotationUnitScreen() {
  return <QuotationViewList mode="unit" />;
}
