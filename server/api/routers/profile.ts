/**
 * tRPC APIs for the signed-in user's own profile.
 * Every procedure here requires a signed-in user.
 */

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { profilesTable } from "@/server/db/schema";
import { ProfileUpdate } from "@/server/models/inputs";
import { Me, ProfileName } from "@/server/models/responses";

export const profileApiRouter = createTRPCRouter({
  /**
   * Returns the signed-in user's id, display name and email.
   *
   * The display name lives in our `profiles` table and the email in
   * Supabase's `auth.users`, so this joins the two on their shared id.
   */
  me: protectedProcedure.output(Me).query(async ({ ctx }) => {
    const [me] = await db
      .select({
        id: profilesTable.id,
        displayName: profilesTable.displayName,
        email: authUsers.email,
      })
      .from(profilesTable)
      .innerJoin(authUsers, eq(authUsers.id, profilesTable.id))
      .where(eq(profilesTable.id, ctx.subject.id));

    if (!me) throw new TRPCError({ code: "NOT_FOUND" });

    // `auth.users.email` is nullable because Supabase also supports phone
    // sign-in. We only offer email sign-up, so it is always set in practice.
    return { ...me, email: me.email ?? "" };
  }),

  /** Changes the signed-in user's display name. */
  update: protectedProcedure
    .input(ProfileUpdate)
    .output(ProfileName)
    .mutation(async ({ ctx, input }) => {
      // The row is chosen by the id from the session, never by an id from the
      // client, so a user can only ever rename themselves.
      const [updated] = await db
        .update(profilesTable)
        .set({ displayName: input.displayName })
        .where(eq(profilesTable.id, ctx.subject.id))
        .returning({
          id: profilesTable.id,
          displayName: profilesTable.displayName,
        });

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
