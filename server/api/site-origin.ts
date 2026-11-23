import { headers } from "next/headers";

/**
 * The public address of the site as the current request reached it, for
 * example `https://apptrail.vercel.app` or `http://localhost:3000`.
 *
 * Used to turn a path into a full link that can be sent to someone else.
 * Reading it from the request means there is no address to configure, and a
 * link made on the Vercel deployment points at the Vercel deployment.
 */
export async function siteOrigin() {
  try {
    const requestHeaders = await headers();
    // Behind Vercel's proxy the original host and protocol arrive in the
    // `x-forwarded-*` headers.
    const host =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    if (host) {
      const protocol =
        requestHeaders.get("x-forwarded-proto") ??
        (host.startsWith("localhost") ? "http" : "https");
      return `${protocol}://${host}`;
    }
  } catch {
    // `headers()` throws when there is no request, as in a local script.
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
