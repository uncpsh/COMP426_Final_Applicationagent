/**
 * tRPC APIs for letters: the join between applications and recommenders
 * (the `recommendation_requests` table).
 *
 * Every procedure here requires a signed-in user. A letter has no `user_id`
 * of its own: it belongs to the user if its application does, so every query
 * here goes through the user's applications. A letter that belongs to
 * someone else behaves exactly like one that does not exist (`NOT_FOUND`).
 */

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
  applicationsTable,
  recommendationRequestsTable,
} from "@/server/db/schema";
import {
  RecommendationAssignment,
  RecommendationIdentity,
  RecommendationUpdate,
} from "@/server/models/inputs";
import { Deleted, RecommendationRequest } from "@/server/models/responses";

const letters = recommendationRequestsTable;

/**
 * The condition "this letter, and its application belongs to this user".
 * The ownership check is a subquery, so it runs inside the same statement
 * as the read, update or delete it protects.
 */
function ownedLetter(userId: string, letterId: string) {
  const ownApplicationIds = db
    .select({ id: applicationsTable.id })
    .from(applicationsTable)
    .where(eq(applicationsTable.userId, userId));

  return and(
    eq(letters.id, letterId),
    inArray(letters.applicationId, ownApplicationIds),
  );
}

export const recommendationsApiRouter = createTRPCRouter({
  /**
   * Assigns a recommender to an application. Both must belong to the user.
   * Throws `CONFLICT` if that recommender is already assigned.
   */
  assign: protectedProcedure
    .input(RecommendationAssignment)
    .output(RecommendationRequest)
    .mutation(async ({ ctx, input }) => {
      // Check BOTH sides of the join. Checking only the application would
      // let a user attach someone else's recommender id to it and then read
      // that recommender's name through `applications.byId`.
      const [application, recommender] = await Promise.all([
        db.query.applicationsTable.findFirst({
          where: { id: input.applicationId, userId: ctx.subject.id },
          columns: { id: true },
        }),
        db.query.recommendersTable.findFirst({
          where: { id: input.recommenderId, userId: ctx.subject.id },
          columns: { id: true },
        }),
      ]);
      if (!application || !recommender) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // The table has a unique constraint on (application, recommender).
      // `onConflictDoNothing` turns a duplicate into "no row inserted".
      const [created] = await db
        .insert(letters)
        .values({
          applicationId: application.id,
          recommenderId: recommender.id,
          dueAt: input.dueAt ?? null,
        })
        .onConflictDoNothing()
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This recommender is already assigned to this application.",
        });
      }
      return created;
    }),

  /**
   * Edits a letter. Sets `requestedAt` / `submittedAt` when the status
   * changes to `requested` / `submitted`.
   */
  update: protectedProcedure
    .input(RecommendationUpdate)
    .output(RecommendationRequest)
    .mutation(async ({ ctx, input }) => {
      const { id, status, dueAt, notes } = input;
      const owned = ownedLetter(ctx.subject.id, id);

      // With nothing to change there is nothing to write.
      const hasChanges = [status, dueAt, notes].some(
        (value) => value !== undefined,
      );
      if (!hasChanges) {
        const [current] = await db.select().from(letters).where(owned);
        if (!current) throw new TRPCError({ code: "NOT_FOUND" });
        return current;
      }

      const [updated] = await db
        .update(letters)
        .set({
          // Drizzle skips `undefined`, so fields that were not sent stay.
          status,
          dueAt,
          notes,
          // `requestedAt` keeps the first time the letter was requested.
          ...(status === "requested" && {
            requestedAt: sql`coalesce(${letters.requestedAt}, now())`,
          }),
          // `submittedAt` is set at the moment the status becomes
          // "submitted" (the CASE reads the status from before this update,
          // so saving "submitted" twice keeps the first time), and cleared
          // when the letter is moved back to any other status.
          ...(status !== undefined && {
            submittedAt:
              status === "submitted"
                ? sql`case when ${letters.status} = 'submitted' then ${letters.submittedAt} else now() end`
                : null,
          }),
        })
        .where(owned)
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  /** Removes a recommender from an application. */
  remove: protectedProcedure
    .input(RecommendationIdentity)
    .output(Deleted)
    .mutation(async ({ ctx, input }) => {
      const [removed] = await db
        .delete(letters)
        .where(ownedLetter(ctx.subject.id, input.id))
        .returning({ id: letters.id });

      if (!removed) throw new TRPCError({ code: "NOT_FOUND" });
      return removed;
    }),
});
