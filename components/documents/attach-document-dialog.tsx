/**
 * The dialog that attaches one version of a document to an application,
 * which creates a row in the applications <-> document_versions join.
 *
 * First the user picks a document (from `documents.list`), then one of its
 * versions (from `documents.byId`); the latest version is preselected.
 */

"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useInvalidateAttachment } from "@/components/documents/use-document-actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/utils/deadlines";
import { DOC_TYPE_LABELS } from "@/utils/labels";
import { api } from "@/utils/trpc/api";

/** A version that is attached to the application right now. */
type Attached = {
  documentId: string;
  versionId: string;
  versionNumber: number;
};

type AttachDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: { id: string; organization: string };
  attached: Attached[];
};

export function AttachDocumentDialog({
  open,
  onOpenChange,
  application,
  attached,
}: AttachDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach a document</DialogTitle>
          <DialogDescription>
            Record which version you are sending to {application.organization}.
          </DialogDescription>
        </DialogHeader>
        {/* The form mounts with the dialog, so its state starts fresh each time. */}
        <AttachDocumentForm
          applicationId={application.id}
          attached={attached}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type AttachDocumentFormProps = {
  applicationId: string;
  attached: Attached[];
  onDone: () => void;
};

function AttachDocumentForm({
  applicationId,
  attached,
  onDone,
}: AttachDocumentFormProps) {
  const invalidateAttachment = useInvalidateAttachment();
  const [documentId, setDocumentId] = useState("");
  // Empty means "the latest version", which is what most people want.
  const [chosenVersionId, setChosenVersionId] = useState("");
  const [documentError, setDocumentError] = useState<string>();

  const documents = api.documents.list.useQuery();
  // Loads the chosen document's versions; idle until a document is chosen.
  const document = api.documents.byId.useQuery(
    { id: documentId },
    { enabled: documentId !== "" },
  );

  const attach = api.applicationDocuments.attach.useMutation({
    onSuccess: async () => {
      await invalidateAttachment(applicationId, documentId);
      toast.success("Document attached");
      onDone();
    },
    onError: () => {
      toast.error("Could not attach the document. Try again.");
    },
  });

  if (documents.isPending) return <Skeleton className="h-32 w-full" />;
  if (documents.isError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        Could not load your documents. Close this dialog and try again.
      </p>
    );
  }

  // Only a document that has a file can be attached.
  const attachable = documents.data.filter(
    (candidate) => candidate.versionCount > 0,
  );
  if (attachable.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          {documents.data.length === 0
            ? "You have not created any documents yet. Create one and upload a file, then attach it here."
            : "None of your documents has a file yet. Upload a version first, then attach it here."}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Close
          </Button>
          <Button asChild>
            <Link href="/documents">Go to documents</Link>
          </Button>
        </DialogFooter>
      </div>
    );
  }

  const versions = document.data?.versions ?? [];
  const versionId = chosenVersionId || versions[0]?.id || "";
  const current = attached.find((entry) => entry.documentId === documentId);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentId) {
      setDocumentError("Choose a document.");
      return;
    }
    if (!versionId) return; // The versions are still loading.

    attach.mutate({ applicationId, documentVersionId: versionId });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField id="attach-document" label="Document" error={documentError}>
        <Select
          value={documentId}
          onValueChange={(value) => {
            setDocumentId(value);
            setChosenVersionId("");
            setDocumentError(undefined);
          }}
        >
          <SelectTrigger
            id="attach-document"
            {...fieldAria("attach-document", documentError)}
          >
            <SelectValue placeholder="Choose a document" />
          </SelectTrigger>
          <SelectContent>
            {attachable.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.title} ({DOC_TYPE_LABELS[option.type]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {documentId !== "" && (
        <FormField
          id="attach-version"
          label="Version"
          hint={
            current
              ? current.versionId === versionId
                ? `Version ${current.versionNumber} is already attached.`
                : `Replaces version ${current.versionNumber}, which is attached now. An application holds one version of each document.`
              : undefined
          }
        >
          {document.isPending ? (
            <Skeleton className="h-9 w-full" />
          ) : document.isError ? (
            <p role="alert" className="text-destructive text-sm">
              Could not load this document&apos;s versions.
            </p>
          ) : (
            <Select value={versionId} onValueChange={setChosenVersionId}>
              <SelectTrigger id="attach-version">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version, index) => (
                  <SelectItem key={version.id} value={version.id}>
                    Version {version.versionNumber}
                    {index === 0 ? " (latest)" : ""} ·{" "}
                    {formatDateTime(version.createdAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={attach.isPending || current?.versionId === versionId}
        >
          {attach.isPending && (
            <Loader2Icon className="animate-spin" aria-hidden />
          )}
          Attach
        </Button>
      </DialogFooter>
    </form>
  );
}
