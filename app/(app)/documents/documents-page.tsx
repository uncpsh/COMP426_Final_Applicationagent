/**
 * The documents list: one card per document with how many versions it has,
 * when the latest one was uploaded and how many applications use it.
 *
 * This is a Client Component. Everything comes from one tRPC query,
 * `documents.list`; the type filter is part of the query's input.
 */

"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { FileText, Plus, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DocumentFormDialog } from "@/components/documents/document-form-dialog";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_TYPES, DocType } from "@/server/models/enums";
import { cn } from "@/utils/cn";
import { formatRelative } from "@/utils/deadlines";
import { DOC_TYPE_LABELS } from "@/utils/labels";
import { api, type RouterOutputs } from "@/utils/trpc/api";

type DocSummary = RouterOutputs["documents"]["list"][number];

const ALL_TYPES = "all";

export default function DocumentsPage() {
  const router = useRouter();
  const [type, setType] = useState<DocType | typeof ALL_TYPES>(ALL_TYPES);
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: documents,
    isPending,
    isError,
    isPlaceholderData,
    refetch,
  } = api.documents.list.useQuery(
    { type: type === ALL_TYPES ? undefined : type },
    // Keep showing the previous cards (dimmed) while a new filter loads.
    { placeholderData: keepPreviousData },
  );

  return (
    <>
      <PageHeader
        title="Documents"
        description="Essays and resumes, with every version you have uploaded."
      >
        <Button onClick={() => setIsCreating(true)}>
          <Plus aria-hidden /> New document
        </Button>
      </PageHeader>

      <div className="mb-4">
        <Select
          value={type}
          onValueChange={(value) => {
            const parsed = DocType.safeParse(value);
            setType(parsed.success ? parsed.data : ALL_TYPES);
          }}
        >
          <SelectTrigger aria-label="Filter by type" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>All types</SelectItem>
            {DOCUMENT_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {DOC_TYPE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading documents"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Could not load your documents"
          onRetry={() => void refetch()}
        />
      ) : documents.length === 0 ? (
        type === ALL_TYPES ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Create a document for each essay or resume. Every file you upload becomes a new version, and applications remember which version you sent."
          >
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus aria-hidden /> New document
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={SearchX}
            title="No documents of this type"
            description={`You have no document with the type “${DOC_TYPE_LABELS[type]}”.`}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setType(ALL_TYPES)}
            >
              Show all types
            </Button>
          </EmptyState>
        )
      ) : (
        <ul
          className={cn(
            "grid gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
            isPlaceholderData && "opacity-60",
          )}
        >
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </ul>
      )}

      <DocumentFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        // Go straight to the new document's page, where its first file is uploaded.
        onCreated={(document) => router.push(`/documents/${document.id}`)}
      />
    </>
  );
}

function DocumentCard({ document }: { document: DocSummary }) {
  const { latestVersion, versionCount, applicationCount } = document;

  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/documents/${document.id}`}
          className="min-w-0 font-medium wrap-anywhere underline-offset-4 hover:underline"
        >
          {document.title}
        </Link>
        <Badge variant="outline" className="shrink-0">
          {DOC_TYPE_LABELS[document.type]}
        </Badge>
      </div>

      {latestVersion ? (
        <p className="text-sm">
          Version {latestVersion.versionNumber}
          <span className="text-muted-foreground">
            {" "}
            · uploaded {formatRelative(latestVersion.createdAt)}
            {versionCount > 1 && ` · ${versionCount} versions`}
          </span>
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">No file uploaded yet</p>
      )}

      <p className="text-muted-foreground mt-auto border-t pt-3 text-xs">
        {applicationCount === 0
          ? "Not attached to any application"
          : `Attached to ${applicationCount} ${applicationCount === 1 ? "application" : "applications"}`}
      </p>
    </li>
  );
}
