/**
 * tRPC APIs for letters: the join between applications and recommenders.
 * Every procedure here requires a signed-in user. A letter belongs to the
 * user if its application does.
 */

import { notImplemented } from "@/server/api/not-implemented";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  RecommendationAssignment,
  RecommendationIdentity,
  RecommendationUpdate,
} from "@/server/models/inputs";
import { Deleted, RecommendationRequest } from "@/server/models/responses";

export const recommendationsApiRouter = createTRPCRouter({
  /**
   * Assigns a recommender to an application. Both must belong to the user.
   * Throws `CONFLICT` if that recommender is already assigned.
   */
  assign: protectedProcedure
    .input(RecommendationAssignment)
    .output(RecommendationRequest)
    .mutation(() => notImplemented("recommendations.assign")),

  /**
   * Edits a letter. Sets `requestedAt` / `submittedAt` when the status
   * changes to `requested` / `submitted`.
   */
  update: protectedProcedure
    .input(RecommendationUpdate)
    .output(RecommendationRequest)
    .mutation(() => notImplemented("recommendations.update")),

  /** Removes a recommender from an application. */
  remove: protectedProcedure
    .input(RecommendationIdentity)
    .output(Deleted)
    .mutation(() => notImplemented("recommendations.remove")),
});
