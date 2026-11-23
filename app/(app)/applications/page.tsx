/**
 * Route for `/applications`. Requires a signed-in user.
 *
 * Placeholder: the real page is built in Phase 3 of the build plan.
 */

import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/utils/supabase/auth";

export const metadata: Metadata = { title: "Applications" };

export default async function Page() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every program and role you are applying to."
      />
      <ComingSoon>
        Your applications, with filters, search and an inline status select,
        will appear here.
      </ComingSoon>
    </>
  );
}
