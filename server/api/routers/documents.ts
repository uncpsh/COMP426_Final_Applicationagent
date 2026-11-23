/**
 * tRPC APIs for documents and their uploaded versions.
 * Every procedure here requires a signed-in user. A version belongs to the
 * user if its document does.
 */

import { notImplemented } from "@/server/api/not-implemented";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
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

export const documentsApiRouter = createTRPCRouter({
  /** Lists the user's documents with version and usage counts. */
  list: protectedProcedure
    .input(DocumentListFilters)
    .output(DocSummary.array())
    .query(() => notImplemented("documents.list")),

  /** Returns one document with its version history and where each version is used. */
  byId: protectedProcedure
    .input(DocumentIdentity)
    .output(DocDetail)
    .query(() => notImplemented("documents.byId")),

  /** Creates a document with no versions yet. */
  create: protectedProcedure
    .input(DraftDocument)
    .output(Doc)
    .mutation(() => notImplemented("documents.create")),

  /** Renames a document or changes its type. */
  update: protectedProcedure
    .input(DocumentUpdate)
    .output(Doc)
    .mutation(() => notImplemented("documents.update")),

  /** Deletes a document, its versions, and its files in Storage. */
  delete: protectedProcedure
    .input(DocumentIdentity)
    .output(Deleted)
    .mutation(() => notImplemented("documents.delete")),

  /**
   * Records a file the browser has already uploaded to Storage as the next
   * version. Rejects a `storagePath` outside the user's own folder.
   */
  addVersion: protectedProcedure
    .input(DraftDocumentVersion)
    .output(DocVersion)
    .mutation(() => notImplemented("documents.addVersion")),

  /** Returns a short-lived signed URL for downloading one version. */
  downloadUrl: protectedProcedure
    .input(DocumentVersionIdentity)
    .output(DownloadUrl)
    .query(() => notImplemented("documents.downloadUrl")),
});
