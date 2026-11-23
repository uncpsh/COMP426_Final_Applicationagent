/**
 * The dialog for adding a recommender or editing an existing one.
 * Validated with `DraftRecommender`, the same Zod model the server uses.
 */

"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { DraftRecommender } from "@/server/models/inputs";
import { api, type RouterOutputs } from "@/utils/trpc/api";

type Recommender = RouterOutputs["recommenders"]["create"];
type FieldName = keyof z.input<typeof DraftRecommender>;
type FormValues = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

/** Keeps the first message of each field. */
function firstMessages(
  fieldErrors: Record<string, string[] | undefined>,
): FieldErrors {
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]) =>
      messages?.[0] ? [[field, messages[0]]] : [],
    ),
  );
}

type RecommenderFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a recommender to edit them; leave out to add a new one. */
  recommender?: Recommender;
};

export function RecommenderFormDialog({
  open,
  onOpenChange,
  recommender,
}: RecommenderFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {recommender ? "Edit recommender" : "New recommender"}
          </DialogTitle>
          <DialogDescription>
            Only the name is required. You assign them to applications from each
            application&apos;s page.
          </DialogDescription>
        </DialogHeader>
        {/* The form mounts with the dialog, so its state starts fresh each time. */}
        <RecommenderForm
          recommender={recommender}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type RecommenderFormProps = { recommender?: Recommender; onDone: () => void };

function RecommenderForm({ recommender, onDone }: RecommenderFormProps) {
  const apiUtils = api.useUtils();
  const [values, setValues] = useState<FormValues>({
    name: recommender?.name ?? "",
    email: recommender?.email ?? "",
    title: recommender?.title ?? "",
    organization: recommender?.organization ?? "",
    relationship: recommender?.relationship ?? "",
    notes: recommender?.notes ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = (field: FieldName, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  /** A recommender's name also appears on application pages. */
  async function handleSaved(saved: Recommender, message: string) {
    await Promise.all([
      apiUtils.recommenders.list.invalidate(),
      apiUtils.recommenders.byId.invalidate({ id: saved.id }),
      apiUtils.applications.byId.invalidate(),
      apiUtils.dashboard.summary.invalidate(),
    ]);
    toast.success(message);
    onDone();
  }

  function handleFailed(
    serverFieldErrors?: Record<string, string[] | undefined>,
  ) {
    if (serverFieldErrors && Object.keys(serverFieldErrors).length > 0) {
      setErrors(firstMessages(serverFieldErrors));
    } else {
      toast.error("Could not save the recommender. Try again.");
    }
  }

  const createRecommender = api.recommenders.create.useMutation({
    onSuccess: (saved) => handleSaved(saved, "Recommender added"),
    onError: (error) => handleFailed(error.data?.zodError?.fieldErrors),
  });
  const updateRecommender = api.recommenders.update.useMutation({
    onSuccess: (saved) => handleSaved(saved, "Recommender saved"),
    onError: (error) => handleFailed(error.data?.zodError?.fieldErrors),
  });
  const isSaving = createRecommender.isPending || updateRecommender.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = DraftRecommender.safeParse(values);
    if (!parsed.success) {
      setErrors(firstMessages(parsed.error.flatten().fieldErrors));
      return;
    }

    setErrors({});
    if (recommender) {
      // Every field is sent, so a field the user emptied is cleared (null).
      updateRecommender.mutate({ id: recommender.id, ...parsed.data });
    } else {
      createRecommender.mutate(parsed.data);
    }
  }

  /** A plain text input bound to one field of the form. */
  const textInput = (
    field: FieldName,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <Input
      id={`recommender-${field}`}
      value={values[field]}
      onChange={(event) => set(field, event.target.value)}
      {...fieldAria(`recommender-${field}`, errors[field])}
      {...props}
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="recommender-name" label="Name" error={errors.name}>
          {textInput("name", {
            placeholder: "Prof. Jordan Rivera",
            autoComplete: "off",
          })}
        </FormField>
        <FormField id="recommender-email" label="Email" error={errors.email}>
          {textInput("email", {
            type: "email",
            placeholder: "rivera@example.edu",
            autoComplete: "off",
          })}
        </FormField>
        <FormField id="recommender-title" label="Title" error={errors.title}>
          {textInput("title", { placeholder: "Associate Professor" })}
        </FormField>
        <FormField
          id="recommender-organization"
          label="Organization"
          error={errors.organization}
        >
          {textInput("organization", { placeholder: "UNC Computer Science" })}
        </FormField>
      </div>

      <FormField
        id="recommender-relationship"
        label="How you know them"
        error={errors.relationship}
      >
        {textInput("relationship", {
          placeholder: "Research advisor, 2 years",
        })}
      </FormField>

      <FormField id="recommender-notes" label="Notes" error={errors.notes}>
        <Textarea
          id="recommender-notes"
          rows={3}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="Prefers four weeks of notice"
          {...fieldAria("recommender-notes", errors.notes)}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2Icon className="animate-spin" aria-hidden />}
          {recommender ? "Save changes" : "Add recommender"}
        </Button>
      </DialogFooter>
    </form>
  );
}
