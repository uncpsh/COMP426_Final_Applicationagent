/**
 * tRPC APIs for recommenders (the people who write letters).
 *
 * Every procedure here requires a signed-in user and only ever touches that
 * user's own recommenders: each query filters on `user_id`, so a recommender
 * that belongs to someone else behaves exactly like one that does not exist
 * (`NOT_FOUND`).
 */

import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { siteOrigin } from "@/server/api/site-origin";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { recommendersTable } from "@/server/db/schema";
import {
  DraftRecommender,
  RecommenderIdentity,
  RecommenderSharing,
  RecommenderUpdate,
} from "@/server/models/inputs";
import {
  Deleted,
  type LetterCounts,
  Recommender,
  RecommenderDetail,
  RecommenderWithStats,
  SharingState,
} from "@/server/models/responses";
import {
  compareDueDates,
  isLetterOutstanding,
  letterDueAt,
} from "@/utils/letters";

/** The condition "this recommender, and they belong to this user". */
function ownedBy(userId: string, recommenderId: string) {
  return and(
    eq(recommendersTable.id, recommenderId),
    eq(recommendersTable.userId, userId),
  );
}

const noLetters = (): z.infer<typeof LetterCounts> => ({
  planned: 0,
  requested: 0,
  confirmed: 0,
  submitted: 0,
  declined: 0,
});

export const recommendersApiRouter = createTRPCRouter({
  /** Lists the user's recommenders with letter counts and the next due date. */
  list: protectedProcedure
    .output(RecommenderWithStats.array())
    .query(async ({ ctx }) => {
      // Each recommender comes with the status and due date of their
      // letters, and each letter with its application's deadline (the
      // fallback due date). A user has a handful of recommenders, so the
      // counting is done here rather than in SQL.
      const recommenders = await db.query.recommendersTable.findMany({
        where: { userId: ctx.subject.id },
        with: {
          letters: {
            columns: { status: true, dueAt: true },
            with: { application: { columns: { deadlineAt: true } } },
          },
        },
      });

      return recommenders
        .map(({ letters, ...recommender }) => {
          const counts = noLetters();
          let nextDueAt: Date | null = null;

          for (const letter of letters) {
            counts[letter.status] += 1;

            const dueAt = letterDueAt(
              letter.dueAt,
              letter.application.deadlineAt,
            );
            const isEarlier = !nextDueAt || (dueAt && dueAt < nextDueAt);
            if (isLetterOutstanding(letter.status) && dueAt && isEarlier) {
              nextDueAt = dueAt;
            }
          }

          return { ...recommender, counts, nextDueAt };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }),

  /** Returns one recommender with their letters across all applications. */
  byId: protectedProcedure
    .input(RecommenderIdentity)
    .output(RecommenderDetail)
    .query(async ({ ctx, input }) => {
      // Follows the many-to-many relationship from this side:
      // recommender -> letters -> application.
      const recommender = await db.query.recommendersTable.findFirst({
        where: { id: input.id, userId: ctx.subject.id },
        with: {
          letters: {
            with: {
              application: {
                columns: {
                  id: true,
                  kind: true,
                  organization: true,
                  position: true,
                  deadlineAt: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!recommender) throw new TRPCError({ code: "NOT_FOUND" });

      // Letters still owed come before finished ones (submitted or
      // declined); a letter handed in weeks ago has the earliest date but is
      // the least urgent. Within each group the earliest date comes first,
      // and letters without any date go last.
      recommender.letters.sort(
        (a, b) =>
          Number(isLetterOutstanding(b.status)) -
            Number(isLetterOutstanding(a.status)) ||
          compareDueDates(
            letterDueAt(a.dueAt, a.application.deadlineAt),
            letterDueAt(b.dueAt, b.application.deadlineAt),
          ) ||
          a.application.organization.localeCompare(b.application.organization),
      );
      return recommender;
    }),

  /** Creates a recommender owned by the signed-in user. */
  create: protectedProcedure
    .input(DraftRecommender)
    .output(Recommender)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(recommendersTable)
        // The owner always comes from the session, never from the client.
        .values({ ...input, userId: ctx.subject.id })
        .returning();

      return created;
    }),

  /** Edits any field of a recommender. */
  update: protectedProcedure
    .input(RecommenderUpdate)
    .output(Recommender)
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;

      // With nothing to change there is nothing to write (and `updatedAt`
      // should not move), so just return the recommender as they are.
      const hasChanges = Object.values(changes).some(
        (value) => value !== undefined,
      );
      const [recommender] = hasChanges
        ? await db
            .update(recommendersTable)
            // Drizzle skips `undefined` values, so a field the client did
            // not send keeps its value, while an explicit `null` clears it.
            .set(changes)
            .where(ownedBy(ctx.subject.id, id))
            .returning()
        : await db
            .select()
            .from(recommendersTable)
            .where(ownedBy(ctx.subject.id, id));

      if (!recommender) throw new TRPCError({ code: "NOT_FOUND" });
      return recommender;
    }),

  /** Deletes a recommender together with their letters. */
  delete: protectedProcedure
    .input(RecommenderIdentity)
    .output(Deleted)
    .mutation(async ({ ctx, input }) => {
      // Their letters go with them: the foreign key is `on delete cascade`.
      const [deleted] = await db
        .delete(recommendersTable)
        .where(ownedBy(ctx.subject.id, input.id))
        .returning({ id: recommendersTable.id });

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return deleted;
    }),

  /**
   * (P1) Turns the recommender portal link on or off, optionally replacing
   * its secret so that an old link stops working.
   */
  setSharing: protectedProcedure
    .input(RecommenderSharing)
    .output(SharingState)
    .mutation(async ({ ctx, input }) => {
      const [recommender] = await db
        .update(recommendersTable)
        .set({
          shareEnabled: input.enabled,
          // A new secret makes the old link stop working at once.
          ...(input.regenerateToken && { shareToken: randomUUID() }),
        })
        .where(ownedBy(ctx.subject.id, input.id))
        .returning({
          shareEnabled: recommendersTable.shareEnabled,
          shareToken: recommendersTable.shareToken,
        });

      if (!recommender) throw new TRPCError({ code: "NOT_FOUND" });

      // The secret leaves the server only here, as part of the link, and
      // only while the link works. `Recommender` never includes it.
      return {
        shareEnabled: recommender.shareEnabled,
        shareUrl: recommender.shareEnabled
          ? `${await siteOrigin()}/r/${recommender.shareToken}`
          : null,
      };
    }),
});
