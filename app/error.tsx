/**
 * Shown when a page throws an error that nothing else caught.
 *
 * Each page already handles its own failed requests (a query that fails
 * shows an "error state" with a retry button). This is the last line of
 * defence for everything else, so that a visitor never sees a blank page.
 */

"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";

import { Brand } from "@/components/brand";
import { ErrorState } from "@/components/error-state";

type ErrorPageProps = {
  error: unknown;
  /** Fetches and renders the failed part of the page again. */
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    // Keep the details in the console, for whoever is debugging.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Brand />
      <ErrorState
        title="Something went wrong"
        description="An unexpected error stopped this page. Try again; if it keeps happening, reload the page."
        onRetry={retry}
      />
    </main>
  );
}
