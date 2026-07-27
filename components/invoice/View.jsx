import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  View as RNView,
  ScrollView,
  Text,
  useWindowDimensions,
} from "react-native";

import { downloadInvoicePdf } from "../../api/downloadPdfApis";
import PdfShareSheet from "../../utility/PdfShareSheet";
import { printPdf } from "../../utility/printPdf.js";
import makeStyles from "./View.styles.js";

const STATUS_META = {
  DUE: { label: "Due", tint: "#E8622C" },
  PARTIAL: { label: "Partial", tint: "#0F4776" },
  FULL: { label: "Paid", tint: "#5B8E2E" },
};

const TXN_META = {
  CREDIT: { label: "Credit", tint: "#5B8E2E", icon: "arrow-down-outline" },
  DEBIT: { label: "Debit", tint: "#E8622C", icon: "arrow-up-outline" },
};

/* plantType is a free-ish string: "special", "regular" or "seedling". Match
   the whole (normalised) value rather than a prefix — "special" and
   "seedling" both start with "s", so a startsWith("s") test conflates them. */
const PLANT_TYPE_META = {
  special: { label: "Special", key: "special" },
  seedling: { label: "Seedling", key: "seedling" },
  regular: { label: "Regular", key: "regular" },
};

const plantTypeOf = (item) => {
  const raw = String(item?.plantType || "")
    .trim()
    .toLowerCase();
  return PLANT_TYPE_META[raw] || PLANT_TYPE_META.regular;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${date.getFullYear()}`;
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

const statusOf = (inv) =>
  STATUS_META[inv?.paymentStatus] || {
    label: inv?.paymentStatus || "—",
    tint: "#94A3B8",
  };

const txnOf = (txn) =>
  TXN_META[txn?.transactionType] || {
    label: txn?.transactionType || "—",
    tint: "#64748B",
    icon: "swap-horizontal-outline",
  };

/**
 * Invoice viewer.
 *
 * Read-only. Receives a full InvoiceDto as `invoice` and shows the item lines,
 * the transaction ledger and a payment summary. There are no mutating actions
 * here — the only things it does are Print (opens the invoice PDF for printing)
 * and Share (hands the same PDF bytes to the shared PdfShareSheet). Both pull
 * from GET /pdf?invoiceId=.
 */
export default function View({ invoice, onClose, onError }) {
  const { width } = useWindowDimensions();
  const isCardMode = width < 620;
  const isTablet = width >= 600 && width < 1024;
  const isDesktop = width >= 1024;

  const styles = useMemo(
    () => makeStyles({ width, isTablet, isDesktop, isCardMode }),
    [width, isTablet, isDesktop, isCardMode],
  );
  const C = styles.colors;

  const [busy, setBusy] = useState(null); // 'print' | 'share'
  const [error, setLocalError] = useState(null);
  const [pdf, setPdf] = useState(null);

  const raise = useCallback(
    (message) => {
      setLocalError(message);
      onError?.(message);
    },
    [onError],
  );

  const id = invoice?.invoiceId;
  const remaining = Number(invoice?.remainingPayment || 0);
  const settled = remaining <= 0;

  const items = invoice?.itemList || [];
  const transactions = invoice?.transactions || [];

  /* ── pdf: shared download used by both print and share ────────────────── */
  const getPdfBytes = useCallback(async () => {
    const response = await downloadInvoicePdf(id);
    if (response?.status !== "SUCCESS" || !response.payload) {
      raise(response?.message || "The invoice PDF could not be downloaded.");
      return null;
    }
    return response.payload;
  }, [id, raise]);

  const onPrint = useCallback(async () => {
    if (busy) return;
    setLocalError(null);
    setBusy("print");
    const file = await getPdfBytes();
    if (file) {
      try {
        await printPdf(file);
      } catch (e) {
        raise("Could not open the print dialog.");
      }
    }
    setBusy(null);
  }, [busy, getPdfBytes, raise]);

  const onShare = useCallback(async () => {
    if (busy) return;
    setLocalError(null);
    setBusy("share");
    const file = await getPdfBytes();
    setBusy(null);
    if (!file) return;

    const line = `INV-${id}${
      invoice?.customerName ? ` · ${invoice.customerName}` : ""
    }`;
    setPdf({
      title: "Invoice",
      subtitle: line,
      message: `Invoice for ${line}`,
      file,
    });
  }, [busy, getPdfBytes, id, invoice]);

  /* ── header ───────────────────────────────────────────────────────────── */
  const statusMeta = statusOf(invoice);

  const header = (
    <RNView style={styles.header}>
      <Pressable style={styles.closeBtn} hitSlop={8} onPress={onClose}>
        <Ionicons name="arrow-back" size={22} color={C.NAVY} />
      </Pressable>

      <RNView style={styles.headerText}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {invoice?.customerName || "Unnamed customer"}
        </Text>
        <RNView style={styles.headerMeta}>
          <Text style={styles.headerSub}>INV-{id}</Text>
          <Text style={styles.headerDot}>·</Text>
          <Text style={styles.headerSub}>{formatDate(invoice?.createdAt)}</Text>
        </RNView>
      </RNView>

      <RNView style={styles.headerBadges}>
        <RNView
          style={[
            styles.pill,
            {
              backgroundColor: `${statusMeta.tint}14`,
              borderColor: `${statusMeta.tint}33`,
            },
          ]}
        >
          <RNView
            style={[styles.pillDot, { backgroundColor: statusMeta.tint }]}
          />
          <Text style={[styles.pillText, { color: statusMeta.tint }]}>
            {statusMeta.label}
          </Text>
        </RNView>
      </RNView>
    </RNView>
  );

  /* ── payment summary ──────────────────────────────────────────────────── */
  const summary = (
    <RNView style={styles.summary}>
      <RNView style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Total</Text>
        <Text style={styles.summaryValue}>
          {formatAmount(invoice?.totalPayment)}
        </Text>
      </RNView>
      <RNView style={styles.summaryDivider} />
      <RNView style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Deposited</Text>
        <Text style={[styles.summaryValue, { color: C.GREEN }]}>
          {formatAmount(invoice?.paymentDeposited)}
        </Text>
      </RNView>
      <RNView style={styles.summaryDivider} />
      <RNView style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Remaining</Text>
        <Text
          style={[styles.summaryValue, { color: settled ? C.GREEN : C.ORANGE }]}
        >
          {formatAmount(remaining)}
        </Text>
      </RNView>
    </RNView>
  );

  /* ── meta strip ───────────────────────────────────────────────────────── */
  const metaStrip = (
    <RNView style={styles.metaStrip}>
      {[
        {
          label: "Sales person",
          text: invoice?.assignedUserName || "Unassigned",
        },
        { label: "Unit", text: invoice?.unitName || "—" },
        { label: "Mobile", text: invoice?.customerNumber || "—" },
        { label: "Regular", text: String(invoice?.regularPlants ?? 0) },
        { label: "Special", text: String(invoice?.specialPlants ?? 0) },
        { label: "Transport", text: formatAmount(invoice?.transportationCost) },
        {
          label: "Extra discount",
          text: formatAmount(invoice?.additionalDiscount),
        },
      ].map((m) => (
        <RNView key={m.label} style={styles.metaCell}>
          <Text style={styles.metaLabel}>{m.label}</Text>
          <Text style={styles.metaText}>{m.text}</Text>
        </RNView>
      ))}
    </RNView>
  );

  /* ── items ────────────────────────────────────────────────────────────── */
  const itemsHead = !isCardMode ? (
    <RNView style={styles.itemHead}>
      <Text style={[styles.itemHeadCell, styles.colSno]}>#</Text>
      <Text style={[styles.itemHeadCell, styles.colName]}>Plant</Text>
      <Text style={[styles.itemHeadCell, styles.colType]}>Type</Text>
      <Text style={[styles.itemHeadCell, styles.colNum]}>Qty</Text>
      <Text style={[styles.itemHeadCell, styles.colNum]}>Rate</Text>
      <Text style={[styles.itemHeadCell, styles.colNum]}>Packing</Text>
      <Text style={[styles.itemHeadCell, styles.colNum]}>Amount</Text>
      <Text style={[styles.itemHeadCell, styles.colTotal]}>Total</Text>
    </RNView>
  ) : null;

  const renderItemRow = (item, index) => {
    const type = plantTypeOf(item);
    const emphasise = type.key !== "regular"; // special & seedling get the accent tag
    if (isCardMode) {
      return (
        <RNView key={index} style={styles.itemCard}>
          <RNView style={styles.itemCardTop}>
            <Text numberOfLines={1} style={styles.itemName}>
              {item.plantName || "—"}
            </Text>
            <RNView
              style={[
                styles.typeTag,
                { borderColor: emphasise ? `${C.NAVY}33` : `${C.MUTED}33` },
              ]}
            >
              <Text
                style={[
                  styles.typeTagText,
                  { color: emphasise ? C.NAVY : C.MUTED },
                ]}
              >
                {type.label}
              </Text>
            </RNView>
          </RNView>
          <RNView style={styles.itemCardGrid}>
            <RNView style={styles.itemCardMeta}>
              <Text style={styles.metaLabel}>Qty</Text>
              <Text style={styles.metaText}>{item.quantity ?? 0}</Text>
            </RNView>
            {type.key === "seedling" ? (
              <RNView style={styles.itemCardMeta}>
                <Text style={styles.metaLabel}>Tray</Text>
                <Text style={styles.metaText}>
                  {item.trayDelivered ?? 0}/{item.traySize ?? 0}
                </Text>
              </RNView>
            ) : null}
            <RNView style={styles.itemCardMeta}>
              <Text style={styles.metaLabel}>Rate</Text>
              <Text style={styles.metaText}>{formatAmount(item.price)}</Text>
            </RNView>
            <RNView style={styles.itemCardMeta}>
              <Text style={styles.metaLabel}>Packing</Text>
              <Text style={styles.metaText}>
                {formatAmount(item.packingCharge)}
              </Text>
            </RNView>
            <RNView style={styles.itemCardMeta}>
              <Text style={styles.metaLabel}>Total</Text>
              <Text style={[styles.metaText, styles.itemTotal]}>
                {formatAmount(item.totalAmount)}
              </Text>
            </RNView>
          </RNView>
        </RNView>
      );
    }

    return (
      <RNView key={index} style={styles.itemRow}>
        <Text style={[styles.itemCell, styles.colSno]}>
          {item.sno ?? index + 1}
        </Text>
        <Text numberOfLines={1} style={[styles.itemCellStrong, styles.colName]}>
          {item.plantName || "—"}
        </Text>
        <RNView style={styles.colType}>
          <RNView
            style={[
              styles.typeTag,
              { borderColor: emphasise ? `${C.NAVY}33` : `${C.MUTED}33` },
            ]}
          >
            <Text
              style={[
                styles.typeTagText,
                { color: emphasise ? C.NAVY : C.MUTED },
              ]}
            >
              {type.label}
            </Text>
          </RNView>
        </RNView>
        <Text style={[styles.itemCell, styles.colNum]}>
          {item.quantity ?? 0}
        </Text>
        <Text style={[styles.itemCell, styles.colNum]}>
          {formatAmount(item.price)}
        </Text>
        <Text style={[styles.itemCell, styles.colNum]}>
          {formatAmount(item.packingCharge)}
        </Text>
        <Text style={[styles.itemCell, styles.colNum]}>
          {formatAmount(item.amount)}
        </Text>
        <Text
          style={[styles.itemCellStrong, styles.colTotal, styles.itemTotal]}
        >
          {formatAmount(item.totalAmount)}
        </Text>
      </RNView>
    );
  };

  /* ── transactions ─────────────────────────────────────────────────────── */
  const renderTxn = (txn, index) => {
    const meta = txnOf(txn);
    return (
      <RNView key={txn.transactionId ?? index} style={styles.txnRow}>
        <RNView style={[styles.txnIcon, { backgroundColor: `${meta.tint}14` }]}>
          <Ionicons name={meta.icon} size={16} color={meta.tint} />
        </RNView>
        <RNView style={styles.txnBody}>
          <Text numberOfLines={1} style={styles.txnDesc}>
            {txn.description || meta.label}
          </Text>
          <Text style={styles.txnSub}>
            {formatDate(txn.date)}
            {txn.level ? ` · ${txn.level}` : ""}
          </Text>
        </RNView>
        <Text style={[styles.txnAmount, { color: meta.tint }]}>
          {formatAmount(txn.amount)}
        </Text>
      </RNView>
    );
  };

  return (
    <RNView style={styles.screen}>
      {header}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {summary}
        {metaStrip}

        {error ? (
          <RNView style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={C.ORANGE} />
            <Text style={styles.errorText}>{error}</Text>
          </RNView>
        ) : null}

        {/* items */}
        <RNView style={styles.section}>
          <RNView style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Items</Text>
            <Text style={styles.sectionCount}>{items.length}</Text>
          </RNView>
          <RNView style={styles.sectionBody}>
            {itemsHead}
            {items.length > 0 ? (
              items.map(renderItemRow)
            ) : (
              <Text style={styles.emptyLine}>No items on this invoice.</Text>
            )}
          </RNView>
        </RNView>

        {/* transactions */}
        <RNView style={styles.section}>
          <RNView style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <Text style={styles.sectionCount}>{transactions.length}</Text>
          </RNView>
          <RNView style={styles.sectionBody}>
            {transactions.length > 0 ? (
              transactions.map(renderTxn)
            ) : (
              <Text style={styles.emptyLine}>
                No transactions recorded yet.
              </Text>
            )}
          </RNView>
        </RNView>
      </ScrollView>

      {/* action bar — read-only: two full-width buttons, Print and Share */}
      <RNView style={styles.actionBar}>
        <Pressable
          style={[styles.barBtn, styles.barGhost, { flex: 1 }]}
          onPress={onPrint}
          disabled={!!busy}
        >
          {busy === "print" ? (
            <ActivityIndicator size="small" color={C.NAVY} />
          ) : (
            <Ionicons name="print-outline" size={18} color={C.NAVY} />
          )}
          <Text style={styles.barGhostText}>Print</Text>
        </Pressable>

        <Pressable
          style={[styles.barBtn, styles.barPrimary, { flex: 1 }]}
          onPress={onShare}
          disabled={!!busy}
        >
          {busy === "share" ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.barPrimaryText}>Share invoice</Text>
        </Pressable>
      </RNView>

      <PdfShareSheet
        file={pdf?.file}
        title={pdf?.title}
        subtitle={pdf?.subtitle}
        message={pdf?.message}
        onClose={() => setPdf(null)}
        onError={raise}
      />
    </RNView>
  );
}
