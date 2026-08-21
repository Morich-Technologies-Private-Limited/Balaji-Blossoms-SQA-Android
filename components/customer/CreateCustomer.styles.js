/* ==================================================================
   CreatePaymentModal.module.css
   Professional, restrained finance UI. Ink primary, red for the
   outstanding balance, green for a settled invoice.

   Layout: dialog is a flex column with three regions —
     header (pinned)  ·  body (scrolls)  ·  footer (pinned).
   The action buttons stay visible no matter how many split rows
   are added. Drop-in — same class names as the JSX.
   ================================================================== */

.backdrop {
  --pm-surface: #ffffff;
  --pm-surface-alt: #f9fafb;
  --pm-border: #e8eaee;
  --pm-border-strong: #d3d7de;

  --pm-text: #111827;
  --pm-text-muted: #6b7280;
  --pm-text-soft: #9aa2af;

  --pm-ink: #111827;            /* primary action */
  --pm-ink-hover: #1f2937;
  --pm-ring: rgba(17, 24, 39, 0.14);

  --pm-danger: #dc2626;         /* the outstanding balance */
  --pm-danger-strong: #b91c1c;
  --pm-danger-bg: #fef2f2;
  --pm-danger-tint: #fef6f6;
  --pm-danger-border: #f4cccc;

  --pm-success: #047857;
  --pm-success-bg: #ecfdf5;
  --pm-success-border: #a7f3d0;

  --pm-muted-bg: #f2f4f7;

  --pm-radius: 16px;
  --pm-radius-md: 12px;
  --pm-radius-sm: 10px;

  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.45);
  backdrop-filter: blur(4px);
  animation: pm-fade 0.16s ease;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

@keyframes pm-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog {
  width: 100%;
  max-width: 720px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;               /* regions manage their own scroll */
  background: var(--pm-surface);
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius);
  box-shadow:
    0 1px 1px rgba(17, 24, 39, 0.04),
    0 10px 24px rgba(17, 24, 39, 0.10),
    0 24px 56px rgba(17, 24, 39, 0.10);
  animation: pm-rise 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pm-rise {
  from { transform: translateY(10px) scale(0.99); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

/* ------------------------------------------------------------------ */
/* Header (pinned)                                                     */
/* ------------------------------------------------------------------ */

.header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 22px 26px 18px;
  background: var(--pm-surface);
  border-bottom: 1px solid var(--pm-border);
}

.headerIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--pm-ink);
  color: #fff;
}

.headerText {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 1.06rem;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--pm-text);
}

.subtitle {
  margin: 3px 0 0;
  font-size: 0.82rem;
  color: var(--pm-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invNo {
  font-weight: 600;
  color: var(--pm-text);
  font-variant-numeric: tabular-nums;
}

.dot {
  margin: 0 7px;
  color: var(--pm-text-soft);
}

.closeBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: none;
  border-radius: 9px;
  background: none;
  color: var(--pm-text-soft);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.closeBtn:hover:not(:disabled) {
  background: var(--pm-muted-bg);
  color: var(--pm-text);
}

.closeBtn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ------------------------------------------------------------------ */
/* Body (scrolls)                                                      */
/* ------------------------------------------------------------------ */

.body {
  flex: 1 1 auto;
  min-height: 0;                  /* required so it can shrink & scroll */
  overflow-y: auto;
  padding: 22px 26px 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.body::-webkit-scrollbar { width: 8px; }
.body::-webkit-scrollbar-thumb {
  background: var(--pm-border-strong);
  border-radius: 8px;
  border: 2px solid var(--pm-surface);
}

/* Summary stat strip ---------------------------------------------- */

.summaryCard {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius-md);
  background: var(--pm-surface);
  overflow: hidden;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-right: 1px solid var(--pm-border);
}

.stat:last-child { border-right: none; }

.statLabel {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pm-text-soft);
}

.statValue {
  font-size: 1.02rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  color: var(--pm-text);
}

.statValueLg {
  font-size: 1.24rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: var(--pm-text);
}

/* Remaining = outstanding, shown in red */
.statRemaining {
  background: var(--pm-danger-tint);
  box-shadow: inset 2px 0 0 var(--pm-danger);
}

.statRemaining .statValueLg { color: var(--pm-danger-strong); }

/* Remaining when fully paid off */
.statSettled {
  background: var(--pm-success-bg);
  box-shadow: inset 2px 0 0 var(--pm-success);
}

.statSettled .statValueLg { color: var(--pm-success); }

/* Sections --------------------------------------------------------- */

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sectionHead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.sectionTitle {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pm-text-muted);
}

