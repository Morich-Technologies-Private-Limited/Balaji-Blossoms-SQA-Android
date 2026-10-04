/**
 * Date helpers for the quotation loading date.
 *
 * The backend binds loadingDate with @DateTimeFormat(pattern = "yyyy-MM-dd"),
 * so every date that goes out is formatted from the device's *local* calendar
 * fields. `toISOString()` is deliberately not used: it converts to UTC first,
 * which rolls the date back a day for any IST time before 05:30 — a loading
 * date set late at night would be saved as the day before.
 */

const pad = (value) => String(value).padStart(2, "0");

/** A Date, an ISO string or an epoch number → Date, or null if unusable. */
export const parseDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  /* A bare yyyy-MM-dd is read as UTC midnight by `new Date`, which lands on the
     previous day for anyone behind UTC. It was written off a local calendar, so
     it is read back onto one. */
  if (typeof value === "string") {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** yyyy-MM-dd, read off the local calendar. The wire format. */
export const toApiDate = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
};

/** dd-mm-yyyy — how dates read everywhere on screen. */
export const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return "—";
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
};

/** Midnight local, so two dates compare by day and not by time of day. */
export const startOfDay = (value) => {
  const date = parseDate(value) ?? new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const isSameDay = (a, b) => {
  const left = parseDate(a);
  const right = parseDate(b);
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

/** Month arithmetic that never overflows (31 Jan + 1 month → 28/29 Feb). */
export const addMonths = (value, delta) => {
  const date = startOfDay(value);
  const target = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
};
