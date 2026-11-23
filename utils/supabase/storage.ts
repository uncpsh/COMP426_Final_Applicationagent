/**
 * Helpers for the files of document versions, which live in the private
 * `documents` bucket of Supabase Storage.
 *
 * Uploading is done by the browser, with the signed-in user's session: the
 * file goes straight to Storage and never passes through our server. The
 * bucket's policies only let a user write inside the folder named after
 * their own id, which is why every path starts with `{userId}/`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_DOCUMENT_SIZE_BYTES } from "@/server/models/inputs";

export const DOCUMENTS_BUCKET = "documents";

const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** The value of the file input's `accept` attribute. */
export const DOCUMENT_ACCEPT = `.pdf,.docx,${PDF},${DOCX}`;

/**
 * The content type to upload a file with, or `null` if it is neither a PDF
 * nor a DOCX. The file extension decides, because browsers do not always
 * report a type for `.docx` files.
 */
function documentContentType(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return PDF;
  if (name.endsWith(".docx")) return DOCX;
  return null;
}

/**
 * Checks a file before uploading, so the user gets a clear message instead
 * of a rejected upload. The bucket enforces the same limits again.
 */
export function documentFileError(file: File): string | null {
  if (!documentContentType(file)) return "Choose a PDF or DOCX file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "This file is larger than 10 MB.";
  }
  if (file.name.length > 255) return "The file name is too long.";
  return null;
}

/**
 * Builds `{userId}/{documentId}/{randomUUID}-{fileName}`. The random part
 * keeps two uploads of "resume.pdf" from overwriting each other. Characters
 * that Storage does not accept in a path are replaced; the original file
 * name is stored separately, in the `document_versions` row.
 */
function documentStoragePath(
  userId: string,
  documentId: string,
  fileName: string,
) {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  return `${userId}/${documentId}/${crypto.randomUUID()}-${safeName}`;
}

type DocumentUpload = { userId: string; documentId: string; file: File };

/**
 * Uploads a file to the `documents` bucket and returns its path. This is
 * step one of adding a version; step two is `documents.addVersion`, which
 * records the path in the database.
 */
export async function uploadDocumentFile(
  supabase: SupabaseClient,
  { userId, documentId, file }: DocumentUpload,
) {
  const storagePath = documentStoragePath(userId, documentId, file.name);

  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: documentContentType(file) ?? undefined,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return storagePath;
}

/**
 * Deletes an uploaded file again. Used when step two (`documents.addVersion`)
 * fails, so that no file is left behind without a database row.
 */
export async function removeDocumentFile(
  supabase: SupabaseClient,
  storagePath: string,
) {
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
}

/** 1536 -> "1.5 KB", 2411724 -> "2.3 MB". */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
