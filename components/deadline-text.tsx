import { cn } from "@/utils/cn";
import {
  formatDateTime,
  formatRelative,
  urgencyOf,
  type Urgency,
} from "@/utils/deadlines";

// Colour is never the only signal: the relative time is always written out,
// and an overdue date also says "Overdue".
const URGENCY_STYLES: Record<Urgency, string> = {
  overdue: "text-red-600 dark:text-red-400",
  within3Days: "text-orange-600 dark:text-orange-400",
  within7Days: "text-amber-600 dark:text-amber-400",
  later: "",
};

type DeadlineTextProps = {
  dueAt: Date | null;
  /**
   * Whether the thing is still owed. Pass `false` once it is done (for
   * example a submitted application) to drop the urgency colour.
   */
  isOpen?: boolean;
  /** Shown when there is no date. */
  emptyLabel?: string;
  className?: string;
};

/** A due date as relative time ("In 3 days") plus the exact local date. */
export function DeadlineText({
  dueAt,
  isOpen = true,
  emptyLabel = "No deadline",
  className,
}: DeadlineTextProps) {
  if (!dueAt) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {emptyLabel}
      </span>
    );
  }

  const urgency = isOpen ? urgencyOf(dueAt) : "later";
  const relative = formatRelative(dueAt);

  return (
    <span className={cn("flex flex-col", className)}>
      <span className={cn("font-medium", URGENCY_STYLES[urgency])}>
        {urgency === "overdue"
          ? `Overdue · ${relative}`
          : relative.charAt(0).toUpperCase() + relative.slice(1)}
      </span>
      <time
        dateTime={dueAt.toISOString()}
        className="text-muted-foreground text-xs"
      >
        {formatDateTime(dueAt)}
      </time>
    </span>
  );
}
