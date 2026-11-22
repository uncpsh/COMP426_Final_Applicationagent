/**
 * The root layout is the top-level component wrapping all pages
 * in the application.
 *
 * It only sets up the providers every page needs (theme, tRPC + React Query).
 * The navigation and user menu are added by the app shell in step 2.2.
 */

import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TRPCReactProvider } from "@/utils/trpc/provider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "AppTrail",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
