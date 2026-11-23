"use client";

import { STATUS_STYLES } from "@/components/applications/status-styles";
import { useUpdateApplicationStatus } from "@/components/applications/use-update-status";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES, Status, type Kind } from "@/server/models/enums";
import { cn } from "@/utils/cn";
import { statusLabel } from "@/utils/labels";

type StatusSelectProps = {
  applicationId: string;
  /** Decides the wording of `offer`: "Admitted" or "Offer". */
  kind: Kind;
  status: Status;
  /** Names the application for screen readers, e.g. "Status of MIT". */
  label: string;
  className?: string;
};

/** The inline select that changes an application's status in one click. */
export function StatusSelect({
  applicationId,
  kind,
  status,
  label,
  className,
}: StatusSelectProps) {
  const updateStatus = useUpdateApplicationStatus();

  function handleChange(value: string) {
    // The select hands back a plain string; Zod narrows it to a `Status`.
    const next = Status.safeParse(value);
    if (next.success && next.data !== status) {
      updateStatus.mutate({ id: applicationId, status: next.data });
    }
  }

  return (
    <Select value={status} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-8 w-36 border-transparent font-medium shadow-none",
          STATUS_STYLES[status],
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPLICATION_STATUSES.map((value) => (
          <SelectItem key={value} value={value}>
            {statusLabel(value, kind)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
