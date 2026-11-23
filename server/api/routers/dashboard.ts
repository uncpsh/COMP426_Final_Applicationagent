/**
 * tRPC API for the dashboard. Requires a signed-in user and only ever reads
 * that user's own data.
 */

import type { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { APPLICATION_STATUSES, type Status } from "@/server/models/enums";
import { CalendarRange } from "@/server/models/inputs";
import { CalendarEvent, DashboardSummary } from "@/server/models/responses";
import { isDeadlineOpen } from "@/utils/deadlines";
import {
  compareDueDates,
  isLetterOutstanding,
  letterDueAt,
} from "@/utils/letters";

type Summary = z.infer<typeof DashboardSummary>;

/** "Upcoming" means overdue, or due within this many days from now. */
const UPCOMING_DAYS = 30;

/**
 * Loads what both procedures below are computed from: the user's
 * applications, each with its letters, each letter with its recommender's
 * name. It is one relational query, scoped to the signed-in user.
 */
function loadApplicationsWithLetters(userId: string) {
  return db.query.applicationsTable.findMany({
    where: { userId },
    columns: {
      id: true,
      organization: true,
      position: true,
      status: true,
      deadlineAt: true,
      submittedAt: true,
      applicationFeeCents: true,
    },
    with: {
      letters: {
        columns: { id: true, status: true, dueAt: true },
        with: { recommender: { columns: { id: true, name: true } } },
      },
    },
  });
}

type LoadedApplication = Awaited<
  ReturnType<typeof loadApplicationsWithLetters>
>[number];

/** How a deadline and a letter are named in "Due soon" and in the calendar. */
const applicationTitle = (application: LoadedApplication) =>
  `${application.organization} · ${application.position}`;
const letterTitle = (recommender: string, application: LoadedApplication) =>
  `${recommender} · letter for ${application.organization}`;

export const dashboardApiRouter = createTRPCRouter({
  /**
   * Returns everything the dashboard shows in one request: application
   * counts by status, what is due soon, letters still owed per recommender,
   * and the fees of submitted applications.
   */
  summary: protectedProcedure
    .output(DashboardSummary)
    .query(async ({ ctx }) => {
      // A user tracks a few dozen applications at most, so the four
      // summaries are computed from the loaded rows here instead of with
      // four separate SQL aggregates.
      const applications = await loadApplicationsWithLetters(ctx.subject.id);

      const horizon = new Date(
        Date.now() + UPCOMING_DAYS * 24 * 60 * 60 * 1000,
      );
      const isUpcoming = (dueAt: Date | null): dueAt is Date =>
        dueAt !== null && dueAt <= horizon; // No lower bound: overdue counts.

      // Start every status at zero so the client always gets all eight keys.
      const countsByStatus = Object.fromEntries(
        APPLICATION_STATUSES.map((status) => [status, 0]),
      ) as Record<Status, number>;
      const upcoming: Summary["upcoming"] = [];
      const pendingByRecommender = new Map<
        string,
        Summary["outstandingLetters"][number]
      >();
      let totalFeesCents = 0;

      for (const application of applications) {
        countsByStatus[application.status] += 1;

        // A fee counts once the application was actually submitted.
        if (application.submittedAt) {
          totalFeesCents += application.applicationFeeCents ?? 0;
        }

        // An application is "due" only while it has not been sent yet.
        if (
          isDeadlineOpen(application.status) &&
          isUpcoming(application.deadlineAt)
        ) {
          upcoming.push({
            type: "application",
            id: application.id,
            applicationId: application.id,
            title: applicationTitle(application),
            dueAt: application.deadlineAt,
          });
        }

        for (const letter of application.letters) {
          // A letter is owed until it is submitted or declined.
          if (!isLetterOutstanding(letter.status)) continue;

          const { id: recommenderId, name } = letter.recommender;
          const entry = pendingByRecommender.get(recommenderId);
          if (entry) entry.pending += 1;
          else
            pendingByRecommender.set(recommenderId, {
              recommenderId,
              name,
              pending: 1,
            });

          // A letter without its own due date follows its application.
          const dueAt = letterDueAt(letter.dueAt, application.deadlineAt);
          if (isUpcoming(dueAt)) {
            upcoming.push({
              type: "letter",
              id: letter.id,
              applicationId: application.id,
              title: letterTitle(name, application),
              dueAt,
            });
          }
        }
      }

      return {
        countsByStatus,
        upcoming: upcoming.sort((a, b) => compareDueDates(a.dueAt, b.dueAt)),
        // Whoever owes the most letters comes first.
        outstandingLetters: [...pendingByRecommender.values()].sort(
          (a, b) => b.pending - a.pending || a.name.localeCompare(b.name),
        ),
        totalFeesCents,
      };
    }),

  /**
   * (P1) Returns every deadline and letter due date inside a range of
   * dates, for the calendar's month view.
   *
   * Unlike `summary.upcoming` this also returns what is already done (a
   * submitted application, a submitted letter), marked `isOpen: false`, so a
   * month shows its whole history.
   */
  calendar: protectedProcedure
    .input(CalendarRange)
    .output(CalendarEvent.array())
    .query(async ({ ctx, input }) => {
      const applications = await loadApplicationsWithLetters(ctx.subject.id);

      const isInRange = (dueAt: Date | null): dueAt is Date =>
        dueAt !== null && dueAt >= input.from && dueAt < input.to;
      const events: z.infer<typeof CalendarEvent>[] = [];

      for (const application of applications) {
        if (isInRange(application.deadlineAt)) {
          events.push({
            type: "application",
            id: application.id,
            applicationId: application.id,
            title: applicationTitle(application),
            dueAt: application.deadlineAt,
            isOpen: isDeadlineOpen(application.status),
          });
        }

        for (const letter of application.letters) {
          // A declined letter is no longer expected, so it has no date.
          if (letter.status === "declined") continue;

          // The range is checked here, not in SQL, because a letter without
          // its own due date takes the date of its application.
          const dueAt = letterDueAt(letter.dueAt, application.deadlineAt);
          if (isInRange(dueAt)) {
            events.push({
              type: "letter",
              id: letter.id,
              applicationId: application.id,
              title: letterTitle(letter.recommender.name, application),
              dueAt,
              isOpen: isLetterOutstanding(letter.status),
            });
          }
        }
      }

      return events.sort((a, b) => compareDueDates(a.dueAt, b.dueAt));
    }),
});
