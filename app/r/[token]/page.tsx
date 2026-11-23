/**
 * (P1) Route for the recommender portal (`/r/[token]`).
 *
 * This is the one page inside the product that needs no account, so there
 * is no `requireUser()` here. What grants access is the secret token in the
 * address, which the public `portal` procedures check on every request.
 */

import type { Metadata } from "next";

import PortalPage from "./portal-page";

export const metadata: Metadata = {
  title: "Recommendation letters",
  // The address is a secret. Keep it out of search engines, and do not
  // hand it to other sites in the `Referer` header when a link is followed.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type PageProps = { params: Promise<{ token: string }> };

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <PortalPage token={token} />;
}
