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

type PageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  await requireUser();

  // `/dashboard?view=calendar` opens the calendar; anything else, the overview.
  const { view } = await searchParams;
  return (
    <DashboardPage
      initialView={view === "calendar" ? "calendar" : "overview"}
    />
  );
}
