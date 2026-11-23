import { applicationDocumentsApiRouter } from "@/server/api/routers/application-documents";
import { applicationsApiRouter } from "@/server/api/routers/applications";
import { dashboardApiRouter } from "@/server/api/routers/dashboard";
import { documentsApiRouter } from "@/server/api/routers/documents";
import { portalApiRouter } from "@/server/api/routers/portal";
import { profileApiRouter } from "@/server/api/routers/profile";
import { recommendationsApiRouter } from "@/server/api/routers/recommendations";
import { recommendersApiRouter } from "@/server/api/routers/recommenders";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * Primary router for the API server.
 *
 * Each key is the first part of a procedure's path, so
 * `applications.list` is the `list` procedure of `applicationsApiRouter`.
 */
export const appRouter = createTRPCRouter({
  profile: profileApiRouter,
  applications: applicationsApiRouter,
  recommenders: recommendersApiRouter,
  recommendations: recommendationsApiRouter,
  documents: documentsApiRouter,
  applicationDocuments: applicationDocumentsApiRouter,
  dashboard: dashboardApiRouter,
  portal: portalApiRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
