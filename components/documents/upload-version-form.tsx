/**
 * The form that adds a new version to a document.
 *
 * Adding a version takes two steps:
 *   1. the browser uploads the file straight to Supabase Storage, using the
 *      signed-in user's session (the file never passes through our server);
 *   2. `documents.addVersion` records the file's path in the database and
 *      assigns the version number.
 * If step 2 fails after step 1 worked, the uploaded file is deleted again,
 * so Storage never holds a file that no version points to.
 */

"use client";

import { Loader2Icon, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { FormField, fieldAria } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseComponentClient } from "@/utils/supabase/clients/component";
import {
  DOCUMENT_ACCEPT,
  documentFileError,
  removeDocumentFile,
  uploadDocumentFile,
} from "@/utils/supabase/storage";
import { api } from "@/utils/trpc/api";

type UploadVersionFormProps = {
  /** The signed-in user's id: the first part of the file's path in Storage. */
  userId: string;
  documentId: string;
};

export function UploadVersionForm({
  userId,
  documentId,
}: UploadVersionFormProps) {
  const apiUtils = api.useUtils();
  const fileInput = useRef<HTMLInputElement>(null);
  const [changeNote, setChangeNote] = useState("");
  const [fileError, setFileError] = useState<string>();
  const [isUploading, setIsUploading] = useState(false);

  const addVersion = api.documents.addVersion.useMutation();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInput.current?.files?.[0];
    const error = file ? documentFileError(file) : "Choose a file to upload.";
    if (!file || error) {
      setFileError(error ?? undefined);
      return;
    }

    setFileError(undefined);
    setIsUploading(true);
    const supabase = createSupabaseComponentClient();

    try {
      // Step 1: browser -> Storage.
      const storagePath = await uploadDocumentFile(supabase, {
        userId,
        documentId,
        file,
      });

      // Step 2: record the version. If this fails, undo step 1.
      const version = await addVersion
        .mutateAsync({
          documentId,
          storagePath,
          fileName: file.name,
          fileSizeBytes: file.size,
          changeNote,
        })
        .catch(async (failure: unknown) => {
          await removeDocumentFile(supabase, storagePath);
          throw failure;
        });

      toast.success(`Version ${version.versionNumber} uploaded`);
      setChangeNote("");
      if (fileInput.current) fileInput.current.value = "";
      await Promise.all([
        apiUtils.documents.byId.invalidate({ id: documentId }),
        apiUtils.documents.list.invalidate(),
        // Application pages show "latest version" of attached documents.
        apiUtils.applications.byId.invalidate(),
      ]);
    } catch {
      toast.error("Could not upload the file. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  const fileHint = "PDF or DOCX, up to 10 MB.";

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField
        id="version-file"
        label="File"
        hint={fileHint}
        error={fileError}
      >
        <Input
          id="version-file"
          ref={fileInput}
          type="file"
          accept={DOCUMENT_ACCEPT}
          onChange={() => setFileError(undefined)}
          className="cursor-pointer"
          {...fieldAria("version-file", fileError, fileHint)}
        />
      </FormField>

      <FormField id="version-note" label="What changed?">
        <Input
          id="version-note"
          value={changeNote}
          onChange={(event) => setChangeNote(event.target.value)}
          maxLength={500}
          placeholder="Shortened intro, added research section"
        />
      </FormField>

      <Button
        type="submit"
        disabled={isUploading}
        className="justify-self-start"
      >
        {isUploading ? (
          <Loader2Icon className="animate-spin" aria-hidden />
        ) : (
          <Upload aria-hidden />
        )}
        Upload new version
      </Button>
    </form>
  );
}
