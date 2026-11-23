/**
 * Shown for any address that matches no page (a 404).
 *
 * A Server Component with no data: it must work for signed-in and
 * signed-out visitors alike.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4 text-center">
      <Brand />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          This address does not lead anywhere. It may have been mistyped, or the
          page may have been removed.
        </p>
      </div>
      {/* A signed-out visitor is sent on to the login page from there. */}
      <Button asChild>
        <Link href="/dashboard">Go to the dashboard</Link>
      </Button>
    </main>
  );
}
