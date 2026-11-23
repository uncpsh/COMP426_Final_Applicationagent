import { TRPCError } from "@trpc/server";

/**
 * Placeholder body for a procedure whose input and output are already fixed
 * but whose logic is written in a later step of the build plan.
 *
 * Returning `never` lets a procedure declare its real `.output(...)` model
 * now, so the API documentation and the code cannot drift apart.
 */
export function notImplemented(path: string): never {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: `${path} is not implemented yet.`,
  });
}
