/**
 * The dialog for changing the signed-in user's display name.
 * Opened from the user menu.
 */

"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FormField, fieldAria } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProfileUpdate } from "@/server/models/inputs";
import { api } from "@/utils/trpc/api";

type EditProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
};

export function EditProfileDialog({
  open,
  onOpenChange,
  currentName,
}: EditProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Your name is shown in the app and to recommenders you share a link
            with.
          </DialogDescription>
        </DialogHeader>
        {/* The form mounts with the dialog, so its state starts fresh each time. */}
        <EditProfileForm
          currentName={currentName}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type EditProfileFormProps = { currentName: string; onDone: () => void };

function EditProfileForm({ currentName, onDone }: EditProfileFormProps) {
  const apiUtils = api.useUtils();
  const [nameError, setNameError] = useState<string>();

  const updateProfile = api.profile.update.useMutation({
    onSuccess: async () => {
      // Reload the name everywhere it is shown (the user menu).
      await apiUtils.profile.me.invalidate();
      toast.success("Profile updated");
      onDone();
    },
    onError: (error) => {
      // The server runs the same Zod model, so show its message on the field.
      const serverMessage = error.data?.zodError?.fieldErrors.displayName?.[0];
      if (serverMessage) setNameError(serverMessage);
      else toast.error("Could not update your profile. Try again.");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const parsed = ProfileUpdate.safeParse({
      displayName: form.get("displayName"),
    });
    if (!parsed.success) {
      setNameError("Enter a name of 1 to 80 characters.");
      return;
    }

    setNameError(undefined);
    updateProfile.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField id="profile-name" label="Name" error={nameError}>
        <Input
          id="profile-name"
          name="displayName"
          autoComplete="name"
          defaultValue={currentName}
          {...fieldAria("profile-name", nameError)}
        />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending && (
            <Loader2Icon className="animate-spin" aria-hidden />
          )}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
