/**
 * The avatar button in the header and its menu: who is signed in, a link to
 * edit the profile, and "Log out".
 *
 * The name and email come from the `profile.me` tRPC query, so this is the
 * first place the app shows user-specific data.
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EditProfileDialog } from "@/components/shell/edit-profile-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import { api } from "@/utils/trpc/api";

/** "Ada Lovelace" -> "AL", "ada" -> "A". */
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      // `Array.from` splits by character, so an emoji or accented first letter
      // is not cut in half the way `word[0]` would cut it.
      .map((word) => (Array.from(word)[0] ?? "").toUpperCase())
      .join("")
  );
}

export function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { data: me, isPending } = api.profile.me.useQuery();

  async function handleLogOut() {
    const supabase = createSupabaseComponentClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Could not log out. Try again.");
      return;
    }

    // Drop every cached query: the next person to use this browser must not
    // see this user's applications, even for a moment.
    queryClient.clear();
    router.push("/login");
    // Re-render the Server Components now that the session cookie is gone.
    router.refresh();
  }

  if (isPending) return <Skeleton className="h-9 w-9 rounded-full" />;

  // If the profile failed to load, the menu still renders so that the user
  // can always log out.
  return (
    <>
      {/* `modal={false}`: this menu opens a dialog, and a modal menu closing
          at the same moment would leave the page unclickable. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Open user menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs font-medium">
                {me ? initials(me.displayName) : <UserRound aria-hidden />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">
              {me?.displayName ?? "Account"}
            </p>
            {me && (
              <p className="text-muted-foreground truncate text-xs">
                {me.email}
              </p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {me && (
            <DropdownMenuItem onSelect={() => setIsEditingProfile(true)}>
              <UserRound aria-hidden /> Edit profile
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={handleLogOut}>
            <LogOut aria-hidden /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {me && (
        <EditProfileDialog
          open={isEditingProfile}
          onOpenChange={setIsEditingProfile}
          currentName={me.displayName}
        />
      )}
    </>
  );
}
