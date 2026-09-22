import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { addMonths, isSameDay, startOfDay } from "../../utility/dates";

/* ── palette (matches Edit.styles.js) ─────────────────────────────── */
const NAVY = "#0F4776";
const NAVY_DEEP = "#0B3358";
const NAVY_TINT = "#EAF2FA";
const ALERT = "#E8622C";
const SURFACE = "#FFFFFF";
const FILL = "#F7F9FC";
const BORDER = "#E5EAF1";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const FAINT = "#94A3B8";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* Always six rows. February starting on a Sunday needs only four, and paging
   into it would otherwise shrink the sheet under the operator's finger. */
const GRID_CELLS = 42;

/**
 * The six-week grid for a month: leading blanks up to the 1st, the days, then
 * trailing blanks. Weeks start on Sunday, which is what WEEKDAYS is labelled
 * for.
 */
const monthGrid = (cursor) => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length < GRID_CELLS) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

/**
 * A month calendar in a sheet. Deliberately plain JavaScript — no native date
 * picker module — so it needs no rebuild and looks the same on every device.
 *
 * Props
 *  - value    Date | ISO string | null — the currently chosen day
 *  - title    sheet heading
 *  - subtitle muted line under it
 *  - busy     disables the whole sheet while a save is in flight
 *  - inline   render as an in-tree overlay instead of a <Modal>. Use this from
 *             inside another Modal: Android handles nested modals unreliably,
 *             which is why CreateQuotationModal stacks its own popups in-tree.
 *  - onSelect (Date) => void — fires on the tapped day
 *  - onClose  () => void
 */
export default function DatePickerSheet({
  value,
  title = "Pick a date",
  subtitle,
  busy = false,
  inline = false,
  onSelect,
  onClose,
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const selected = value ? startOfDay(value) : null;

  /* The month on screen. Opens on the chosen date's month, or this one. */
  const [cursor, setCursor] = useState(() => selected ?? today);
  const weeks = useMemo(() => monthGrid(cursor), [cursor]);

  const step = (delta) => setCursor((current) => addMonths(current, delta));

  const sheet = (
    <Pressable style={s.backdrop} onPress={busy ? undefined : onClose}>
      <Pressable style={s.sheet} onPress={() => {}}>
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={s.monthRow}>
          <Pressable
            onPress={() => step(-1)}
            hitSlop={10}
            style={({ pressed }) => [s.navBtn, pressed && s.navBtnPressed]}
            accessibilityLabel="Previous month"
            disabled={busy}
          >
            <Ionicons name="chevron-back" size={18} color={NAVY} />
          </Pressable>

          <Text style={s.monthLabel}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>

          <Pressable
            onPress={() => step(1)}
            hitSlop={10}
            style={({ pressed }) => [s.navBtn, pressed && s.navBtnPressed]}
            accessibilityLabel="Next month"
            disabled={busy}
          >
            <Ionicons name="chevron-forward" size={18} color={NAVY} />
          </Pressable>
        </View>

        <View style={s.weekRow}>
          {WEEKDAYS.map((label, index) => (
            <Text key={`${label}-${index}`} style={s.weekday}>
              {label}
            </Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={s.weekRow}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={s.cell} />;

              const isSelected = selected && isSameDay(day, selected);
              const isToday = isSameDay(day, today);

              return (
                <Pressable
                  key={di}
                  onPress={() => onSelect?.(day)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !!isSelected }}
                  style={({ hovered, pressed }) => [
                    s.cell,
                    s.day,
                    (hovered || pressed) && !isSelected && s.dayHover,
                    isToday && !isSelected && s.dayToday,
                    isSelected && s.daySelected,
                  ]}
                >
                  <Text
                    style={[
                      s.dayText,
                      isToday && !isSelected && s.dayTextToday,
                      isSelected && s.dayTextSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={s.actions}>
          <Pressable
            style={({ pressed }) => [
              s.todayBtn,
              pressed && !busy && s.todayBtnPressed,
              busy && s.disabled,
            ]}
            onPress={() => onSelect?.(today)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="today-outline" size={16} color="#FFFFFF" />
            )}
            <Text style={s.todayText}>{busy ? "SAVING…" : "TODAY"}</Text>
          </Pressable>

          <Pressable style={s.cancelBtn} onPress={onClose} disabled={busy}>
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );

  if (inline) {
    return <View style={StyleSheet.absoluteFill}>{sheet}</View>;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={busy ? () => {} : onClose}
    >
      {sheet}
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
  },
  header: { marginBottom: 12 },
  title: { fontSize: 16.5, fontWeight: "800", color: NAVY },
  subtitle: { fontSize: 12.5, color: FAINT, marginTop: 2 },

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FILL,
  },
  navBtnPressed: { backgroundColor: NAVY_TINT },
  monthLabel: { fontSize: 15, fontWeight: "800", color: TEXT },

  weekRow: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11.5,
    fontWeight: "700",
    color: FAINT,
    paddingVertical: 6,
  },

  cell: { flex: 1, aspectRatio: 1, margin: 1 },
  day: { alignItems: "center", justifyContent: "center", borderRadius: 8 },
  dayHover: { backgroundColor: FILL },
  dayToday: { borderWidth: 1, borderColor: ALERT },
  daySelected: { backgroundColor: NAVY },
  dayText: { fontSize: 14, color: TEXT },
  dayTextToday: { color: ALERT, fontWeight: "800" },
  dayTextSelected: { color: "#FFFFFF", fontWeight: "800" },

  actions: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
    gap: 8,
  },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: 10,
    backgroundColor: NAVY,
  },
  todayBtnPressed: { backgroundColor: NAVY_DEEP },
  disabled: { backgroundColor: "#A8BACB" },
  todayText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  cancelBtn: { height: 38, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, fontWeight: "700", color: MUTED },
});
