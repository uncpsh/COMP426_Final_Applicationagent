/**
 * The "Documents" section of the application page: attach a version of a
 * document, download it, or detach it.
 *
 * The attached versions come from `applications.byId` (passed in as a prop);
 * every change goes through the `applicationDocuments` router and then
 * reloads it.
 */

"use client";

import { Download, Loader2Icon, Plus, Unlink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AttachDocumentDialog } from "@/components/documents/attach-document-dialog";
import {
  useDownloadVersion,
  useInvalidateAttachment,
} from "@/components/documents/use-document-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DOC_TYPE_LABELS } from "@/utils/labels";
import { api, type RouterOutputs } from "@/utils/trpc/api";

type Application = RouterOutputs["applications"]["byId"];
type AttachedVersion = Application["documents"][number];

type DocumentsSectionProps = { application: Application };

export function DocumentsSection({ application }: DocumentsSectionProps) {
  const [isAttaching, setIsAttaching] = useState(false);
  const { documents } = application;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="grid gap-1.5">
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            The exact version of each essay or resume sent with this
            application.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setIsAttaching(true)}
        >
          <Plus aria-hidden /> Attach
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No documents attached yet. Attach the version of each document you
            send, so you always know what went where.
          </p>
        ) : (
          <ul className="grid gap-2">
            {documents.map((attached) => (
              <AttachedVersionItem
                key={attached.versionId}
                applicationId={application.id}
                attached={attached}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <AttachDocumentDialog
        open={isAttaching}
        onOpenChange={setIsAttaching}
        application={application}
        attached={documents.map((attached) => ({
          documentId: attached.document.id,
          versionId: attached.versionId,
          versionNumber: attached.versionNumber,
        }))}
      />
    </Card>
  );
}

function AttachedVersionItem({
  applicationId,
  attached,
}: {
  applicationId: string;
  attached: AttachedVersion;
}) {
  const invalidateAttachment = useInvalidateAttachment();
  const { download, downloadingId } = useDownloadVersion();
  const isDownloading = downloadingId === attached.versionId;
  const name = `${attached.document.title}, version ${attached.versionNumber}`;

  // Detaching only removes the link; the document and its file are kept,
  // and it can be attached again, so there is no confirmation step.
  const detach = api.applicationDocuments.detach.useMutation({
    onSuccess: async () => {
      await invalidateAttachment(applicationId, attached.document.id);
      toast.success("Document detached");
    },
    onError: () => {
      toast.error("Could not detach the document. Try again.");
    },
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0 flex-1 basis-40">
        <Link
          href={`/documents/${attached.document.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {attached.document.title}
        </Link>
        <p className="text-muted-foreground text-xs break-all">
          {DOC_TYPE_LABELS[attached.document.type]} · {attached.fileName}
        </p>
      </div>

      <Badge variant="secondary">Version {attached.versionNumber}</Badge>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Download ${name}`}
          disabled={isDownloading}
          onClick={() => void download(attached.versionId)}
        >
          {isDownloading ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : (
            <Download aria-hidden />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Detach ${name}`}
          disabled={detach.isPending}
          onClick={() =>
            detach.mutate({
              applicationId,
              documentVersionId: attached.versionId,
            })
          }
        >
          {detach.isPending ? (
            <Loader2Icon className="animate-spin" aria-hidden />
          ) : (
            <Unlink aria-hidden />
          )}
        </Button>
      </div>
    </li>
  );
}
