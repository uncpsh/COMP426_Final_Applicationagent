/**
 * tRPC APIs for recommenders (the people who write letters).
 * Every procedure here requires a signed-in user and only ever touches
 * that user's own recommenders.
 */

import { notImplemented } from "@/server/api/not-implemented";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  DraftRecommender,
  RecommenderIdentity,
  RecommenderSharing,
  RecommenderUpdate,
} from "@/server/models/inputs";
import {
  Deleted,
  Recommender,
  RecommenderDetail,
  RecommenderWithStats,
  SharingState,
} from "@/server/models/responses";

export const recommendersApiRouter = createTRPCRouter({
  /** Lists the user's recommenders with letter counts and the next due date. */
  list: protectedProcedure
    .output(RecommenderWithStats.array())
    .query(() => notImplemented("recommenders.list")),

  /** Returns one recommender with their letters across all applications. */
  byId: protectedProcedure
    .input(RecommenderIdentity)
    .output(RecommenderDetail)
    .query(() => notImplemented("recommenders.byId")),

  /** Creates a recommender owned by the signed-in user. */
  create: protectedProcedure
    .input(DraftRecommender)
    .output(Recommender)
    .mutation(() => notImplemented("recommenders.create")),

  /** Edits any field of a recommender. */
  update: protectedProcedure
    .input(RecommenderUpdate)
    .output(Recommender)
    .mutation(() => notImplemented("recommenders.update")),

  /** Deletes a recommender together with their letters. */
  delete: protectedProcedure
    .input(RecommenderIdentity)
    .output(Deleted)
    .mutation(() => notImplemented("recommenders.delete")),

  /**
   * (P1) Turns the recommender portal link on or off, optionally replacing
   * its secret so that an old link stops working.
   */
  setSharing: protectedProcedure
    .input(RecommenderSharing)
    .output(SharingState)
    .mutation(() => notImplemented("recommenders.setSharing")),
});
