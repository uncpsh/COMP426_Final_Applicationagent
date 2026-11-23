/**
 * tRPC APIs for applications (grad school and internship).
 *
 * Every procedure here requires a signed-in user and only ever touches that
 * user's own applications: each query filters on `user_id`, so an application
 * that belongs to someone else behaves exactly like one that does not exist
 * (`NOT_FOUND`).
 */

import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  getColumns,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
  applicationDocumentsTable,
  applicationsTable,
  recommendationRequestsTable,
} from "@/server/db/schema";
import {
  ApplicationIdentity,
  ApplicationListFilters,
  ApplicationStatusUpdate,
  ApplicationUpdate,
  DraftApplication,
} from "@/server/models/inputs";
import {
  Application,
  ApplicationDetail,
  ApplicationSummary,
  Deleted,
} from "@/server/models/responses";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** The condition "this application, and it belongs to this user". */
function ownedBy(userId: string, applicationId: string) {
  return and(
    eq(applicationsTable.id, applicationId),
    eq(applicationsTable.userId, userId),
  );
}

/**
 * Escapes the wildcards of SQL `LIKE`, so that searching for "50%" finds the
 * text "50%" instead of treating `%` as "anything".
 */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

type ListSort = z.infer<typeof ApplicationListFilters>["sort"];

/** Turns the `sort` option of `list` into `ORDER BY` terms. */
function listOrder(sort: ListSort): SQL[] {
  const organization = sql`lower(${applicationsTable.organization})`;

  switch (sort) {
    case "updated":
      return [desc(applicationsTable.updatedAt)];
    case "organization":
      return [
        asc(organization),
        asc(sql`lower(${applicationsTable.position})`),
      ];
    default:
      // "deadline". Postgres sorts NULL last in ascending order, so
      // applications with a rolling deadline come after the dated ones.
      return [asc(applicationsTable.deadlineAt), asc(organization)];
  }
}

/** The fields `update` may change: everything in its input except the id. */
type ApplicationChanges = Omit<z.infer<typeof ApplicationUpdate>, "id">;

/**
 * Applies `changes` to one of the user's applications and returns the new
 * row. Shared by `update` and `updateStatus` so that the `submittedAt` rule
 * lives in exactly one place.
 */
