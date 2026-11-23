import { ClipboardList, Mail } from "lucide-react";
import Link from "next/link";

import { DeadlineText } from "@/components/deadline-text";

type DatedItemProps = {
  item: {
    type: "application" | "letter";
    applicationId: string;
    title: string;
    dueAt: Date;
  };
  /** False once the item is done; it then loses its urgency colour. */
  isOpen?: boolean;
};

/**
 * One row of a list of deadlines: an application's deadline or a letter's
 * due date. Used by "Due soon" and by the calendar's list of the month.
 */
export function DatedItem({ item, isOpen = true }: DatedItemProps) {
  const Icon = item.type === "letter" ? Mail : ClipboardList;
  const kind =
    item.type === "letter" ? "Recommendation letter" : "Application deadline";

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border p-3 text-sm">
      <div className="flex min-w-0 flex-1 basis-48 items-start gap-3">
        <Icon
          className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
          aria-hidden
        />
        <div className="min-w-0">
          <Link
            href={`/applications/${item.applicationId}`}
            className="font-medium break-words underline-offset-4 hover:underline"
          >
            {item.title}
          </Link>
          <p className="text-muted-foreground text-xs">
            {isOpen ? kind : `${kind} · done`}
          </p>
        </div>
      </div>
      <DeadlineText
        dueAt={item.dueAt}
        isOpen={isOpen}
        className="sm:text-right"
      />
    </li>
  );
}
