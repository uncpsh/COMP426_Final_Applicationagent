/**
 * Route for one recommender (`/recommenders/:id`).
 *
 * This Server Component checks that the user is signed in, reads the id
 * from the dynamic URL segment and renders the interactive page
 * (`recommender-page.tsx`), which loads the recommender through tRPC.
 */

import type { Metadata } from "next";

import { requireUser } from "@/utils/supabase/auth";
import RecommenderPage from "./recommender-page";

export const metadata: Metadata = { title: "Recommender" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  return <RecommenderPage recommenderId={id} />;
}
