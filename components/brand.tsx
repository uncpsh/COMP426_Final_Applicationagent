import { Route } from "lucide-react";
import Link from "next/link";

import { cn } from "@/utils/cn";

type BrandProps = {
  /** Where the logo links to: the landing page, or the dashboard inside the app. */
  href?: string;
  className?: string;
};

/** The AppTrail logo and name. */
export function Brand({ href = "/", className }: BrandProps) {
  return (
    <Link
      href={href}
      className={cn("flex shrink-0 items-center gap-2 font-bold", className)}
    >
      <Route className="h-5 w-5" aria-hidden />
      <span className="text-lg">AppTrail</span>
    </Link>
  );
}
