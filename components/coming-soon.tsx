import { Hammer } from "lucide-react";

type ComingSoonProps = {
  /** What this page will show once it is built. */
  children: React.ReactNode;
};

/** Placeholder body for a page whose build-plan phase has not started yet. */
export function ComingSoon({ children }: ComingSoonProps) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <Hammer className="h-6 w-6" aria-hidden />
      <p className="max-w-md text-sm">{children}</p>
    </div>
  );
}
