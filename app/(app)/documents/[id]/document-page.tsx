/**
 * The page of one document: upload a new version, and the version history
 * with a download link and the applications that use each version.
 *
 * This is a Client Component. Everything it shows comes from one tRPC query,
 * `documents.byId`.
 */

"use client";

import {
  ArrowLeft,
  Download,
  Loader2Icon,
  Pencil,
  SearchX,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/applications/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { UploadVersionForm } from "@/components/documents/upload-version-form";
import { useDownloadVersion } from "@/components/documents/use-document-actions";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Subject } from "@/server/models/auth";
import { formatDateTime } from "@/utils/deadlines";
import { DOC_TYPE_LABELS } from "@/utils/labels";
import { formatFileSize } from "@/utils/supabase/storage";
import { api, type RouterOutputs } from "@/utils/trpc/api";

type Version = RouterOutputs["documents"]["byId"]["versions"][number];

// The id in the URL is wrong or belongs to someone else. Asking again
// cannot change that, so these errors are not retried.
const MISSING_CODES = ["NOT_FOUND", "BAD_REQUEST"];

type DocumentPageProps = { user: Subject; documentId: string };

export default function DocumentPage({ user, documentId }: DocumentPageProps) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: document,
    isPending,
    error,
    refetch,
  } = api.documents.byId.useQuery(
    { id: documentId },
    {
      retry: (failureCount, failure) =>
        !MISSING_CODES.includes(failure.data?.code ?? "") && failureCount < 2,
    },
  );

  const deleteDocument = api.documents.delete.useMutation({
    onSuccess: async () => {
      // Its attachments went with it (cascade), so application pages and
      // counts are out of date as well.
      await Promise.all([
        apiUtils.documents.list.invalidate(),
        apiUtils.applications.invalidate(),
      ]);
      toast.success("Document deleted");
      router.push("/documents");
    },
    onError: () => {
      toast.error("Could not delete the document. Try again.");
    },
  });

  if (isPending) {
    return (
      <div
        className="grid gap-4"
        aria-busy="true"
        aria-label="Loading document"
      >
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <BackLink />
        {MISSING_CODES.includes(error.data?.code ?? "") ? (
          <EmptyState
            icon={SearchX}
            title="Document not found"
            description="It may have been deleted, or the link is wrong."
          >
            <Button asChild variant="outline" size="sm">
              <Link href="/documents">Back to documents</Link>
            </Button>
          </EmptyState>
        ) : (
          <ErrorState
            title="Could not load this document"
            onRetry={() => void refetch()}
          />
        )}
      </>
    );
  }

  const { versions } = document;
  const applicationIds = new Set(
    versions.flatMap((version) =>
      version.applications.map((application) => application.id),
    ),
  );

  return (
    <>
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">
            {document.title}
          </h1>
          <div className="mt-3">
            <Badge variant="outline">{DOC_TYPE_LABELS[document.type]}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil aria-hidden /> Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setIsDeleting(true)}
          >
            <Trash2 aria-hidden /> Delete
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upload a new version</CardTitle>
            <CardDescription>
              {versions.length === 0
                ? "The first file becomes version 1."
                : `The next file becomes version ${versions[0]!.versionNumber + 1}. Earlier versions are kept.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadVersionForm userId={user.id} documentId={document.id} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Version history</CardTitle>
            <CardDescription>
              Every file you have uploaded, newest first, and the applications
              each one was sent with.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {versions.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                No versions yet. Upload a PDF or DOCX file to create version 1.
              </p>
            ) : (
              <ol className="grid gap-2">
                {versions.map((version, index) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    isLatest={index === 0}
                  />
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <DocumentFormDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        document={document}
      />
      <ConfirmDialog
        open={isDeleting}
        onOpenChange={setIsDeleting}
        title="Delete this document?"
        description={deleteWarning(
          document.title,
          versions.length,
          applicationIds.size,
        )}
        confirmLabel="Delete"
        isPending={deleteDocument.isPending}
        onConfirm={() => deleteDocument.mutate({ id: document.id })}
      />
    </>
  );
}

/** Spells out what goes away with the document. */
function deleteWarning(title: string, versions: number, applications: number) {
  const files =
    versions === 0
      ? ""
      : ` together with ${versions === 1 ? "its 1 version and its file" : `its ${versions} versions and their files`}`;
  const attachments =
    applications === 0
      ? ""
      : ` It will be detached from ${applications === 1 ? "1 application" : `${applications} applications`}.`;
  return `“${title}” will be deleted${files}.${attachments} This cannot be undone.`;
}

function VersionItem({
  version,
  isLatest,
}: {
  version: Version;
  isLatest: boolean;
}) {
  const { download, downloadingId } = useDownloadVersion();
  const isDownloading = downloadingId === version.id;

  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            Version {version.versionNumber}
            {isLatest && <Badge variant="secondary">Latest</Badge>}
          </p>
          <p className="text-muted-foreground text-xs break-all">
            {version.fileName}
            {version.fileSizeBytes != null &&
              ` · ${formatFileSize(version.fileSizeBytes)}`}
          </p>
          <p className="text-muted-foreground text-xs">
            Uploaded{" "}
            <time dateTime={version.createdAt.toISOString()}>
              {formatDateTime(version.createdAt)}
            </time>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isDownloading}
          onClick={() => void download(version.id)}
        >
          {isDownloading ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
          Download
          <span className="sr-only"> version {version.versionNumber}</span>
        </Button>
      </div>

      {version.changeNote && (
        <p className="mt-2 break-words">{version.changeNote}</p>
      )}

      <div className="mt-2 border-t pt-2 text-xs">
        {version.applications.length === 0 ? (
          <span className="text-muted-foreground">
            Not attached to any application
          </span>
        ) : (
          <>
            <p className="text-muted-foreground mb-1">Sent with</p>
            <ul className="flex flex-col gap-1">
              {version.applications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center gap-2"
                >
                  <Link
                    href={`/applications/${application.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {application.organization}
                  </Link>
                  <span className="text-muted-foreground">
                    {application.position}
                  </span>
                  <StatusBadge status={application.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  );
}

function BackLink() {
  return (
    <Link
      href="/documents"
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Documents
    </Link>
  );
}
