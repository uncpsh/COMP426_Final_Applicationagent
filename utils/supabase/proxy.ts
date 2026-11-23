/**
 * Helper used by the Next.js proxy (`/proxy.ts`) to refresh the
 * user's Supabase auth session on every request.
 *
 * Server Components cannot write cookies, so if a user's auth token
 * expires, it must be refreshed *before* the page renders. This
 * function does that and forwards the updated cookies to both the
 * page being rendered and the browser.
 *
 * @author Ajay Gandecha <agandecha@unc.edu>
 * @license MIT
 * @see https://comp426-25f.github.io/
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run any code between `createServerClient` and `getClaims()`.
  // Calling `getClaims()` validates the token and refreshes it if needed.
  await supabase.auth.getClaims();

  return response;
}
