/**
 * The root layout is the top-level component wrapping all pages
 * in the application.
 *
 * It only sets up what every page needs: the theme, the tRPC + React Query
 * providers and the toast container. The navigation and user menu belong to
 * the signed-in part of the app and live in `app/(app)/layout.tsx`.
 */

import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/utils/trpc/provider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  // A page that sets `title: "Log in"` gets the tab title "Log in · AppTrail".
  title: { default: "AppTrail", template: "%s · AppTrail" },
  description:
    "Track grad school and internship applications, recommendation letters and document versions in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning` is required by `next-themes`, which updates
    // the `class` attribute on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>{children}</TRPCReactProvider>
          {/* Toasts appear just below the header, where they cover neither the
              page's buttons nor the phone tab bar at the bottom. */}
          <Toaster
            richColors
            closeButton
            position="top-center"
            offset={{ top: 64 }}
            mobileOffset={{ top: 64 }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
