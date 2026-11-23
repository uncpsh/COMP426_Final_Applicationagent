/**
 * (P1) tRPC APIs for the recommender portal at `/r/[token]`.
 *
 * These are the only PUBLIC procedures: a recommender has no account. The
 * unguessable `token` in the link is what grants access, and only while the
 * applicant has sharing turned on for that recommender.
 *
 * A token that does not exist and a link that is switched off give the same
 * answer (`NOT_FOUND`), so the portal never confirms that a token was real.
 */

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
  recommendationRequestsTable as letters,
  recommendersTable,
} from "@/server/db/schema";
import type { LetterStatus } from "@/server/models/enums";
import { PortalSubmission, PortalToken } from "@/server/models/inputs";
import { PortalSubmissionResult, PortalView } from "@/server/models/responses";
import { compareDueDates, letterDueAt } from "@/utils/letters";

/**
 * The letters a recommender gets to see: the ones they have actually been
 * asked for. A letter the applicant is only planning, or one that was
 * declined, stays private.
 */
const PORTAL_STATUSES: LetterStatus[] = ["requested", "confirmed", "submitted"];

export const portalApiRouter = createTRPCRouter({
  /**
   * Returns the letters this recommender has been asked for (`requested`,
   * `confirmed` or `submitted`). `NOT_FOUND` when sharing is off.
   */
  byToken: publicProcedure
    .input(PortalToken)
    .output(PortalView)
    .query(async ({ input }) => {
      const recommender = await db.query.recommendersTable.findFirst({
        // The link must exist AND be switched on, checked in one query.
        where: { shareToken: input.token, shareEnabled: true },
        columns: { name: true },
        with: {
          user: { columns: { displayName: true } },
          letters: {
            where: { status: { in: PORTAL_STATUSES } },
            columns: { id: true, status: true, dueAt: true },
            with: {
              application: {
                columns: {
                  organization: true,
                  position: true,
                  deadlineAt: true,
                },
              },
            },
          },
        },
      });

      if (!recommender) throw new TRPCError({ code: "NOT_FOUND" });

      // Only what the recommender needs: the output model has no ids of the
      // applicant, no notes and no application status.
      return {
        recommenderName: recommender.name,
        applicantName: recommender.user.displayName,
        letters: recommender.letters
          .map((letter) => ({
            id: letter.id,
            organization: letter.application.organization,
            position: letter.application.position,
            // A letter without its own due date follows its application.
            dueAt: letterDueAt(letter.dueAt, letter.application.deadlineAt),
            status: letter.status,
          }))
          // Letters still to write come first, the most urgent at the top;
          // the ones already submitted follow.
          .sort(
            (a, b) =>
              Number(a.status === "submitted") -
                Number(b.status === "submitted") ||
              compareDueDates(a.dueAt, b.dueAt) ||
              a.organization.localeCompare(b.organization),
          ),
      };
    }),

  /** Marks one of this recommender's own letters as submitted. */
  markSubmitted: publicProcedure
    .input(PortalSubmission)
    .output(PortalSubmissionResult)
    .mutation(async ({ input }) => {
      // The recommender this link belongs to, if the link is switched on.
      const linkedRecommender = db
        .select({ id: recommendersTable.id })
        .from(recommendersTable)
        .where(
          and(
            eq(recommendersTable.shareToken, input.token),
            eq(recommendersTable.shareEnabled, true),
          ),
        );

      // One UPDATE both authorizes and changes: it only matches a letter
      // that belongs to that recommender and that the portal shows. A
      // letter of another recommender, or a planned one, matches nothing.
      const [updated] = await db
        .update(letters)
        .set({
          status: "submitted",
          // Marking a submitted letter again keeps its original time.
          submittedAt: sql`case when ${letters.status} = 'submitted' then ${letters.submittedAt} else now() end`,
        })
        .where(
          and(
            eq(letters.id, input.requestId),
            inArray(letters.recommenderId, linkedRecommender),
            inArray(letters.status, PORTAL_STATUSES),
          ),
        )
        .returning({
          id: letters.id,
          status: letters.status,
          submittedAt: letters.submittedAt,
        });

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
