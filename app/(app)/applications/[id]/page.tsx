/**
 * Route for one application (`/applications/:id`).
 *
 * This Server Component checks that the user is signed in, reads the id
 * from the dynamic URL segment and renders the interactive page
 * (`application-page.tsx`), which loads the application through tRPC.
 */

import type { Metadata } from "next";

import { requireUser } from "@/utils/supabase/auth";
import ApplicationPage from "./application-page";

export const metadata: Metadata = { title: "Application" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  return <ApplicationPage applicationId={id} />;
}