.sectionHint {
  font-size: 0.78rem;
  color: var(--pm-text-soft);
}

/* Splits ----------------------------------------------------------- */

.splits {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* Rows scroll within their own area once several are added, so the
     summary above and remark below stay in place. Padding + negative
     margin keep the focus ring from being clipped by overflow. */
  max-height: 244px;
  overflow-y: auto;
  padding: 4px;
  margin: -4px;
}

.splits::-webkit-scrollbar { width: 8px; }
.splits::-webkit-scrollbar-thumb {
  background: var(--pm-border-strong);
  border-radius: 8px;
  border: 2px solid var(--pm-surface);
}

.splitRow {
  display: grid;
  grid-template-columns: 28px 1.35fr 1fr 40px;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--pm-border);
  border-radius: var(--pm-radius-sm);
  background: var(--pm-surface);
  transition: border-color 0.14s, box-shadow 0.14s;
}

.splitRow:focus-within {
  border-color: var(--pm-ink);
  box-shadow: 0 0 0 3px var(--pm-ring);
}

.splitRowError {
  border-color: var(--pm-danger-border);
  background: var(--pm-danger-tint);
}

.splitIndex {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--pm-muted-bg);
  color: var(--pm-text-muted);
  font-size: 0.76rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.amountWrap {
  position: relative;
  display: flex;
  align-items: center;
}

.currencyPrefix {
  position: absolute;
  left: 12px;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--pm-text-soft);
  pointer-events: none;
}

.amountInput {
  width: 100%;
  height: 42px;
  padding: 0 12px 0 27px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 9px;
  font-size: 0.95rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--pm-text);
  background: var(--pm-surface);
  transition: border-color 0.14s, box-shadow 0.14s;
}

.amountInput::-webkit-outer-spin-button,
.amountInput::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.amountInput { -moz-appearance: textfield; }

.amountInput:focus {
  outline: none;
  border-color: var(--pm-ink);
  box-shadow: 0 0 0 3px var(--pm-ring);
}

.selectWrap {
  position: relative;
  display: flex;
}

.select {
  width: 100%;
  height: 42px;
  padding: 0 32px 0 13px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 9px;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--pm-text);
  background: var(--pm-surface);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239aa2af' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.select:focus {
  outline: none;
  border-color: var(--pm-ink);
  box-shadow: 0 0 0 3px var(--pm-ring);
}

/* Only the collapsed control shows muted text before a mode is chosen. */
.selectPlaceholder { color: var(--pm-text-soft); }

/* Keep the open option list readable — Chrome otherwise inherits the
   placeholder's gray onto every option, making them look disabled. */
.select option {
  color: var(--pm-text);
  background: var(--pm-surface);
  font-weight: 500;
}

.select option:disabled {
  color: var(--pm-text-soft);
}

.removeRowBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 42px;
  border: none;
  border-radius: 9px;
  background: none;
  color: var(--pm-text-soft);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.removeRowBtn:hover:not(:disabled) {
  background: var(--pm-danger-bg);
  color: var(--pm-danger);
}

.removeRowBtn:disabled { opacity: 0.35; cursor: not-allowed; }

.addRowBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 8px 14px;
  border: 1px dashed var(--pm-border-strong);
  border-radius: var(--pm-radius-sm);
  background: none;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--pm-text);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}

.addRowBtn:hover {
  background: var(--pm-muted-bg);
  border-color: var(--pm-text-muted);
}

/* Footer row: add-mode button + live "left to allocate" figure ----- */

.splitFooter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.leftHint {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--pm-text-muted);
  font-variant-numeric: tabular-nums;
}

