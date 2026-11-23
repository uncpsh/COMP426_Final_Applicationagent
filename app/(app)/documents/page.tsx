/**
 * Route for `/documents`. Requires a signed-in user.
 *
 * Placeholder: the real page is built in Phase 5 of the build plan.
 */

import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/utils/supabase/auth";

export const metadata: Metadata = { title: "Documents" };

export default async function Page() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Documents"
        description="Essays and resumes, with every version you have uploaded."
      />
      <ComingSoon>
        Your documents, their version history and where each version is used
        will appear here.
      </ComingSoon>
    </>
  );
}
