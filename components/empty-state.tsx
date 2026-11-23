import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** The call to action, usually a button. */
  children?: React.ReactNode;
};

/** Shown in place of a list that has nothing in it. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <Icon className="text-muted-foreground h-6 w-6" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
