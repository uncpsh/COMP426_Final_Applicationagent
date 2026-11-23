/**
 * The dialog for creating a document or renaming / re-typing one.
 * A document is only a title and a type; its files are its versions.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_TYPES, DocType } from "@/server/models/enums";
import { DraftDocument } from "@/server/models/inputs";
import { DOC_TYPE_LABELS } from "@/utils/labels";
import { api, type RouterOutputs } from "@/utils/trpc/api";

type Doc = RouterOutputs["documents"]["create"];

type DocumentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a document to edit it; leave out to create a new one. */
  document?: Pick<Doc, "id" | "title" | "type">;
  /** Called with a newly created document, e.g. to open its page. */
  onCreated?: (document: Doc) => void;
};

export function DocumentFormDialog({
  open,
  onOpenChange,
  document,
  onCreated,
}: DocumentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {document ? "Edit document" : "New document"}
          </DialogTitle>
          <DialogDescription>
            {document
              ? "Rename the document or change its type. Its versions are kept."
              : "Name the document, for example “SOP – ML focus”. You upload its first file on the next page."}
          </DialogDescription>
        </DialogHeader>
        {/* The form mounts with the dialog, so its state starts fresh each time. */}
        <DocumentForm
          document={document}
          onCreated={onCreated}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type DocumentFormProps = Pick<
  DocumentFormDialogProps,
  "document" | "onCreated"
> & { onDone: () => void };

function DocumentForm({ document, onCreated, onDone }: DocumentFormProps) {
  const apiUtils = api.useUtils();
  const [title, setTitle] = useState(document?.title ?? "");
  const [type, setType] = useState<DocType>(document?.type ?? "sop");
  const [titleError, setTitleError] = useState<string>();

  /** The title and type also appear on the pages of applications. */
  async function handleSaved(saved: Doc, message: string) {
    await Promise.all([
      apiUtils.documents.list.invalidate(),
      apiUtils.documents.byId.invalidate({ id: saved.id }),
      apiUtils.applications.byId.invalidate(),
    ]);
    toast.success(message);
    onDone();
  }

  function handleFailed(serverTitleError?: string) {
    if (serverTitleError) setTitleError(serverTitleError);
    else toast.error("Could not save the document. Try again.");
  }

  const createDocument = api.documents.create.useMutation({
    onSuccess: async (saved) => {
      await handleSaved(saved, "Document created");
      onCreated?.(saved);
    },
    onError: (error) =>
      handleFailed(error.data?.zodError?.fieldErrors.title?.[0]),
  });
  const updateDocument = api.documents.update.useMutation({
    onSuccess: (saved) => handleSaved(saved, "Document saved"),
    onError: (error) =>
      handleFailed(error.data?.zodError?.fieldErrors.title?.[0]),
  });
  const isSaving = createDocument.isPending || updateDocument.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = DraftDocument.safeParse({ title, type });
    if (!parsed.success) {
      setTitleError(parsed.error.flatten().fieldErrors.title?.[0]);
      return;
    }

    setTitleError(undefined);
    if (document) updateDocument.mutate({ id: document.id, ...parsed.data });
    else createDocument.mutate(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField id="document-title" label="Title" error={titleError}>
        <Input
          id="document-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="SOP – ML focus"
          {...fieldAria("document-title", titleError)}
        />
      </FormField>

      <FormField id="document-type" label="Type">
        <Select
          value={type}
          onValueChange={(value) => {
            const parsed = DocType.safeParse(value);
            if (parsed.success) setType(parsed.data);
          }}
        >
          <SelectTrigger id="document-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {DOC_TYPE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2Icon className="animate-spin" aria-hidden />}
          {document ? "Save changes" : "Create document"}
        </Button>
      </DialogFooter>
    </form>
  );
}
