/**
 * Route for one document (`/documents/:id`).
 *
 * This Server Component loads the signed-in user (redirecting to the login
 * page if there is none), reads the id from the dynamic URL segment and
 * renders the interactive page (`document-page.tsx`). The user is passed
 * down because uploads go into the Storage folder named after the user's id.
 */

import type { Metadata } from "next";

import { requireUser } from "@/utils/supabase/auth";
import DocumentPage from "./document-page";

export const metadata: Metadata = { title: "Document" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  return <DocumentPage user={user} documentId={id} />;
}
