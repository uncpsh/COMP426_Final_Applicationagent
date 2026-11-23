/**
 * (P1) The calendar: one month at a time, with every application deadline
 * and letter due date on its day.
 *
 * It asks `dashboard.calendar` for exactly the days on screen, so moving to
 * another month is one small request. All dates are placed by the user's own
 * time zone, which is why this component is rendered in the browser only
 * (see `dashboard-page.tsx`).
 */

"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ClipboardList, Mail } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { api, type RouterOutputs } from "@/utils/trpc/api";
import { DatedItem } from "./dated-item";

type CalendarEvent = RouterOutputs["dashboard"]["calendar"][number];

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** At most this many events are written out in a day's cell. */
const MAX_PER_DAY = 3;

const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const dayFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "full" });

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

/** Identifies a day in local time, for grouping events by day. */
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

/**
 * The days a month view shows: whole weeks, starting on the Sunday on or
 * before the 1st. Building each day from year, month and day (instead of
 * adding 24 hours) keeps every day at local midnight across a clock change.
 */
function daysOfMonthView(month: Date) {
  const leadingDays = month.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const weeks = Math.ceil((leadingDays + daysInMonth) / 7);

  return Array.from(
    { length: weeks * 7 },
    (_, index) =>
      new Date(month.getFullYear(), month.getMonth(), 1 - leadingDays + index),
  );
}

export default function CalendarView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = useMemo(() => daysOfMonthView(month), [month]);

  const lastDay = days[days.length - 1]!;
  const {
    data: events,
    isPending,
    isError,
    isPlaceholderData,
    refetch,
  } = api.dashboard.calendar.useQuery(
    {
      from: days[0]!,
      // The range ends just before the day after the last one shown.
      to: new Date(
        lastDay.getFullYear(),
        lastDay.getMonth(),
        lastDay.getDate() + 1,
      ),
    },
    // While another month loads, keep showing the current one (dimmed).
    { placeholderData: keepPreviousData },
  );

  const eventsByDay = useMemo(() => {
    const byDay = new Map<string, CalendarEvent[]>();
    for (const event of events ?? []) {
      const key = dayKey(event.dueAt);
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }
    return byDay;
  }, [events]);

  // The grid also shows a few days of the neighbouring months; the list
  // under it is about this month only.
  const eventsThisMonth = (events ?? []).filter(
    (event) =>
      event.dueAt.getMonth() === month.getMonth() &&
      event.dueAt.getFullYear() === month.getFullYear(),
  );

  const monthName = monthFormat.format(month);
  const moveMonths = (count: number) =>
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + count, 1),
    );

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          {/* Announced by screen readers when the month changes. */}
          <CardTitle aria-live="polite">{monthName}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(startOfMonth(new Date()))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous month"
              onClick={() => moveMonths(-1)}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Next month"
              onClick={() => moveMonths(1)}
            >
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <Skeleton
              className="h-72 w-full rounded-lg md:h-[34rem]"
              aria-busy="true"
              aria-label="Loading calendar"
            />
          ) : isError ? (
            <ErrorState
              title="Could not load the calendar"
              onRetry={() => void refetch()}
            />
          ) : (
            <MonthGrid
              month={month}
              days={days}
              eventsByDay={eventsByDay}
              className={cn(
                "transition-opacity",
                isPlaceholderData && "opacity-60",
              )}
            />
          )}
        </CardContent>
      </Card>

      {events && (
        <Card>
          <CardHeader>
            <CardTitle>Due in {monthName}</CardTitle>
            <CardDescription>
              Application deadlines and letter due dates, in order. Items that
              are already done stay listed, marked “done”.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventsThisMonth.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                Nothing is due in {monthName}.
              </p>
            ) : (
              <ul className="grid gap-2">
                {eventsThisMonth.map((event) => (
                  <DatedItem
                    key={`${event.type}-${event.id}`}
                    item={event}
                    isOpen={event.isOpen}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The month as a table: one row per week, one cell per day            */
/* ------------------------------------------------------------------ */

type MonthGridProps = {
  month: Date;
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  className?: string;
};

function MonthGrid({ month, days, eventsByDay, className }: MonthGridProps) {
  const todayKey = dayKey(new Date());
  const weeks = Array.from({ length: days.length / 7 }, (_, week) =>
    days.slice(week * 7, week * 7 + 7),
  );

  return (
    <table
      className={cn("w-full table-fixed border-collapse text-sm", className)}
    >
      <thead>
        <tr>
          {WEEKDAYS.map((weekday) => (
            <th
              key={weekday}
              scope="col"
              className="text-muted-foreground pb-2 text-xs font-medium"
            >
              <abbr title={weekday} className="no-underline">
                {weekday.slice(0, 3)}
              </abbr>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={dayKey(week[0]!)}>
            {week.map((day) => (
              <DayCell
                key={dayKey(day)}
                day={day}
                events={eventsByDay.get(dayKey(day)) ?? []}
                isToday={dayKey(day) === todayKey}
                isOutside={day.getMonth() !== month.getMonth()}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type DayCellProps = {
  day: Date;
  events: CalendarEvent[];
  isToday: boolean;
  /** A day of the previous or next month that fills up the first or last week. */
  isOutside: boolean;
};

function DayCell({ day, events, isToday, isOutside }: DayCellProps) {
  const shown = events.slice(0, MAX_PER_DAY);
  const hidden = events.length - shown.length;

  return (
    <td
      className={cn(
        "h-14 overflow-hidden border p-1 align-top md:h-28",
        isOutside && "bg-muted/30 text-muted-foreground",
      )}
    >
      {/* Stacked, because a phone's day cell is too narrow for the day
          number and the count side by side. */}
      <div className="flex flex-col items-start gap-0.5">
        <time
          dateTime={`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`}
          aria-label={dayFormat.format(day)}
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums",
            // Today is marked by the filled circle and, for screen
            // readers, by the word below.
            isToday && "bg-primary text-primary-foreground font-semibold",
          )}
        >
          {day.getDate()}
        </time>
        {isToday && <span className="sr-only">Today</span>}

        {/* A phone has no room for titles, so a day shows how many items
            it has; the list under the calendar has the details. */}
        {events.length > 0 && (
          <span className="bg-primary/15 rounded-full px-1.5 text-xs font-medium tabular-nums md:hidden">
            {events.length}
            <span className="sr-only"> due</span>
          </span>
        )}
      </div>

      {/* A block list: each row is as wide as the cell, so a long title is
          cut off with "…" instead of running into the next day. */}
      <ul className="mt-1 hidden space-y-0.5 md:block">
        {shown.map((event) => {
          const Icon = event.type === "letter" ? Mail : ClipboardList;
          return (
            <li key={`${event.type}-${event.id}`}>
              <Link
                href={`/applications/${event.applicationId}`}
                title={event.title}
                className={cn(
                  "hover:bg-muted flex items-center gap-1 rounded px-1 py-0.5 text-xs",
                  // A finished item is struck through, and says "done".
                  !event.isOpen && "text-muted-foreground line-through",
                )}
              >
                <Icon className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{event.title}</span>
                <span className="sr-only">
                  {event.type === "letter" ? " (letter)" : " (deadline)"}
                  {!event.isOpen && ", done"}
                </span>
              </Link>
            </li>
          );
        })}
        {hidden > 0 && (
          <li className="text-muted-foreground px-1 text-xs">+{hidden} more</li>
        )}
      </ul>
    </td>
  );
}
