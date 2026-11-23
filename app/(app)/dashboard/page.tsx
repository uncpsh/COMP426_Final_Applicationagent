/**
 * Route for `/dashboard`. Requires a signed-in user.
 *
 * Placeholder: the real page is built in Phase 6 of the build plan.
 */

import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/utils/supabase/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Page() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything due soon, at a glance."
      />
      <ComingSoon>
        Upcoming deadlines, applications by status, letters outstanding per
        recommender and total fees will appear here.
      </ComingSoon>
    </>
  );
}
