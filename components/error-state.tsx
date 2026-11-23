import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  /** Runs the failed request again. Leave out when retrying cannot help. */
  onRetry?: () => void;
  children?: React.ReactNode;
};

/** Shown in place of content that failed to load. */
export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this. Check your connection and try again.",
  onRetry,
  children,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center"
    >
      <CircleAlert className="text-destructive h-6 w-6" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          {description}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
      {children}
    </div>
  );
}
