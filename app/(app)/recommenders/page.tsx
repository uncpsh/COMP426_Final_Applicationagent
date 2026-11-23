/**
 * Route for the recommenders list (`/recommenders`).
 *
 * This Server Component checks that the user is signed in (redirecting to
 * the login page if not) and renders the interactive list
 * (`recommenders-page.tsx`), which loads its data through tRPC.
 */

import type { Metadata } from "next";

import { requireUser } from "@/utils/supabase/auth";
import RecommendersPage from "./recommenders-page";

export const metadata: Metadata = { title: "Recommenders" };

export default async function Page() {
  await requireUser();
  return <RecommendersPage />;
}
