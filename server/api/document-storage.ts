/**
 * Server-side access to the files in the private `documents` bucket.
 *
 * These functions use the Supabase client that carries the signed-in user's
 * session (read from the request's cookies), not a privileged key. So the
 * bucket's own policies apply as a second check on top of the ownership
 * checks in the tRPC procedures: a user can only sign links for, and delete,
 * files inside their own folder.
 */

import { TRPCError } from "@trpc/server";

import { createSupabaseServerClient } from "@/utils/supabase/clients/server";
import { DOCUMENTS_BUCKET } from "@/utils/supabase/storage";

/** How long a download link works. Long enough to click, too short to share. */
export const DOWNLOAD_URL_SECONDS = 60;

/**
 * Creates a short-lived signed URL for one file. `fileName` becomes the name
 * of the downloaded file, so the user gets "sop.pdf" back rather than the
 * random name the file has in Storage.
 */
export async function createDownloadUrl(storagePath: string, fileName: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, DOWNLOAD_URL_SECONDS, { download: fileName });

  if (error || !data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not create a download link for this file.",
    });
  }
  return data.signedUrl;
}

/**
 * Deletes files from the bucket. Returns `false` instead of throwing when
 * Storage refuses, because the caller has already deleted the database rows
 * and must not report that as a failure.
 */
export async function removeFiles(storagePaths: string[]) {
  if (storagePaths.length === 0) return true;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove(storagePaths);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Could not delete files from Storage:", storagePaths, error);
    return false;
  }
}
