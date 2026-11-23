/**
 * Route for the dashboard (`/dashboard`).
 *
 * This Server Component checks that the user is signed in (redirecting to
 * the login page if not) and renders the interactive dashboard
 * (`dashboard-page.tsx`), which loads its data through tRPC.
 */

import type { Metadata } from "next";

import { requireUser } from "@/utils/supabase/auth";
import DashboardPage from "./dashboard-page";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Page() {
  await requireUser();
  return <DashboardPage />;
}
