/**
 * tRPC APIs for the signed-in user's own profile.
 * Every procedure here requires a signed-in user.
 */

import { notImplemented } from "@/server/api/not-implemented";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ProfileUpdate } from "@/server/models/inputs";
import { Me, ProfileName } from "@/server/models/responses";

export const profileApiRouter = createTRPCRouter({
  /** Returns the signed-in user's id, display name and email. */
  me: protectedProcedure.output(Me).query(() => notImplemented("profile.me")),

  /** Changes the signed-in user's display name. */
  update: protectedProcedure
    .input(ProfileUpdate)
    .output(ProfileName)
    .mutation(() => notImplemented("profile.update")),
});
