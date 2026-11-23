/**
 * Route for the applications list (`/applications`).
 *
 * This Server Component checks that the user is signed in (redirecting to
 * the login page if not) and renders the interactive list
 * (`applications-page.tsx`), which loads its data through tRPC.
 */

import type { Metadata } from "next";

import { requireUser } from "@/utils/supabase/auth";
import ApplicationsPage from "./applications-page";

export const metadata: Metadata = { title: "Applications" };

export default async function Page() {
  await requireUser();
  return <ApplicationsPage />;
}
