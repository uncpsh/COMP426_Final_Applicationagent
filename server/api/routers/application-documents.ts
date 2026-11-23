/**
 * tRPC APIs for attachments: the join between applications and document
 * versions (the `application_documents` table).
 *
 * Every procedure here requires a signed-in user, and both the application
 * and the document version must belong to that user.
 */

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
  applicationDocumentsTable,
  applicationsTable,
  documentsTable,
  documentVersionsTable,
} from "@/server/db/schema";
import { ApplicationDocumentLink } from "@/server/models/inputs";
import { AttachedDocument, DetachedDocument } from "@/server/models/responses";

const attachments = applicationDocumentsTable;

export const applicationDocumentsApiRouter = createTRPCRouter({
  /**
   * Attaches a version to an application, replacing any other version of
   * the same document that was attached before.
   */
  attach: protectedProcedure
    .input(ApplicationDocumentLink)
    .output(AttachedDocument)
    .mutation(async ({ ctx, input }) => {
      return db.transaction(async (tx) => {
        // Check BOTH sides of the join. Checking only the application would
        // let a user attach someone else's version id to it and then read
        // that document's title and file name through `applications.byId`.
        //
        // The application row is also locked until the transaction ends, so
        // two attaches at the same moment take turns and the "one version
        // per document" rule below cannot be broken by a race.
        const [application] = await tx
          .select({ id: applicationsTable.id })
          .from(applicationsTable)
          .where(
            and(
              eq(applicationsTable.id, input.applicationId),
              eq(applicationsTable.userId, ctx.subject.id),
            ),
          )
          .for("update");

        const [version] = await tx
          .select({
            id: documentVersionsTable.id,
            documentId: documentVersionsTable.documentId,
          })
          .from(documentVersionsTable)
          .innerJoin(
            documentsTable,
            eq(documentsTable.id, documentVersionsTable.documentId),
          )
          .where(
            and(
              eq(documentVersionsTable.id, input.documentVersionId),
              eq(documentsTable.userId, ctx.subject.id),
            ),
          );

        if (!application || !version) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // An application records exactly which version of a document was
        // sent, so it holds at most one version of each document. Detach
        // the other versions of this document before attaching this one.
        const otherVersionsOfDocument = tx
          .select({ id: documentVersionsTable.id })
          .from(documentVersionsTable)
          .where(
            and(
              eq(documentVersionsTable.documentId, version.documentId),
              ne(documentVersionsTable.id, version.id),
            ),
          );
        await tx
          .delete(attachments)
          .where(
            and(
              eq(attachments.applicationId, application.id),
              inArray(attachments.documentVersionId, otherVersionsOfDocument),
            ),
          );

        // Attaching the version that is already attached changes nothing:
        // the composite primary key rejects the duplicate, and the existing
        // row (with its original `attachedAt`) is returned instead.
        const link = {
          applicationId: application.id,
          documentVersionId: version.id,
        };
        const [created] = await tx
          .insert(attachments)
          .values(link)
          .onConflictDoNothing()
          .returning();
        if (created) return created;

        const [existing] = await tx
          .select()
          .from(attachments)
          .where(
            and(
              eq(attachments.applicationId, link.applicationId),
              eq(attachments.documentVersionId, link.documentVersionId),
            ),
          );
        return existing;
      });
    }),

  /** Detaches a version from an application. */
  detach: protectedProcedure
    .input(ApplicationDocumentLink)
    .output(DetachedDocument)
    .mutation(async ({ ctx, input }) => {
      // An attachment belongs to the user if its application does. (Its
      // version then does too, because `attach` checked both sides.)
      const ownApplicationIds = db
        .select({ id: applicationsTable.id })
        .from(applicationsTable)
        .where(eq(applicationsTable.userId, ctx.subject.id));

      const [detached] = await db
        .delete(attachments)
        .where(
          and(
            eq(attachments.applicationId, input.applicationId),
            eq(attachments.documentVersionId, input.documentVersionId),
            inArray(attachments.applicationId, ownApplicationIds),
          ),
        )
        .returning();

      if (!detached) throw new TRPCError({ code: "NOT_FOUND" });
      return detached;
    }),
});