async function updateOwnedApplication(
  userId: string,
  applicationId: string,
  changes: ApplicationChanges,
) {
  const [updated] = await db
    .update(applicationsTable)
    .set({
      // Drizzle skips `undefined` values, so a field the client did not send
      // keeps its value, while an explicit `null` clears it.
      ...changes,
      // `submittedAt` records the *first* time the status became
      // "submitted": `coalesce` only fills it in while it is still empty.
      // Doing this inside the UPDATE avoids a separate read-then-write.
      ...(changes.status === "submitted" && {
        submittedAt: sql`coalesce(${applicationsTable.submittedAt}, now())`,
      }),
    })
    .where(ownedBy(userId, applicationId))
    .returning();

  if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
  return updated;
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export const applicationsApiRouter = createTRPCRouter({
  /**
   * Lists the user's applications with letter and document counts.
   * `search` matches the organization or the position.
   */
  list: protectedProcedure
    .input(ApplicationListFilters)
    .output(ApplicationSummary.array())
    .query(async ({ ctx, input }) => {
      const filters: (SQL | undefined)[] = [
        eq(applicationsTable.userId, ctx.subject.id),
      ];
      if (input.kind) filters.push(eq(applicationsTable.kind, input.kind));
      // An empty list means "no status filter", the same as leaving it out.
      if (input.statuses?.length) {
        filters.push(inArray(applicationsTable.status, input.statuses));
      }
      if (input.search) {
        const pattern = `%${escapeLike(input.search)}%`;
        filters.push(
          or(
            ilike(applicationsTable.organization, pattern),
            ilike(applicationsTable.position, pattern),
          ),
        );
      }

      // The counts are subqueries, so Postgres returns each application and
      // its three numbers in a single round trip.
      const lettersOfApplication = eq(
        recommendationRequestsTable.applicationId,
        applicationsTable.id,
      );
      const rows = await db
        .select({
          ...getColumns(applicationsTable),
          lettersTotal: db.$count(
            recommendationRequestsTable,
            lettersOfApplication,
          ),
          lettersSubmitted: db.$count(
            recommendationRequestsTable,
            and(
              lettersOfApplication,
              eq(recommendationRequestsTable.status, "submitted"),
            ),
          ),
          documentCount: db.$count(
            applicationDocumentsTable,
            eq(applicationDocumentsTable.applicationId, applicationsTable.id),
          ),
        })
        .from(applicationsTable)
        .where(and(...filters))
        .orderBy(...listOrder(input.sort));

      return rows.map(({ lettersTotal, lettersSubmitted, ...application }) => ({
        ...application,
        letters: { submitted: lettersSubmitted, total: lettersTotal },
      }));
    }),

  /** Returns one application with its letters and attached documents. */
  byId: protectedProcedure
    .input(ApplicationIdentity)
    .output(ApplicationDetail)
    .query(async ({ ctx, input }) => {
      // One relational query follows both many-to-many relationships:
      // application -> letters -> recommender, and
      // application -> attachments -> version -> document.
      const application = await db.query.applicationsTable.findFirst({
        where: { id: input.id, userId: ctx.subject.id },
        with: {
          letters: {
            with: {
              recommender: {
                columns: { id: true, name: true, email: true, title: true },
              },
            },
          },
          attachments: {
            with: {
              documentVersion: {
                with: {
                  document: {
                    // Every version number of the document, to find the
                    // latest one for the "newer version available" hint.
                    with: { versions: { columns: { versionNumber: true } } },
                  },
                },
              },
            },
          },
        },
      });

      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const { letters, attachments, ...fields } = application;
      return {
        ...fields,
        letters: letters.sort((a, b) =>
          a.recommender.name.localeCompare(b.recommender.name),
        ),
        documents: attachments
          .map(({ attachedAt, documentVersion }) => ({
            versionId: documentVersion.id,
            versionNumber: documentVersion.versionNumber,
            fileName: documentVersion.fileName,
            attachedAt,
            document: {
              id: documentVersion.document.id,
              title: documentVersion.document.title,
              type: documentVersion.document.type,
              latestVersionNumber: Math.max(
                ...documentVersion.document.versions.map(
                  (version) => version.versionNumber,
                ),
              ),
            },
          }))
          .sort((a, b) => a.document.title.localeCompare(b.document.title)),
      };
    }),

  /** Creates an application owned by the signed-in user. */
  create: protectedProcedure
    .input(DraftApplication)
    .output(Application)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(applicationsTable)
        .values({
          ...input,
          // The owner always comes from the session, never from the client.
          userId: ctx.subject.id,
          // An application can be entered after it was already submitted.
          submittedAt: input.status === "submitted" ? new Date() : null,
        })
        .returning();

      return created;
    }),

  /** Edits any field of an application. */
  update: protectedProcedure
    .input(ApplicationUpdate)
    .output(Application)
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;

      // With nothing to change there is nothing to write (and `updatedAt`
      // should not move), so just return the application as it is.
      const hasChanges = Object.values(changes).some(
        (value) => value !== undefined,
      );
      if (!hasChanges) {
        const [current] = await db
          .select()
          .from(applicationsTable)
          .where(ownedBy(ctx.subject.id, id));
        if (!current) throw new TRPCError({ code: "NOT_FOUND" });
        return current;
      }

      return updateOwnedApplication(ctx.subject.id, id, changes);
    }),

  /**
   * Changes only the status. Sets `submittedAt` the first time the status
   * becomes `submitted`.
   */
  updateStatus: protectedProcedure
    .input(ApplicationStatusUpdate)
    .output(Application)
    .mutation(({ ctx, input }) =>
      updateOwnedApplication(ctx.subject.id, input.id, {
        status: input.status,
      }),
    ),

  /** Deletes an application together with its letters and attachments. */
  delete: protectedProcedure
    .input(ApplicationIdentity)
    .output(Deleted)
    .mutation(async ({ ctx, input }) => {
      // The letters and attachments go with it: their foreign keys are
      // declared `on delete cascade`.
      const [deleted] = await db
        .delete(applicationsTable)
        .where(ownedBy(ctx.subject.id, input.id))
        .returning({ id: applicationsTable.id });

      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return deleted;
    }),
});
