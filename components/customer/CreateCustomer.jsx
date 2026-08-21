import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  Printer,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CreatePaymentModal.module.css";

import { createPaymentAgainstInvoice } from "../../api/createPaymentApi";
import { getInvoiceById, getInvoicePdf } from "../../api/fetchInvoice";

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatINR = (v) => inr.format(Number(v ?? 0));
const formatInvoiceNo = (id) => `INV-${String(id ?? 0).padStart(6, "0")}`;
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const isSuccess = (res) => res?.status === "SUCCESS";

// Must mirror com.balajiblossoms.sqa.enums.TransactionMode.
const MODES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "DD", label: "Demand draft" },
];

let rowSeq = 0;
const makeRow = (amount = "", mode = "") => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `row-${Date.now()}-${rowSeq++}`,
  amount: amount === "" ? "" : String(amount),
  mode,
});

/* ------------------------------------------------------------------ */
/* CreatePaymentModal                                                  */
/* ------------------------------------------------------------------ */

export default function CreatePaymentModal({ invoice, onClose, onUpdated }) {
  const [liveInvoice, setLiveInvoice] = useState(invoice);
  const remaining = Number(liveInvoice?.remainingPayment ?? 0);

  const [rows, setRows] = useState(() => [
    makeRow(remaining > 0 ? round2(remaining) : "", ""),
  ]);
  const [remark, setRemark] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [updatedInvoice, setUpdatedInvoice] = useState(null);
  const [printing, setPrinting] = useState(false);

  const firstAmountRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => firstAmountRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting && !printing) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting, printing]);

  /* --- allocation + validation -------------------------------------- */

  const allocated = useMemo(
    () => round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
    [rows],
  );
  const overAllocated = allocated > remaining + 0.001;
  const remainingAfter = round2(remaining - allocated);
  const isMultiSplit = rows.length > 1;

  const rowErrors = useMemo(
    () =>
      rows.map((r) => {
        const n = Number(r.amount);
        if (r.amount === "" || Number.isNaN(n)) return "Enter an amount.";
        if (n <= 0) return "Amount must be greater than zero.";
        if (!r.mode) return "Choose a payment mode.";
        return null;
      }),
    [rows],
  );

  const canSubmit =
    !submitting &&
    rows.length > 0 &&
    rowErrors.every((e) => e === null) &&
    allocated > 0 &&
    !overAllocated;

  /* --- row ops ------------------------------------------------------ */

  const patchRow = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setError(null);
  };

  const addRow = () => {
    const left = round2(remaining - allocated);
    setRows((prev) => [...prev, makeRow(left > 0 ? left : "", "")]);
    setError(null);
  };

  const removeRow = (id) => {
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.id !== id),
    );
    setError(null);
  };

  /* --- submit ------------------------------------------------------- */

  const refreshInvoice = async () => {
    const fresh = await getInvoiceById(invoice.invoiceId);
    return fresh?.payload ?? fresh?.data?.payload ?? fresh ?? invoice;
  };

  const handleSubmit = async () => {
    setAttempted(true);
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const pending = rows.map((r) => ({
      id: r.id,
      amount: round2(Number(r.amount)),
      mode: r.mode,
    }));
    const doneIds = [];
    let failure = null;

    for (const row of pending) {
      try {
        const res = await createPaymentAgainstInvoice(
          invoice.invoiceId,
          row.amount,
          remark.trim(),
          row.mode,
        );
        if (!isSuccess(res)) {
          failure = res?.message || "The payment could not be recorded.";
          break;
        }
        doneIds.push(row.id);
      } catch (e) {
        const modal = e?.response?.data;
        failure =
          modal?.message ||
          (Array.isArray(modal?.errorList) && modal.errorList[0]) ||
          e?.message ||
          "Something went wrong while recording the payment.";
        break;
      }
    }

    let fresh = null;
    if (doneIds.length > 0) {
      try {
        fresh = await refreshInvoice();
        setLiveInvoice(fresh);
        onUpdated?.(fresh);
      } catch {
        /* ignore refresh failure */
      }
    }

    if (!failure) {
      setUpdatedInvoice(fresh ?? (await refreshInvoice().catch(() => invoice)));
      setSubmitting(false);
      return;
    }

    const succeeded = new Set(doneIds);
    setRows((prev) => {
      const left = prev.filter((r) => !succeeded.has(r.id));
      return left.length ? left : [makeRow("", "")];
    });
    setError(
      doneIds.length > 0
        ? `Recorded ${doneIds.length} of ${pending.length} payment(s). ${failure} Please review the remaining line(s) and submit again.`
        : failure,
    );
    setSubmitting(false);
  };

  /* --- print -------------------------------------------------------- */

  const handlePrint = async () => {
    const target = updatedInvoice ?? invoice;
    setPrinting(true);
    setError(null);

    try {
      const blob = await getInvoicePdf(target.invoiceId);
      const url = URL.createObjectURL(blob);

      let frame = document.getElementById("iv-print-frame");
      if (!frame) {
        frame = document.createElement("iframe");
        frame.id = "iv-print-frame";
        frame.style.position = "fixed";
        frame.style.right = "0";
        frame.style.bottom = "0";
        frame.style.width = "0";
        frame.style.height = "0";
        frame.style.border = "0";
        document.body.appendChild(frame);
      }

      frame.onload = () => {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } catch {
          const a = document.createElement("a");
          a.href = url;
          a.download = `${target.customerName || "Invoice"}_${formatInvoiceNo(target.invoiceId)}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      };

      frame.src = url;
    } catch (e) {
      setError("Could not generate the invoice PDF. Please try again.");
    } finally {
      setPrinting(false);
    }
  };

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget && !submitting && !printing) onClose?.();
  };

  const showSuccess = updatedInvoice !== null;
  const freshRemaining = Number(updatedInvoice?.remainingPayment ?? 0);
  const isSettled = showSuccess && freshRemaining <= 0.001;

  return (
    <div className={styles.backdrop} onMouseDown={onBackdrop}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-title"
        ref={dialogRef}
      >
        {/* ---------------- HEADER (pinned) ---------------- */}
        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <Wallet size={18} aria-hidden="true" />
          </div>
          <div className={styles.headerText}>
            <h2 id="pay-title" className={styles.title}>
              {showSuccess ? "Payment recorded" : "Record payment"}
            </h2>
            <p className={styles.subtitle}>
              <span className={styles.invNo}>
                {formatInvoiceNo(invoice?.invoiceId)}
              </span>
              <span className={styles.dot} aria-hidden="true">
                •
              </span>
              {invoice?.customerName}
            </p>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={submitting || printing}
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* ---------------- SUCCESS / PRINT STEP ---------------- */}
        {showSuccess ? (
          <>
            <div className={styles.body}>
              <div
                className={`${styles.successBanner} ${isSettled ? styles.successBannerFull : ""}`}
              >
                <div className={styles.successIcon}>
                  <CheckCircle2 size={20} aria-hidden="true" />
                </div>
                <div className={styles.successCopy}>
                  <p className={styles.successTitle}>
                    {isSettled ? "Invoice fully settled" : "Payment added"}
                  </p>
                  <p className={styles.successText}>
                    {isSettled
                      ? "There is no outstanding balance on this invoice."
                      : `Remaining balance is now ${formatINR(freshRemaining)}.`}
                  </p>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Total</span>
                  <span className={styles.statValue}>
                    {formatINR(updatedInvoice?.totalPayment)}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Deposited</span>
                  <span className={styles.statValue}>
                    {formatINR(updatedInvoice?.paymentDeposited)}
                  </span>
                </div>
                <div
                  className={`${styles.stat} ${isSettled ? styles.statSettled : styles.statRemaining}`}
                >
                  <span className={styles.statLabel}>Remaining</span>
                  <span className={styles.statValueLg}>
                    {formatINR(freshRemaining)}
                  </span>
                </div>
              </div>

              {error && (
                <div className={styles.errorNote} role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={onClose}
                disabled={printing}
              >
                Done
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handlePrint}
                disabled={printing}
              >
                {printing ? (
                  <Loader2
                    size={17}
                    className={styles.spin}
                    aria-hidden="true"
                  />
                ) : (
                  <Printer size={17} aria-hidden="true" />
                )}
                {printing ? "Preparing…" : "Print invoice"}
              </button>
            </div>
          </>
        ) : (
          /* ---------------- PAYMENT FORM STEP ---------------- */
          <>
            <div className={styles.body}>
              <div className={styles.summaryCard}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Total</span>
                  <span className={styles.statValue}>
                    {formatINR(liveInvoice?.totalPayment)}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Already deposited</span>
                  <span className={styles.statValue}>
                    {formatINR(liveInvoice?.paymentDeposited)}
                  </span>
                </div>
                <div className={`${styles.stat} ${styles.statRemaining}`}>
                  <span className={styles.statLabel}>Remaining</span>
                  <span className={styles.statValueLg}>
                    {formatINR(remaining)}
                  </span>
                </div>
              </div>

              {/* ---- splits ---- */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionTitle}>Payment</span>
                  <span className={styles.sectionHint}>
                    {isMultiSplit
                      ? `${rows.length} modes`
                      : "Split across modes if needed"}
                  </span>
                </div>

                <div className={styles.splits}>
                  {rows.map((r, i) => {
                    const invalid = attempted && rowErrors[i];
                    return (
                      <div
                        className={`${styles.splitRow} ${invalid ? styles.splitRowError : ""}`}
                        key={r.id}
                      >
                        <span className={styles.splitIndex}>{i + 1}</span>

                        <div className={styles.amountWrap}>
                          <span className={styles.currencyPrefix}>₹</span>
                          <input
                            ref={i === 0 ? firstAmountRef : undefined}
                            className={styles.amountInput}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={r.amount}
                            onChange={(e) =>
                              patchRow(r.id, { amount: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && canSubmit)
                                handleSubmit();
                            }}
                            aria-label={`Amount for line ${i + 1}`}
                          />
                        </div>

                        <div className={styles.selectWrap}>
                          <select
                            className={`${styles.select} ${!r.mode ? styles.selectPlaceholder : ""}`}
                            value={r.mode}
                            onChange={(e) =>
                              patchRow(r.id, { mode: e.target.value })
                            }
                            aria-label={`Mode for line ${i + 1}`}
                          >
                            <option value="" disabled>
                              Select mode
                            </option>
                            {MODES.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          className={styles.removeRowBtn}
                          onClick={() => removeRow(r.id)}
                          disabled={rows.length <= 1}
                          aria-label={`Remove line ${i + 1}`}
                          title={rows.length <= 1 ? "" : "Remove line"}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {attempted && rowErrors.some(Boolean) && (
                  <p className={styles.fieldError}>
                    <AlertCircle size={13} aria-hidden="true" />
                    {rowErrors.find(Boolean)}
                  </p>
                )}

                {overAllocated && (
                  <p className={styles.fieldError}>
                    <AlertCircle size={13} aria-hidden="true" />
                    Payment exceeds the remaining balance by{" "}
                    {formatINR(allocated - remaining)}.
                  </p>
                )}

                <div className={styles.splitFooter}>
                  <button
                    type="button"
                    className={styles.addRowBtn}
                    onClick={addRow}
                  >
                    <Plus size={15} aria-hidden="true" />
                    Add another mode
                  </button>

                  {allocated > 0 &&
                    !overAllocated &&
                    (remainingAfter > 0.001 ? (
                      <span className={styles.leftHint}>
                        <span className={styles.leftAmt}>
                          {formatINR(remainingAfter)}
                        </span>
                        <span className={styles.leftLabel}>
                          left to allocate
                        </span>
                      </span>
                    ) : (
                      <span className={`${styles.leftHint} ${styles.leftDone}`}>
                        <CheckCircle2 size={14} aria-hidden="true" />
                        Fully allocated
                      </span>
                    ))}
                </div>
              </div>

              {/* ---- remark ---- */}
              <div className={styles.section}>
                <label htmlFor="pay-remark" className={styles.sectionTitle}>
                  Remark
                </label>
                <textarea
                  id="pay-remark"
                  className={styles.textarea}
                  rows={2}
                  placeholder="e.g. Cash on delivery, cheque no. 0451…"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>

              {error && (
                <div className={styles.errorNote} role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSubmit}
                disabled={submitting || overAllocated || allocated <= 0}
              >
                {submitting ? (
                  <Loader2
                    size={17}
                    className={styles.spin}
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={17} aria-hidden="true" />
                )}
                {submitting
                  ? "Recording…"
                  : isMultiSplit
                    ? `Record ${formatINR(allocated)}`
                    : "Record payment"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
