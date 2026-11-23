/**
 * Helpers for showing a due date: how urgent it is, how far away it is, and
 * the exact moment in the user's own time zone.
 *
 * Deadlines are stored and compared as absolute moments (`timestamptz`).
 * They are turned into local time only here, for display and for the
 * date and time inputs of a form. Shared by applications and letters.
 */

import type { Status } from "@/server/models/enums";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How close a due date is. The UI colours each level and always adds text. */
export type Urgency = "overdue" | "within3Days" | "within7Days" | "later";

export function urgencyOf(dueAt: Date, now: Date = new Date()): Urgency {
  const msLeft = dueAt.getTime() - now.getTime();
  if (msLeft < 0) return "overdue";
  if (msLeft <= 3 * DAY) return "within3Days";
  if (msLeft <= 7 * DAY) return "within7Days";
  return "later";
}

/**
 * An application's deadline only matters while the application has not been
 * sent. Once it is submitted (or rejected, withdrawn, ...) a past deadline is
 * no longer "overdue".
 */
export function isDeadlineOpen(status: Status) {
  return status === "researching" || status === "preparing";
}

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "in 3 days", "tomorrow", "in 5 hours", "2 days ago". */
export function formatRelative(date: Date, now: Date = new Date()) {
  const diff = date.getTime() - now.getTime();
  const distance = Math.abs(diff);

  if (distance < HOUR) {
    return relativeFormat.format(Math.round(diff / MINUTE), "minute");
  }
  if (distance < DAY) {
    return relativeFormat.format(Math.round(diff / HOUR), "hour");
  }
  if (distance < 60 * DAY) {
    return relativeFormat.format(Math.round(diff / DAY), "day");
  }
  return relativeFormat.format(Math.round(diff / (30 * DAY)), "month");
}

// No `timeZone` option, so these use the time zone of the browser.
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** "Dec 1, 2026, 11:59 PM", in the user's local time zone. */
export function formatDateTime(date: Date) {
  return dateTimeFormat.format(date);
}

/** Programs usually close at the end of the day, so that is the default. */
export const DEFAULT_DEADLINE_TIME = "23:59";

const twoDigits = (value: number) => String(value).padStart(2, "0");

/**
 * Splits a moment into the values of `<input type="date">` and
 * `<input type="time">`, in local time.
 */
export function toDateAndTimeInputs(moment: Date) {
  const date = `${moment.getFullYear()}-${twoDigits(moment.getMonth() + 1)}-${twoDigits(moment.getDate())}`;
  const time = `${twoDigits(moment.getHours())}:${twoDigits(moment.getMinutes())}`;
  return { date, time };
}

/**
 * The reverse of `toDateAndTimeInputs`. An empty date means "no deadline"
 * (`null`); a date that cannot be read is reported as `"invalid"`.
 */
export function fromDateAndTimeInputs(
  date: string,
  time: string,
): Date | null | "invalid" {
  if (date === "") return null;

  // A date-time string without a time zone is read as local time, which is
  // exactly what the user typed. It is sent to the server as an absolute
  // moment (ISO 8601, UTC).
  const moment = new Date(`${date}T${time || DEFAULT_DEADLINE_TIME}`);
  return Number.isNaN(moment.getTime()) ? "invalid" : moment;
}
