/**
 * Rules about recommendation letters that both the API and the UI need.
 */

import type { LetterStatus } from "@/server/models/enums";

/**
 * A letter is still owed until the recommender has submitted it or declined
 * to write it. Only owed letters count as "due".
 */
export function isLetterOutstanding(status: LetterStatus) {
  return status !== "submitted" && status !== "declined";
}

/**
 * When a letter is due. A letter without its own due date follows the
 * deadline of its application.
 */
export function letterDueAt(
  letterDueAt: Date | null,
  applicationDeadlineAt: Date | null,
) {
  return letterDueAt ?? applicationDeadlineAt;
}

/** Sorts dates ascending, with "no date" last. For `Array.prototype.sort`. */
export function compareDueDates(a: Date | null, b: Date | null) {
  if (a && b) return a.getTime() - b.getTime();
  if (a) return -1;
  if (b) return 1;
  return 0;
}
