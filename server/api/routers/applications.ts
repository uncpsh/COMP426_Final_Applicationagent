/**
 * tRPC APIs for applications (grad school and internship).
 * Every procedure here requires a signed-in user and only ever touches
 * that user's own applications.
 */

import { notImplemented } from "@/server/api/not-implemented";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
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

export const applicationsApiRouter = createTRPCRouter({
  /**
   * Lists the user's applications with letter and document counts.
   * `search` matches the organization or the position.
   */
  list: protectedProcedure
    .input(ApplicationListFilters)
    .output(ApplicationSummary.array())
    .query(() => notImplemented("applications.list")),

  /** Returns one application with its letters and attached documents. */
  byId: protectedProcedure
    .input(ApplicationIdentity)
    .output(ApplicationDetail)
    .query(() => notImplemented("applications.byId")),

  /** Creates an application owned by the signed-in user. */
  create: protectedProcedure
    .input(DraftApplication)
    .output(Application)
    .mutation(() => notImplemented("applications.create")),

  /** Edits any field of an application. */
  update: protectedProcedure
    .input(ApplicationUpdate)
    .output(Application)
    .mutation(() => notImplemented("applications.update")),

  /**
   * Changes only the status. Sets `submittedAt` the first time the status
   * becomes `submitted`.
   */
  updateStatus: protectedProcedure
    .input(ApplicationStatusUpdate)
    .output(Application)
    .mutation(() => notImplemented("applications.updateStatus")),

  /** Deletes an application together with its letters and attachments. */
  delete: protectedProcedure
    .input(ApplicationIdentity)
    .output(Deleted)
    .mutation(() => notImplemented("applications.delete")),
});
