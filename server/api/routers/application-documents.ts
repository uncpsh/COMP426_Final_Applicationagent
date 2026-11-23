/**
 * tRPC APIs for attachments: the join between applications and document
 * versions. Every procedure here requires a signed-in user, and both the
 * application and the document version must belong to that user.
 */

import { notImplemented } from "@/server/api/not-implemented";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ApplicationDocumentLink } from "@/server/models/inputs";
import { AttachedDocument, DetachedDocument } from "@/server/models/responses";

export const applicationDocumentsApiRouter = createTRPCRouter({
  /**
   * Attaches a version to an application, replacing any other version of
   * the same document that was attached before.
   */
  attach: protectedProcedure
    .input(ApplicationDocumentLink)
    .output(AttachedDocument)
    .mutation(() => notImplemented("applicationDocuments.attach")),

  /** Detaches a version from an application. */
  detach: protectedProcedure
    .input(ApplicationDocumentLink)
    .output(DetachedDocument)
    .mutation(() => notImplemented("applicationDocuments.detach")),
});
