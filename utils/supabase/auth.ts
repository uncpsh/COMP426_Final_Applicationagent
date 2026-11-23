/**
 * Server-side helper used by protected pages to load the currently
 * authenticated user. If no user is signed in, the request is
 * redirected to the login page.
 *
 * This replaces the `getServerSideProps` functions that each page
 * used to define in the Pages Router.
 *
 * @author Ajay Gandecha <agandecha@unc.edu>
 * @license MIT
 * @see https://comp426-25f.github.io/
 */

import { redirect } from "next/navigation";
import { Subject } from "@/server/models/auth";
import { createSupabaseServerClient } from "@/utils/supabase/clients/server";

export async function requireUser(): Promise<Subject> {
  // Create the Supabase client that works specifically on the server.
  const supabase = await createSupabaseServerClient();

  // Attempt to load the user data.
  const { data: userData, error: userError } = await supabase.auth.getClaims();

  // If the user is not logged in, redirect them to the login page.
  if (userError || !userData) {
    redirect("/login");
  }

  return { id: userData.claims.sub };
}
