/**
 * tRPC APIs for documents and their uploaded versions.
 *
 * Every procedure here requires a signed-in user. A document is scoped by
 * `user_id`; a version has no `user_id` of its own and belongs to the user
 * if its document does. Anything that belongs to someone else behaves
 * exactly like something that does not exist (`NOT_FOUND`).
 */

import { TRPCError } from "@trpc/server";
import { and, eq, max } from "drizzle-orm";
import {
  createDownloadUrl,
  DOWNLOAD_URL_SECONDS,
  removeFiles,
} from "@/server/api/document-storage";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { documentsTable, documentVersionsTable } from "@/server/db/schema";
import {
  DocumentIdentity,
  DocumentListFilters,
  DocumentUpdate,
  DocumentVersionIdentity,
  DraftDocument,
  DraftDocumentVersion,
} from "@/server/models/inputs";
import {
  Deleted,
  Doc,
  DocDetail,
  DocSummary,
  DocVersion,
  DownloadUrl,
} from "@/server/models/responses";

/** The condition "this document, and it belongs to this user". */
function ownedBy(userId: string, documentId: string) {
  return and(
    eq(documentsTable.id, documentId),
    eq(documentsTable.userId, userId),
  );
}

export const documentsApiRouter = createTRPCRouter({
  /** Lists the user's documents with version and usage counts. */
  list: protectedProcedure
    .input(DocumentListFilters)
    .output(DocSummary.array())
    .query(async ({ ctx, input }) => {
      // Each document comes with its versions, and each version with the
      // applications it is attached to. A user has a handful of documents,
      // so the counting is done here rather than in SQL.
      const documents = await db.query.documentsTable.findMany({
        where: {
          userId: ctx.subject.id,
          // Drizzle rejects `undefined` in a filter, so the type is only
          // added when the client asked for one.
          ...(input.type && { type: input.type }),
        },
        with: {
          versions: {
            columns: { id: true, versionNumber: true, createdAt: true },
            with: { attachments: { columns: { applicationId: true } } },
            orderBy: { versionNumber: "desc" },
          },
        },
        // A new version touches `updatedAt`, so this is "recently changed".
        orderBy: { updatedAt: "desc" },
      });

      return documents.map(({ versions, ...document }) => {
        const [latest] = versions;
        const applicationIds = new Set(
          versions.flatMap((version) =>
            version.attachments.map((attachment) => attachment.applicationId),
          ),
        );

        return {
          ...document,
          versionCount: versions.length,
          latestVersion: latest ?? null,
          applicationCount: applicationIds.size,
        };
      });
    }),

  /** Returns one document with its version history and where each version is used. */
  byId: protectedProcedure
    .input(DocumentIdentity)
    .output(DocDetail)
    .query(async ({ ctx, input }) => {
      // `applications` is the many-to-many relation that goes through the
      // `application_documents` join table: version -> applications.
      const document = await db.query.documentsTable.findFirst({
        where: { id: input.id, userId: ctx.subject.id },
        with: {
          versions: {
            with: {
              applications: {
                columns: {
                  id: true,
                  organization: true,
                  position: true,
                  status: true,
                },
                orderBy: { organization: "asc" },
              },
            },
            orderBy: { versionNumber: "desc" },
          },
        },
      });

      if (!document) throw new TRPCError({ code: "NOT_FOUND" });
      return document;
    }),

  /** Creates a document with no versions yet. */
  create: protectedProcedure
    .input(DraftDocument)
    .output(Doc)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(documentsTable)
        // The owner always comes from the session, never from the client.
        .values({ ...input, userId: ctx.subject.id })
        .returning();

      return created;
    }),

  /** Renames a document or changes its type. */
  update: protectedProcedure
    .input(DocumentUpdate)
    .output(Doc)
    .mutation(async ({ ctx, input }) => {
      const { id, ...changes } = input;

      // With nothing to change there is nothing to write.
      const hasChanges = Object.values(changes).some(
        (value) => value !== undefined,
      );
      const [document] = hasChanges
        ? await db
            .update(documentsTable)
            .set(changes)
            .where(ownedBy(ctx.subject.id, id))
            .returning()
        : await db
            .select()
            .from(documentsTable)
            .where(ownedBy(ctx.subject.id, id));

      if (!document) throw new TRPCError({ code: "NOT_FOUND" });
      return document;
    }),

  /** Deletes a document, its versions, and its files in Storage. */
  delete: protectedProcedure
    .input(DocumentIdentity)
    .output(Deleted)
    .mutation(async ({ ctx, input }) => {
      // Read the file paths first: once the rows are gone, nothing else
      // remembers where the files are.
      const files = await db
        .select({ storagePath: documentVersionsTable.storagePath })
        .from(documentVersionsTable)
        .innerJoin(
          documentsTable,
          eq(documentsTable.id, documentVersionsTable.documentId),
        )
        .where(ownedBy(ctx.subject.id, input.id));

      // The versions and their attachments go with the document: both
      // foreign keys are `on delete cascade`.
      const [deleted] = await db
        .delete(documentsTable)
        .where(ownedBy(ctx.subject.id, input.id))
        .returning({ id: documentsTable.id });
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });

      // Database first, files second. If the file deletion fails, the user
      // is left with unreachable files (logged on the server) rather than
      // with a document whose downloads are broken.
      await removeFiles(files.map((file) => file.storagePath));
      return deleted;
    }),

  /**
   * Records a file the browser has already uploaded to Storage as the next
   * version. Rejects a `storagePath` outside the user's own folder.
   */
  addVersion: protectedProcedure
    .input(DraftDocumentVersion)
    .output(DocVersion)
    .mutation(async ({ ctx, input }) => {
      // The path is chosen by the browser, so it cannot be trusted. Without
      // this check a user could register a path inside someone else's
      // folder and then ask for a download link to that file.
      const ownFolder = `${ctx.subject.id}/${input.documentId}/`;
      if (!input.storagePath.startsWith(ownFolder)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The file is not in this document's folder.",
        });
      }

      return db.transaction(async (tx) => {
        // Lock the document row until the transaction ends. Two uploads at
        // the same moment then take turns, so they cannot both read the
        // same "highest version so far" and try to use the same number.
        const [document] = await tx
          .select({ id: documentsTable.id })
          .from(documentsTable)
          .where(ownedBy(ctx.subject.id, input.documentId))
          .for("update");
        if (!document) throw new TRPCError({ code: "NOT_FOUND" });

        const [highest] = await tx
          .select({ versionNumber: max(documentVersionsTable.versionNumber) })
          .from(documentVersionsTable)
          .where(eq(documentVersionsTable.documentId, document.id));

        const [version] = await tx
          .insert(documentVersionsTable)
          .values({
            ...input,
            // The number is assigned here, never taken from the client.
            versionNumber: (highest?.versionNumber ?? 0) + 1,
          })
          .returning();

        // A new version counts as a change to the document.
        await tx
          .update(documentsTable)
          .set({ updatedAt: new Date() })
          .where(eq(documentsTable.id, document.id));

        return version;
      });
    }),

  /** Returns a short-lived signed URL for downloading one version. */
  downloadUrl: protectedProcedure
    .input(DocumentVersionIdentity)
    .output(DownloadUrl)
    .query(async ({ ctx, input }) => {
      // The join to `documents` is the ownership check: a version belongs
      // to the user if its document does.
      const [version] = await db
        .select({
          storagePath: documentVersionsTable.storagePath,
          fileName: documentVersionsTable.fileName,
        })
        .from(documentVersionsTable)
        .innerJoin(
          documentsTable,
          eq(documentsTable.id, documentVersionsTable.documentId),
        )
        .where(
          and(
            eq(documentVersionsTable.id, input.versionId),
            eq(documentsTable.userId, ctx.subject.id),
          ),
        );
      if (!version) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        url: await createDownloadUrl(version.storagePath, version.fileName),
        expiresInSeconds: DOWNLOAD_URL_SECONDS,
      };
    }),
});
