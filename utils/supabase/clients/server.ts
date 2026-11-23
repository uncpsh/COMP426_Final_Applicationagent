/**
 * This file defines the Supabase client that is used on
 * the *server side* of the application (for example, from
 * within Server Components, Route Handlers, and the tRPC
 * API context).
 *
 * It reads and writes the Supabase auth cookies using the
 * `cookies()` function from `next/headers`.
 *
 * @author Ajay Gandecha <agandecha@unc.edu>
 * @license MIT
 * @see https://comp426-25f.github.io/
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` is called from a Server Component, where cookies
            // cannot be modified. This is safe to ignore because the
            // proxy (see `/proxy.ts`) refreshes the user's session.
          }
        },
      },
    },
  );
}
