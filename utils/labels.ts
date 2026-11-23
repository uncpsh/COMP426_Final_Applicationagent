/**
 * The text shown for each enum value, in one place so that every page uses
 * the same wording.
 */

import type {
  DocType,
  Kind,
  LetterStatus,
  Priority,
  Status,
} from "@/server/models/enums";

export const KIND_LABELS: Record<Kind, string> = {
  grad_school: "Grad school",
  internship: "Internship",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  reach: "Reach",
  target: "Target",
  safety: "Safety",
};

const STATUS_LABELS: Record<Status, string> = {
  researching: "Researching",
  preparing: "Preparing",
  submitted: "Submitted",
  interviewing: "Interviewing",
  offer: "Offer",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/**
 * The label of an application status. `offer` reads "Admitted" for a grad
 * school application and "Offer" for an internship; where both kinds are
 * mixed (the status filter) it reads "Offer / Admitted".
 */
export function statusLabel(status: Status, kind?: Kind) {
  if (status !== "offer") return STATUS_LABELS[status];
  if (kind === "grad_school") return "Admitted";
  if (kind === "internship") return "Offer";
  return "Offer / Admitted";
}

export const LETTER_STATUS_LABELS: Record<LetterStatus, string> = {
  planned: "Planned",
  requested: "Requested",
  confirmed: "Confirmed",
  submitted: "Submitted",
  declined: "Declined",
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  sop: "Statement of purpose",
  personal_statement: "Personal statement",
  cv: "CV",
  resume: "Resume",
  cover_letter: "Cover letter",
  writing_sample: "Writing sample",
  other: "Other",
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Fees are stored in cents: 9000 -> "$90.00". */
export function formatCents(cents: number) {
  return usd.format(cents / 100);
}
