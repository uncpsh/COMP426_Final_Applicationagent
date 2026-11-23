/**
 * tRPC APIs for the dashboard. Requires a signed-in user.
 */

import { notImplemented } from "@/server/api/not-implemented";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { DashboardSummary } from "@/server/models/responses";

export const dashboardApiRouter = createTRPCRouter({
  /**
   * Returns everything the dashboard shows in one request: counts by status,
   * what is overdue or due in the next 30 days (applications and letters),
   * letters outstanding per recommender, and the total of submitted fees.
   */
  summary: protectedProcedure
    .output(DashboardSummary)
    .query(() => notImplemented("dashboard.summary")),
});
