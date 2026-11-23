/**
 * Route for the documents list (`/documents`).
 *
 * This Server Component checks that the user is signed in (redirecting to
 * the login page if not) and renders the interactive list
 * (`documents-page.tsx`), which loads its data through tRPC.
 */

import type { Metadata } from "next";

import { requireUser } from "@/utils/supabase/auth";
import DocumentsPage from "./documents-page";

export const metadata: Metadata = { title: "Documents" };

export default async function Page() {
  await requireUser();
  return <DocumentsPage />;
}
