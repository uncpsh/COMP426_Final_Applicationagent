/**
 * The Next.js proxy (formerly called "middleware") runs before every
 * matching request. Here, it is used only to keep the user's Supabase
 * auth session fresh. Do not modify this file.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 *
 * @author Ajay Gandecha <agandecha@unc.edu>
 * @license MIT
 * @see https://comp426-25f.github.io/
 */

import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all paths except static files and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
