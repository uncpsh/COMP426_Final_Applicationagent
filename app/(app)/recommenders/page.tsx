/**
 * Route for `/recommenders`. Requires a signed-in user.
 *
 * Placeholder: the real page is built in Phase 4 of the build plan.
 */

import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/utils/supabase/auth";

export const metadata: Metadata = { title: "Recommenders" };

export default async function Page() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Recommenders"
        description="Who is writing letters for you, and for which applications."
      />
      <ComingSoon>
        Your recommenders, their letter counts and next due dates will appear
        here.
      </ComingSoon>
    </>
  );
}
