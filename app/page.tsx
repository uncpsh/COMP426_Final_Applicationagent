/**
 * Route for the landing page (`/`). Public: no login required.
 *
 * A Server Component. It reads the session only to choose the buttons: a
 * visitor sees "Sign up" and "Log in", a signed-in user sees "Open dashboard".
 */

import {
  ArrowRight,
  CalendarClock,
  FileStack,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { cn } from "@/utils/cn";
import { getOptionalUser } from "@/utils/supabase/auth";

type Feature = { icon: LucideIcon; title: string; description: string };

const FEATURES: Feature[] = [
  {
    icon: Users,
    title: "Recommenders across applications",
    description:
      "One professor may owe you six letters. See which are submitted and which are due next, per recommender.",
  },
  {
    icon: FileStack,
    title: "Document versions per application",
    description:
      "Every upload is a new version, and each application records the exact SOP, CV or resume version you sent.",
  },
  {
    icon: CalendarClock,
    title: "Nothing slips",
    description:
      "One dashboard of everything due soon: application deadlines and the letters you are still waiting on.",
  },
];

/** Sample rows for the preview card. Illustration only, not real data. */
const PREVIEW_ROWS = [
  {
    title: "Carnegie Mellon · MS in Machine Learning",
    detail: "Application deadline",
    due: "Due in 2 days",
    tone: "text-orange-600 dark:text-orange-400",
  },
  {
    title: "Prof. Rivera · letter for Stanford",
    detail: "Recommendation letter",
    due: "Due in 6 days",
    tone: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "Stripe · Software Engineer Intern",
    detail: "Application deadline",
    due: "Due in 3 weeks",
    tone: "text-muted-foreground",
  },
];

export default async function Page() {
  const user = await getOptionalUser();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
        <Brand />
        <div className="ml-auto flex items-center gap-1">
          <ModeToggle />
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        <section className="grid items-center gap-10 py-12 md:py-20 lg:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              For grad school and internship season
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Every application, deadline and letter in one place.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl text-lg text-pretty">
              AppTrail tracks your applications, the recommendation letters
              behind them, and exactly which version of each essay or resume
              went where.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Open dashboard <ArrowRight aria-hidden />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/signup">
                      Get started <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Log in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          <PreviewCard />
        </section>

        <section
          aria-labelledby="features-heading"
          className="border-t py-12 md:py-16"
        >
          <h2
            id="features-heading"
            className="text-2xl font-bold tracking-tight"
          >
            Why it beats a spreadsheet
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="shadow-none">
                <CardHeader>
                  <Icon className="mb-2 h-5 w-5" aria-hidden />
                  <CardTitle className="leading-snug">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto w-full max-w-6xl border-t px-4 py-6 text-sm">
        AppTrail · a UNC COMP 426 final project
      </footer>
    </div>
  );
}

/** A static picture of the dashboard's "due soon" list. */
function PreviewCard() {
  return (
    <figure>
      <Card>
        <CardHeader>
          <CardTitle>Due soon</CardTitle>
          <CardDescription>Deadlines and letters, in one list.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {PREVIEW_ROWS.map((row) => (
            <div
              key={row.title}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="text-muted-foreground text-xs">{row.detail}</p>
              </div>
              <p className={cn("shrink-0 text-sm font-medium", row.tone)}>
                {row.due}
              </p>
            </div>
          ))}
          <p className="text-muted-foreground border-t pt-3 text-xs">
            SOP – ML focus · version 4 attached to 3 applications
          </p>
        </CardContent>
      </Card>
      <figcaption className="text-muted-foreground mt-2 text-center text-xs">
        Example with sample data
      </figcaption>
    </figure>
  );
}
