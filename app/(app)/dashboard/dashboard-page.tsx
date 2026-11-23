/**
 * The dashboard: what is due soon, applications by status, letters still
 * owed per recommender, and fees paid. A second view shows the same dates
 * as a calendar (P1).
 *
 * This is a Client Component. Everything the overview shows comes from one
 * tRPC query, `dashboard.summary`, so the page loads with a single request.
 */

"use client";

import { CalendarDays, ClipboardList, PartyPopper, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { STATUS_STYLES } from "@/components/applications/status-styles";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APPLICATION_STATUSES } from "@/server/models/enums";
import { cn } from "@/utils/cn";
import { urgencyOf } from "@/utils/deadlines";
import { formatCents, statusLabel } from "@/utils/labels";
import { api, type RouterOutputs } from "@/utils/trpc/api";
import { DatedItem } from "./dated-item";

type Summary = RouterOutputs["dashboard"]["summary"];

/** The two ways of looking at what is due. */
const VIEWS = ["overview", "calendar"] as const;
type View = (typeof VIEWS)[number];

// The calendar puts each date on a day of the user's own time zone, which
// the server does not know. Rendering it only in the browser avoids showing
// a month laid out for the server's time zone first.
const CalendarView = dynamic(() => import("./calendar-view"), {
  ssr: false,
  loading: () => (
    <Skeleton
      className="h-96 w-full rounded-xl"
      aria-busy="true"
      aria-label="Loading calendar"
    />
  ),
});

type DashboardPageProps = {
  /** From the `?view=` part of the URL, read by the server component. */
  initialView: View;
};

export default function DashboardPage({ initialView }: DashboardPageProps) {
  const [view, setView] = useState<View>(initialView);

  function changeView(next: View) {
    setView(next);
    // Keep the view in the URL, so a reload or a shared link opens the same
    // one. `replaceState` does not add a step to the Back button.
    window.history.replaceState(
      null,
      "",
      next === "calendar" ? "?view=calendar" : window.location.pathname,
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything due soon, at a glance."
      >
        <Tabs
          value={view}
          onValueChange={(value) => {
            const next = VIEWS.find((option) => option === value);
            if (next) changeView(next);
          }}
        >
          <TabsList aria-label="View">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden /> Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      {view === "calendar" ? <CalendarView /> : <Overview />}
    </>
  );
}

function Overview() {
  const {
    data: summary,
    isPending,
    isError,
    refetch,
  } = api.dashboard.summary.useQuery();

  return (
    <>
      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState
          title="Could not load your dashboard"
          onRetry={() => void refetch()}
        />
      ) : totalApplications(summary) === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing to track yet"
          description="Add your first application and its deadline. This page then shows what is due next, including recommendation letters."
        >
          <Button asChild size="sm">
            <Link href="/applications">
              <Plus aria-hidden /> Add an application
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          <Stats summary={summary} />
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <DueSoon upcoming={summary.upcoming} />
            <div className="grid gap-4">
              <ByStatus counts={summary.countsByStatus} />
              <OutstandingLetters letters={summary.outstandingLetters} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function totalApplications(summary: Summary) {
  return Object.values(summary.countsByStatus).reduce(
    (total, count) => total + count,
    0,
  );
}

/* ------------------------------------------------------------------ */
/* The four numbers at the top                                         */
/* ------------------------------------------------------------------ */

function Stats({ summary }: { summary: Summary }) {
  const overdue = summary.upcoming.filter(
    (item) => urgencyOf(item.dueAt) === "overdue",
  ).length;
  const dueThisWeek = summary.upcoming.filter((item) =>
    ["within3Days", "within7Days"].includes(urgencyOf(item.dueAt)),
  ).length;
  const lettersOwed = summary.outstandingLetters.reduce(
    (total, recommender) => total + recommender.pending,
    0,
  );

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Applications" value={totalApplications(summary)} />
      <Stat
        label="Due in the next 7 days"
        value={dueThisWeek}
        // The number is coloured only as an extra cue; the note says it too.
        note={overdue > 0 ? `${overdue} overdue` : undefined}
        noteClassName="text-red-600 dark:text-red-400"
      />
      <Stat label="Letters outstanding" value={lettersOwed} />
      <Stat
        label="Fees paid"
        value={formatCents(summary.totalFeesCents)}
        note="Submitted applications"
      />
    </dl>
  );
}

function Stat({
  label,
  value,
  note,
  noteClassName,
}: {
  label: string;
  value: number | string;
  note?: string;
  noteClassName?: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {note && (
        <dd className={cn("text-muted-foreground text-xs", noteClassName)}>
          {note}
        </dd>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Due soon                                                            */
/* ------------------------------------------------------------------ */

function DueSoon({ upcoming }: { upcoming: Summary["upcoming"] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Due soon</CardTitle>
        <CardDescription>
          Overdue items and everything due in the next 30 days: applications you
          have not submitted, and letters you are still waiting on.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm">
            <PartyPopper className="h-4 w-4 shrink-0" aria-hidden />
            Nothing is due in the next 30 days.
          </div>
        ) : (
          <ul className="grid gap-2">
            {upcoming.map((item) => (
              // A letter and its application can be due together, so the
              // key needs the type as well as the id.
              <DatedItem key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Applications by status                                              */
/* ------------------------------------------------------------------ */

function ByStatus({ counts }: { counts: Summary["countsByStatus"] }) {
  const largest = Math.max(...Object.values(counts), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>By status</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm">
          {APPLICATION_STATUSES.map((status) => (
            <li
              key={status}
              className="grid grid-cols-[7.5rem_1fr_1.5rem] items-center gap-2"
            >
              <span className="truncate">{statusLabel(status)}</span>
              {/* The bar only repeats the number next to it. */}
              <span
                className="bg-muted h-2 overflow-hidden rounded-full"
                aria-hidden
              >
                <span
                  className={cn(
                    "block h-full rounded-full bg-current",
                    STATUS_STYLES[status],
                  )}
                  style={{ width: `${(counts[status] / largest) * 100}%` }}
                />
              </span>
              <span className="text-right tabular-nums">{counts[status]}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Letters outstanding per recommender                                 */
/* ------------------------------------------------------------------ */

function OutstandingLetters({
  letters,
}: {
  letters: Summary["outstandingLetters"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Letters outstanding</CardTitle>
        <CardDescription>
          Letters not yet submitted, per recommender.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {letters.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No letters outstanding.
          </p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {letters.map((recommender) => (
              <li
                key={recommender.recommenderId}
                className="flex items-center justify-between gap-3"
              >
                <Link
                  href={`/recommenders/${recommender.recommenderId}`}
                  className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
                >
                  {recommender.name}
                </Link>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {recommender.pending}{" "}
                  {recommender.pending === 1 ? "letter" : "letters"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
