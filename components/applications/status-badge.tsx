import { STATUS_STYLES } from "@/components/applications/status-styles";
import { Badge } from "@/components/ui/badge";
import type { Kind, Status } from "@/server/models/enums";
import { cn } from "@/utils/cn";
import { statusLabel } from "@/utils/labels";

type StatusBadgeProps = { status: Status; kind?: Kind; className?: string };

/** A read-only application status, for pages that only display it. */
export function StatusBadge({ status, kind, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn("border-transparent", STATUS_STYLES[status], className)}
    >
      {statusLabel(status, kind)}
    </Badge>
  );
}
