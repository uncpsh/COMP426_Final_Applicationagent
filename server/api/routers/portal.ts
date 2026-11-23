/**
 * (P1) tRPC APIs for the recommender portal at `/r/[token]`.
 *
 * These are the only PUBLIC procedures: a recommender has no account. The
 * unguessable `token` in the link is what grants access, and only while the
 * applicant has sharing turned on for that recommender.
 */

import { notImplemented } from "@/server/api/not-implemented";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { PortalSubmission, PortalToken } from "@/server/models/inputs";
import { PortalSubmissionResult, PortalView } from "@/server/models/responses";

export const portalApiRouter = createTRPCRouter({
  /**
   * Returns the letters this recommender has been asked for (`requested`,
   * `confirmed` or `submitted`). `NOT_FOUND` when sharing is off.
   */
  byToken: publicProcedure
    .input(PortalToken)
    .output(PortalView)
    .query(() => notImplemented("portal.byToken")),

  /** Marks one of this recommender's own letters as submitted. */
  markSubmitted: publicProcedure
    .input(PortalSubmission)
    .output(PortalSubmissionResult)
    .mutation(() => notImplemented("portal.markSubmitted")),
});