.leftAmt {
  font-size: 0.95rem;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--pm-text);
}

.leftLabel { color: var(--pm-text-muted); }

.leftDone {
  align-items: center;
  color: var(--pm-success);
  font-weight: 600;
}

.leftDone svg { flex-shrink: 0; }

/* Field / validation error ---------------------------------------- */

.fieldError {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: -2px 0 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--pm-danger);
}

.fieldError svg { flex-shrink: 0; }

/* Textarea --------------------------------------------------------- */

.textarea {
  width: 100%;
  padding: 11px 13px;
  border: 1px solid var(--pm-border-strong);
  border-radius: var(--pm-radius-sm);
  font-family: inherit;
  font-size: 0.91rem;
  color: var(--pm-text);
  background: var(--pm-surface);
  resize: vertical;
  min-height: 56px;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.textarea::placeholder { color: var(--pm-text-soft); }

.textarea:focus {
  outline: none;
  border-color: var(--pm-ink);
  box-shadow: 0 0 0 3px var(--pm-ring);
}

/* Error note ------------------------------------------------------- */

.errorNote {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 14px;
  border: 1px solid var(--pm-danger-border);
  border-radius: var(--pm-radius-sm);
  background: var(--pm-danger-bg);
  color: var(--pm-danger-strong);
  font-size: 0.85rem;
  line-height: 1.45;
}

.errorNote svg { flex-shrink: 0; margin-top: 2px; }

/* Success banner --------------------------------------------------- */

.successBanner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px 16px;
  border: 1px solid var(--pm-success-border);
  border-radius: var(--pm-radius-md);
  background: var(--pm-success-bg);
  color: var(--pm-success);
}

.successIcon { flex-shrink: 0; margin-top: 1px; }

.successCopy { min-width: 0; }

.successTitle {
  margin: 0;
  font-size: 0.94rem;
  font-weight: 700;
}

.successText {
  margin: 3px 0 0;
  font-size: 0.84rem;
  opacity: 0.92;
}

/* ------------------------------------------------------------------ */
/* Footer (pinned) — action buttons always visible                    */
/* ------------------------------------------------------------------ */

.footer {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 26px;
  background: var(--pm-surface);
  border-top: 1px solid var(--pm-border);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 44px;
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: var(--pm-radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.08s;
}

.btn:active:not(:disabled) { transform: translateY(1px); }

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--pm-ring);
}

.btnPrimary {
  background: var(--pm-ink);
  color: #fff;
}

.btnPrimary:hover:not(:disabled) {
  background: var(--pm-ink-hover);
}

.btnSecondary {
  background: var(--pm-surface);
  border-color: var(--pm-border-strong);
  color: var(--pm-text);
}

.btnSecondary:hover:not(:disabled) {
  background: var(--pm-muted-bg);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Spinner ---------------------------------------------------------- */

.spin { animation: pm-spin 0.7s linear infinite; }

@keyframes pm-spin {
  to { transform: rotate(360deg); }
}

/* ------------------------------------------------------------------ */
/* Responsive                                                          */
/* ------------------------------------------------------------------ */

@media (max-width: 600px) {
  .backdrop { padding: 0; align-items: flex-end; }

  .dialog {
    max-width: 100%;
    max-height: 94vh;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .header { padding: 18px 20px 14px; }
  .body { padding: 18px 20px 20px; }
  .footer { padding: 14px 20px; }

  /* Stat strip stacks on phones */
  .summaryCard { flex-direction: column; }

  .stat {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 13px 16px;
    border-right: none;
    border-bottom: 1px solid var(--pm-border);
  }

  .stat:last-child { border-bottom: none; }

  .statRemaining { box-shadow: inset 0 2px 0 var(--pm-danger); }
  .statSettled { box-shadow: inset 0 2px 0 var(--pm-success); }

  .splitRow {
    grid-template-columns: 24px 1fr 1fr 36px;
    gap: 8px;
  }

  .footer { flex-direction: column-reverse; }
  .btn { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .backdrop, .dialog, .spin { animation: none; transition: none; }
}