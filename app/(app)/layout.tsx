/**
 * Layout for every page that requires a signed-in user: the dashboard,
 * applications, recommenders and documents. The `(app)` folder is a route
 * group, so it shapes the layout without adding anything to the URL.
 *
 * It checks the session once for the shell, and each page checks again
 * with `requireUser()`, because a layout is not re-rendered when the user
 * moves between pages that share it.
 */

import { AppHeader } from "@/components/shell/app-header";
import { MobileNav } from "@/components/shell/nav-links";
import { requireUser } from "@/utils/supabase/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      {/* The bottom padding keeps content clear of the phone tab bar. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:pb-10">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
