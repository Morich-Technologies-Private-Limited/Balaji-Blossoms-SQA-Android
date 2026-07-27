import InvoiceList from "../../components/invoice/InvoiceList";

/**
 * My Invoice screen (/sales/myInvoice).
 *
 * Renders the invoice list in "user" mode. There is no fetch-by-user endpoint,
 * so InvoiceList pulls the unit list and filters it down to the signed-in
 * user's own invoices. The list opens its own read-only viewer (View) on tap,
 * so this route is a thin wrapper with no navigation of its own.
 */
export default function MyInvoiceScreen() {
  return <InvoiceList mode="user" />;
}
