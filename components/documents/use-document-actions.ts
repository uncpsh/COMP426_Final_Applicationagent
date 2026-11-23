/**
 * Small hooks shared by the pages that show document versions.
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api } from "@/utils/trpc/api";

/**
 * Downloads one version. The server answers with a signed URL that works
 * for one minute, so a fresh one is requested on every click.
 */
export function useDownloadVersion() {
  const apiUtils = api.useUtils();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function download(versionId: string) {
    setDownloadingId(versionId);
    try {
      const { url } = await apiUtils.documents.downloadUrl.fetch(
        { versionId },
        { staleTime: 0 },
      );
      // Storage sends the file as an attachment, so the browser saves it
      // and the page stays where it is.
      window.location.assign(url);
    } catch {
      toast.error("Could not download the file. Try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  return { download, downloadingId };
}

/**
 * Marks every query that shows an attachment (or counts it) as out of
 * date: the application's page and list, and the document's page and list.
 */
export function useInvalidateAttachment() {
  const apiUtils = api.useUtils();

  return (applicationId: string, documentId: string) =>
    Promise.all([
      apiUtils.applications.byId.invalidate({ id: applicationId }),
      apiUtils.applications.list.invalidate(),
      apiUtils.documents.byId.invalidate({ id: documentId }),
      apiUtils.documents.list.invalidate(),
    ]);
}
