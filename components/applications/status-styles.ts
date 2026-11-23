import type { Status } from "@/server/models/enums";

/**
 * One colour per application status, used by the status badge and the inline
 * status select so that they always match. The status is always written out
 * too, so the colour is never the only signal.
 */
export const STATUS_STYLES: Record<Status, string> = {
  researching: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  preparing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  submitted: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  interviewing: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  offer: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  waitlisted: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
  withdrawn: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400",
};
