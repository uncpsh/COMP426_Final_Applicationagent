/**
 * Configuration for the server-side tRPC API, including the primary API router.
 *
 * Each feature (applications, recommenders, documents, ...) gets its own router
 * in `./routers/` and is registered here. The planned API is in AGENTS.md §6.
 */

import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/** Primary router for the API server. Empty until the routers are added in step 1.4. */
export const appRouter = createTRPCRouter({});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
