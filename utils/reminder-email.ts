/**
 * (P1) Builds the draft of a reminder email to a recommender.
 *
 * The app does not send email. The result is a `mailto:` link: opening it
 * starts a new message in the user's own mail program, already addressed
 * and filled in, which they can edit before sending.
 */

export type PendingLetter = {
  organization: string;
  position: string;
  /** When the letter is due, if a date is known. */
  dueAt: Date | null;
};

type ReminderEmail = {
  recommenderName: string;
  /** Left empty when no email is on file; the draft then has no recipient. */
  recommenderEmail: string | null;
  /** The signature. Left out while the user's name is still loading. */
  senderName?: string;
  /** The letters still owed, most urgent first. */
  letters: PendingLetter[];
};

// The recommender may live in another time zone, so the zone is spelled
// out: "Dec 1, 2026, 11:59 PM EST".
const dueFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

/** The plain text of the email, one letter per line. */
export function reminderBody({
  recommenderName,
  senderName,
  letters,
}: Omit<ReminderEmail, "recommenderEmail">) {
  const lines = letters.map(
    ({ organization, position, dueAt }) =>
      `- ${organization}, ${position}: ${dueAt ? `due ${dueFormat.format(dueAt)}` : "no deadline yet"}`,
  );

  return [
    `Dear ${recommenderName},`,
    "",
    "Thank you again for supporting my applications. Here are the recommendation letters that are still open, with their deadlines:",
    "",
    ...lines,
    "",
    "Please let me know if there is anything I can send you that would help.",
    "",
    "Best regards,",
    ...(senderName ? [senderName] : []),
  ].join("\r\n"); // Email uses CRLF line breaks (RFC 6068).
}

export function reminderMailto(email: ReminderEmail) {
  const subject =
    email.letters.length === 1
      ? "Recommendation letter: upcoming deadline"
      : "Recommendation letters: upcoming deadlines";

  // `encodeURIComponent` (not `URLSearchParams`) so that spaces become %20;
  // mail programs show a "+" literally. The "@" of the address stays as is.
  const to = encodeURIComponent(email.recommenderEmail ?? "").replace(
    /%40/g,
    "@",
  );
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reminderBody(email))}`;
}
